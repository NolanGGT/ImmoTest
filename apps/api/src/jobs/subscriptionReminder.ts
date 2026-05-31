import cron from 'node-cron'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { sendEmail } from '../lib/email'
import * as emailTemplates from '../lib/emailTemplates'
import { auditLog } from '../lib/audit'

async function getNbAnalyses(userId: string): Promise<number> {
  return prisma.bien.count({ where: { userId } })
}

// Runs every day at 10:00
cron.schedule('0 10 * * *', async () => {
  logger.info('Cron: vérification des abonnements')

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const in7DaysStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  in7DaysStart.setHours(0, 0, 0, 0)
  const in7DaysEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  in7DaysEnd.setHours(23, 59, 59, 999)

  try {
    // Subscriptions expiring in exactly 7 days
    const expiringSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        currentPeriodEnd: { gte: in7DaysStart, lte: in7DaysEnd },
      },
      include: { user: true },
    })

    for (const sub of expiringSubscriptions) {
      const nbAnalyses = await getNbAnalyses(sub.userId)
      sendEmail({
        to: sub.user.email,
        subject: '⏰ Votre accès ImmoSafe expire dans 7 jours',
        html: emailTemplates.rappelExpiration({
          dateExpiration: emailTemplates.formatDate(sub.currentPeriodEnd),
          nbAnalyses,
        }),
      }).catch(() => {})
      logger.info({ userId: sub.userId }, 'Email rappel expiration envoyé')
    }

    // Subscriptions that expired today
    const expiredToday = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        currentPeriodEnd: { gte: todayStart, lte: todayEnd },
      },
      include: { user: true },
    })

    for (const sub of expiredToday) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' },
      })

      sendEmail({
        to: sub.user.email,
        subject: 'Votre accès ImmoSafe a expiré',
        html: emailTemplates.abonnementExpire({
          dateExpiration: emailTemplates.formatDate(sub.currentPeriodEnd),
        }),
      }).catch(() => {})

      auditLog('SUBSCRIPTION_EXPIRED', { userId: sub.userId }).catch(() => {})
      logger.info({ userId: sub.userId }, 'Abonnement expiré, email envoyé')
    }
  } catch (err) {
    logger.error({ err }, 'Cron subscriptionReminder: erreur')
  }
})
