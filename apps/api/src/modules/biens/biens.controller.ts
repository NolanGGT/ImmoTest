import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { prisma } from '../../lib/prisma'
import { BienFormulaireSchema, UpdateBienSchema, VoteSchema } from './biens.schema'
import { NotFoundError } from '../../lib/errors'
import { sanitizeTextForLLM, isSuspiciousInput } from '../../lib/sanitize'
import { auditLog } from '../../lib/audit'
import * as biensService from './biens.service'
import { logger } from '../../lib/logger'
import * as subscriptionService from '../subscription/subscription.service'
import { scrapeAnnonce } from '../../services/scraping.service'
import { getScoreQuartier } from '../../services/quartier.service'

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

    // Check if user is a guest with active shared access
    const sharedAccess = await prisma.sharedAccess.findFirst({
      where: { guestId: req.user!.id, status: 'ACTIVE' },
      select: { ownerId: true, owner: { select: { email: true } } },
    })

    const targetUserId = sharedAccess ? sharedAccess.ownerId : req.user!.id
    const result = await biensService.getBiens(targetUserId, { search, page, limit, sort })

    logger.info({ snapshotPhotos: result.biens[0]?.snapshotPhotos }, '[BIENS] premier bien snapshotPhotos')

    res.json({
      ...result,
      meta: {
        isGuestView: !!sharedAccess,
        ownerEmail: sharedAccess?.owner.email ?? null,
      },
    })
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
  const id = req.params.id as string
  const userId = req.user!.id
  try {
    await biensService.deleteBien(id, userId)

    await auditLog('BIEN_SUPPRIME', {
      userId,
      ip: req.ip,
      metadata: { bienId: id },
    })

    res.status(204).send()
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack, id }, '[DELETE BIEN] erreur')
    res.status(400).json({ error: error.message })
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

    if (result.error === 'blocked') {
      res.status(422).json({
        error: {
          code: 'SCRAPING_BLOCKED',
          message: "Ce site bloque le scraping automatique. Utilisez l'extension Chrome pour analyser cette annonce.",
        },
      })
      return
    }

    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function quartier(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string
    const bien = await prisma.bien.findFirst({
      where: { id, userId: req.user!.id },
      select: { latitude: true, longitude: true },
    })
    if (!bien) throw new NotFoundError('Bien introuvable')
    if (!bien.latitude || !bien.longitude) {
      res.status(422).json({ error: { code: 'NO_COORDS', message: 'Coordonnées GPS requises pour le score de quartier' } })
      return
    }
    const score = await getScoreQuartier(bien.latitude, bien.longitude)
    res.json(score)
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

export async function voteOnBien(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string
    const { vote, comment } = VoteSchema.parse(req.body)

    const bienVote = await prisma.bienVote.upsert({
      where: { bienId_userId: { bienId: id, userId: req.user!.id } },
      update: { vote, comment: comment ?? null },
      create: { bienId: id, userId: req.user!.id, vote, comment: comment ?? null },
    })

    res.json(bienVote)
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.errors[0]?.message } })
      return
    }
    next(err)
  }
}

export async function getVotes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string
    const userId = req.user!.id

    const votes = await prisma.bienVote.findMany({
      where: { bienId: id },
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'asc' },
    })

    // Determine partner: the other user involved in the shared access for this bien
    const bienOwner = await prisma.bien.findFirst({ where: { id }, select: { userId: true } })
    let partner: { userId: string; email: string } | null = null

    if (bienOwner?.userId) {
      const ownerId = bienOwner.userId
      if (userId === ownerId) {
        // I'm the owner → partner is the guest (if any)
        const access = await prisma.sharedAccess.findFirst({
          where: { ownerId, status: 'ACTIVE' },
          include: { guest: { select: { id: true, email: true } } },
        })
        if (access?.guest) partner = { userId: access.guest.id, email: access.guest.email }
      } else {
        // I'm the guest → partner is the owner
        const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { id: true, email: true } })
        if (owner) partner = { userId: owner.id, email: owner.email }
      }
    }

    res.json({ votes, partner })
  } catch (err) {
    next(err)
  }
}
