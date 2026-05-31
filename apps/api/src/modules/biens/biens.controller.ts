import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { prisma } from '../../lib/prisma'
import { BienFormulaireSchema, UpdateBienSchema } from './biens.schema'
import { NotFoundError } from '../../lib/errors'
import { sanitizeTextForLLM, isSuspiciousInput } from '../../lib/sanitize'
import { auditLog } from '../../lib/audit'
import * as biensService from './biens.service'
import * as subscriptionService from '../subscription/subscription.service'
import { scrapeAnnonce } from '../../services/scraping.service'

// In-memory free analysis tracker for unauthenticated users (MVP — resets on restart)
const freeAnalysisCache = new Map<string, true>()

function getFreeAnalysisKey(req: Request): string {
  const deviceId = req.headers['x-device-id'] as string | undefined
  const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown'
  const resolvedDeviceId = Array.isArray(deviceId) ? deviceId[0] : deviceId
  return `free_analysis:${resolvedDeviceId ?? ip}`
}

export async function analyser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let isSubscribed = false

    if (req.user) {
      const sub = await subscriptionService.getSubscriptionStatus(req.user.id)
      isSubscribed = sub.isActive

      if (!isSubscribed) {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } })
        if (user?.freeAnalysisUsed) {
          auditLog('FREE_ANALYSIS_USED', { userId: req.user.id, ip: req.ip }).catch(() => {})
          res.status(403).json({
            error: { code: 'FREE_ANALYSIS_USED', message: 'Votre analyse gratuite a été utilisée. Abonnez-vous pour continuer.' },
          })
          return
        }
      }
    } else {
      const key = getFreeAnalysisKey(req)
      if (freeAnalysisCache.has(key)) {
        auditLog('FREE_ANALYSIS_USED', { ip: req.ip }).catch(() => {})
        res.status(403).json({
          error: { code: 'FREE_ANALYSIS_USED', message: 'Votre analyse gratuite a été utilisée. Créez un compte pour continuer.' },
        })
        return
      }
    }

    const rawInput = BienFormulaireSchema.parse(req.body)

    // Sanitize and check text fields sent to the LLM
    const textFields: Array<[string, string]> = [
      ['ville', rawInput.ville],
      ...(rawInput.adresse ? [['adresse', rawInput.adresse] as [string, string]] : []),
    ]
    for (const [field, value] of textFields) {
      if (isSuspiciousInput(value)) {
        auditLog('SUSPICIOUS_INPUT', {
          userId: req.user?.id,
          ip: req.ip,
          metadata: { field, value: value.slice(0, 50) },
        }).catch(() => {})
      }
    }

    const input = {
      ...rawInput,
      ville: sanitizeTextForLLM(rawInput.ville, 100),
      adresse: rawInput.adresse ? sanitizeTextForLLM(rawInput.adresse, 200) : undefined,
    }

    auditLog('ANALYSE_STARTED', {
      userId: req.user?.id,
      ip: req.ip,
      metadata: { ville: input.ville, prix: input.prix },
    }).catch(() => {})

    const result = await biensService.analyserBien(input, req.user?.id)

    // Mark free analysis used after success
    if (!req.user) {
      freeAnalysisCache.set(getFreeAnalysisKey(req), true)
    } else if (!isSubscribed) {
      prisma.user
        .update({ where: { id: req.user.id }, data: { freeAnalysisUsed: true } })
        .catch(() => {})
    }

    auditLog('ANALYSE_COMPLETED', {
      userId: req.user?.id,
      ip: req.ip,
      metadata: { bienId: result.bienId, scoreImmoSafe: result.scoreImmoSafe },
    }).catch(() => {})

    res.status(201).json(result)
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
      })
      return
    }
    auditLog('ANALYSE_FAILED', {
      userId: req.user?.id,
      ip: req.ip,
      metadata: { error: err instanceof Error ? err.message : String(err) },
    }).catch(() => {})
    next(err)
  }
}

export async function comparer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const idsRaw = req.query.ids as string | undefined
    if (!idsRaw) {
      res.status(400).json({ error: { code: 'INVALID_IDS', message: 'IDs requis' } })
      return
    }
    const ids = idsRaw.split(',').map((id) => id.trim()).filter(Boolean)
    if (ids.length < 2 || ids.length > 4) {
      res.status(400).json({ error: { code: 'INVALID_IDS', message: 'Entre 2 et 4 biens requis pour la comparaison' } })
      return
    }
    const biens = await prisma.bien.findMany({ where: { id: { in: ids }, userId: req.user!.id } })
    if (biens.length !== ids.length) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Un ou plusieurs biens introuvables' } })
      return
    }
    const ordered = ids.map((id) => biens.find((b) => b.id === id)!)
    res.json({ biens: ordered })
  } catch (err) {
    next(err)
  }
}

export async function getBien(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string
    const bien = await biensService.getBienById(id, req.user!.id)
    if (!bien) throw new NotFoundError('Bien introuvable')
    res.json(bien)
  } catch (err) {
    next(err)
  }
}

export async function listBiens(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const search = req.query.search ? String(req.query.search) : undefined
    const page = parseInt(String(req.query.page ?? '1'), 10)
    const limit = parseInt(String(req.query.limit ?? '12'), 10)
    const sort = req.query.sort ? String(req.query.sort) : 'score'
    const result = await biensService.getBiens(req.user!.id, { search, page, limit, sort })
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function getPriceChanges(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const changes = await prisma.priceCheck.findMany({
      where: { userId: req.user!.id, seen: false },
      include: {
        bien: {
          select: { id: true, titre: true, ville: true, surface: true, typeBien: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
    res.json({ changes })
  } catch (err) {
    next(err)
  }
}

export async function markPriceChangesSeen(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.priceCheck.updateMany({
      where: { userId: req.user!.id, seen: false },
      data: { seen: true },
    })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function relancerAnalyse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id)
    auditLog('ANALYSE_STARTED', {
      userId: req.user!.id,
      ip: req.ip,
      metadata: { bienId: id, action: 'relancer' },
    }).catch(() => {})

    const result = await biensService.relancerAnalyse(id, req.user!.id)

    auditLog('ANALYSE_RELANCEE', {
      userId: req.user!.id,
      ip: req.ip,
      metadata: { bienId: id, scoreImmoSafe: result.scoreImmoSafe },
    }).catch(() => {})

    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function deleteBien(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string
    const userId = req.user!.id

    const bien = await prisma.bien.findFirst({ where: { id, userId } })
    if (!bien) throw new NotFoundError('Bien introuvable')

    await prisma.bien.delete({ where: { id } })

    await auditLog('BIEN_SUPPRIME', {
      userId,
      ip: req.ip,
      metadata: { bienId: id, ville: bien.ville },
    })

    res.status(204).send()
  } catch (err) {
    next(err)
  }
}

const SCRAPING_ALLOWED = ['seloger.com', 'leboncoin.fr', 'pap.fr']

export async function scrape(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { url } = req.body as { url?: string }

    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: { code: 'INVALID_URL', message: 'URL requise' } })
      return
    }

    let urlObj: URL
    try {
      urlObj = new URL(url)
    } catch {
      res.status(400).json({ error: { code: 'INVALID_URL', message: "Format d'URL invalide" } })
      return
    }

    if (!SCRAPING_ALLOWED.some((d) => urlObj.hostname.includes(d))) {
      res.status(400).json({
        error: {
          code: 'UNSUPPORTED_SOURCE',
          message: "Seuls SeLoger, LeBonCoin et PAP sont supportés pour l'import automatique",
        },
      })
      return
    }

    const result = await scrapeAnnonce(url)

    auditLog('SCRAPING', {
      userId: req.user?.id,
      ip: req.ip,
      metadata: { source: result.source, success: result.success, partial: result.partial, url: url.slice(0, 100) },
    }).catch(() => {})

    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function patchBien(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string
    const data = UpdateBienSchema.parse(req.body)
    const result = await biensService.updateBien(id, req.user!.id, data)
    if (result.count === 0) throw new NotFoundError('Bien introuvable')
    res.json({ success: true })
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.errors[0]?.message } })
      return
    }
    next(err)
  }
}
