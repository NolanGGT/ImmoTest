import { Request, Response } from 'express'
import Stripe from 'stripe'
import { stripe } from '../lib/stripe'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { sendEmail } from '../lib/email'
import * as emailTemplates from '../lib/emailTemplates'

export async function stripeWebhookHandler(req: Request, res: Response): Promise<void> {
  const sig = req.headers['stripe-signature']

  if (!sig) {
    res.status(400).json({ error: 'Missing stripe-signature header' })
    return
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signature invalide'
    logger.warn({ err }, `Webhook signature invalide: ${message}`)
    res.status(400).json({ error: `Webhook Error: ${message}` })
    return
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        logger.info({
          eventType: event.type,
          metadata: session.metadata,
          customerId: session.customer,
          sessionId: session.id,
        }, 'Webhook checkout.session.completed reçu')

        try {
          const userId = session.metadata?.userId
          const stripeCustomerId = session.customer as string

          if (!userId) {
            logger.warn({ sessionId: session.id, metadata: session.metadata }, 'Webhook: userId manquant dans metadata')
            break
          }

          const currentPeriodEnd = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)

          logger.info({ userId, stripeCustomerId, sessionId: session.id }, 'Webhook: appel prisma.subscription.upsert')

          await prisma.subscription.upsert({
            where: { userId },
            update: {
              stripeCustomerId,
              stripeSubscriptionId: session.id,
              status: 'ACTIVE',
              currentPeriodEnd,
            },
            create: {
              userId,
              stripeCustomerId,
              stripeSubscriptionId: session.id,
              status: 'ACTIVE',
              currentPeriodEnd,
            },
          })

          logger.info({ userId, currentPeriodEnd }, 'Abonnement activé')

          // Send confirmation email — fire-and-forget
          const user = await prisma.user.findUnique({ where: { id: userId } })
          if (user) {
            sendEmail({
              to: user.email,
              subject: '✅ Votre accès ImmoSafe est activé',
              html: emailTemplates.confirmationPaiement({
                dateExpiration: emailTemplates.formatDate(currentPeriodEnd),
                montant: '39,99',
              }),
            }).catch(() => {})
          }
        } catch (checkoutErr) {
          logger.error({
            err: checkoutErr,
            sessionId: session.id,
            metadata: session.metadata,
          }, 'Webhook checkout.session.completed: erreur traitement')
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        logger.warn({ customerId: pi.customer }, 'Paiement échoué')
        break
      }

      default:
        break
    }
  } catch (err) {
    // Toujours 200 pour éviter les retries Stripe — l'erreur est loggée
    logger.error({ err, eventType: event.type }, 'Erreur interne traitement webhook')
  }

  res.json({ received: true })
}
