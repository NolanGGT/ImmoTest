import cron from 'node-cron'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'

// Runs every night at 3:00 AM
cron.schedule('0 3 * * *', async () => {
  logger.info('Cron: nettoyage des tokens revolques et tentatives de login')

  try {
    const revokedDeleted = await prisma.revokedToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    })
    logger.info({ deleted: revokedDeleted.count }, 'Tokens revolques expires supprimes')
  } catch (err) {
    logger.error({ err }, 'Cron tokenCleanup: erreur suppression revokedToken')
  }

  try {
    const attemptsDeleted = await prisma.loginAttempt.deleteMany({
      where: {
        lockedUntil: null,
        lastAttempt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    })
    logger.info({ deleted: attemptsDeleted.count }, 'Tentatives de login anciennes supprimees')
  } catch (err) {
    logger.error({ err }, 'Cron tokenCleanup: erreur suppression loginAttempt')
  }
})
