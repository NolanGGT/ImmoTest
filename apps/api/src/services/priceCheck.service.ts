import { scrapeAnnonce } from './scraping.service'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'

const MINIMUM_DAYS_BETWEEN_CHECKS = 7
const MINIMUM_CHANGE_PERCENT = 1

export async function checkPricesForUser(userId: string): Promise<void> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - MINIMUM_DAYS_BETWEEN_CHECKS)

  const biens = await prisma.bien.findMany({
    where: {
      userId,
      urlSource: { not: null },
      OR: [
        { lastCheckedAt: null },
        { lastCheckedAt: { lt: cutoffDate } },
      ],
    },
    select: {
      id: true,
      urlSource: true,
      prix: true,
      lastKnownPrix: true,
      ville: true,
      titre: true,
    },
  })

  if (biens.length === 0) {
    logger.debug({ userId }, 'Aucun bien à vérifier')
    return
  }

  logger.info({ userId, count: biens.length }, 'Vérification des prix démarrée')

  for (const bien of biens) {
    try {
      const result = await scrapeAnnonce(bien.urlSource!)

      await prisma.bien.update({
        where: { id: bien.id },
        data: { lastCheckedAt: new Date() },
      })

      if (!result.data.prix) continue

      const prixReference = bien.lastKnownPrix ?? bien.prix
      const prixActuel = result.data.prix
      const variation = ((prixActuel - prixReference) / prixReference) * 100

      if (Math.abs(variation) < MINIMUM_CHANGE_PERCENT) continue

      logger.info(
        {
          bienId: bien.id,
          ville: bien.ville,
          prixReference,
          prixActuel,
          variation: variation.toFixed(1) + '%',
        },
        'Changement de prix détecté'
      )

      await prisma.priceCheck.create({
        data: {
          bienId: bien.id,
          userId,
          ancienPrix: prixReference,
          nouveauPrix: prixActuel,
          pourcentage: parseFloat(variation.toFixed(2)),
          seen: false,
        },
      })

      await prisma.bien.update({
        where: { id: bien.id },
        data: { lastKnownPrix: prixActuel, prix: prixActuel },
      })
    } catch (error) {
      logger.warn({ bienId: bien.id, error }, 'Erreur vérification prix')
    }

    await new Promise((r) => setTimeout(r, 1500))
  }

  logger.info({ userId }, 'Vérification des prix terminée')
}
