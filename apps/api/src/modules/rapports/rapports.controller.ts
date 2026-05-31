import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { NotFoundError, AppError } from '../../lib/errors'
import { auditLog } from '../../lib/audit'
import { logger } from '../../lib/logger'
import * as subscriptionService from '../subscription/subscription.service'
import { generateRapportPDF, uploadRapportToStorage } from '../../services/pdf.service'
import type { AnalyseResult } from '@immosafe/shared-types'

const RAPPORT_MAX_AGE_MS = 60 * 60 * 1000

export async function genererRapport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id
    const bienId = req.params.bienId as string

    const sub = await subscriptionService.getSubscriptionStatus(userId)
    if (!sub.isActive) {
      res.status(403).json({
        error: { code: 'SUBSCRIPTION_REQUIRED', message: 'Un abonnement actif est requis pour generer un rapport PDF.' },
      })
      return
    }

    const bien = await prisma.bien.findUnique({
      where: { id: bienId },
      include: { rapport: true },
    })

    if (!bien || bien.userId !== userId) {
      throw new NotFoundError('Bien introuvable')
    }

    if (!bien.analyse) {
      res.status(422).json({
        error: { code: 'NO_ANALYSE', message: "Ce bien n'a pas encore d'analyse disponible." },
      })
      return
    }

    const bienWithRapport = bien as typeof bien & { rapport: { id: string; fileUrl: string; createdAt: Date } | null }

    if (bienWithRapport.rapport) {
      const age = Date.now() - new Date(bienWithRapport.rapport.createdAt).getTime()
      if (age < RAPPORT_MAX_AGE_MS) {
        res.json({ rapportId: bienWithRapport.rapport.id, fileUrl: bienWithRapport.rapport.fileUrl })
        return
      }
    }

    const analyse = bien.analyse as unknown as AnalyseResult

    let pdfBytes: Uint8Array
    try {
      pdfBytes = await generateRapportPDF(bien, analyse)
    } catch (err) {
      logger.error({ bienId, err }, 'Erreur generation PDF')
      throw new AppError(500, 'PDF_GENERATION_FAILED', 'Impossible de generer le rapport PDF.')
    }

    let fileUrl: string
    try {
      fileUrl = await uploadRapportToStorage(pdfBytes, bienId, userId)
    } catch (err) {
      logger.error({ bienId, err }, 'Erreur upload PDF')
      throw new AppError(500, 'PDF_UPLOAD_FAILED', "Impossible d'uploader le rapport PDF.")
    }

    const rapport = await prisma.rapport.upsert({
      where: { bienId },
      create: { bienId, fileUrl },
      update: { fileUrl, createdAt: new Date() },
    })

    auditLog('RAPPORT_GENERE', {
      userId,
      ip: req.ip,
      metadata: { bienId, rapportId: rapport.id },
    }).catch(() => {})

    res.json({ rapportId: rapport.id, fileUrl })
  } catch (err) {
    next(err)
  }
}
