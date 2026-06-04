import { stripe } from '../../lib/stripe'
import { prisma } from '../../lib/prisma'
import { logger } from '../../lib/logger'
import { getEnv } from '../../lib/env'

export interface SubscriptionStatus {
  isActive: boolean
  currentPeriodEnd?: Date
  daysRemaining?: number
  cancelAtPeriodEnd?: boolean
}

export async function createCheckoutSession(userId: string): Promise<{ checkoutUrl: string }> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { subscription: true },
  })

  // Reuse existing customer ID if user has had a subscription before
  let stripeCustomerId = user.subscription?.stripeCustomerId

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId },
    })
    stripeCustomerId = customer.id
  }

  const env = getEnv()
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${env.WEB_URL}/profil?success=true`,
    cancel_url: `${env.WEB_URL}/profil?cancelled=true`,
    customer: stripeCustomerId,
    metadata: { userId },
  })

  logger.info({ userId }, 'Checkout session créée')
  return { checkoutUrl: session.url! }
}

export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const sub = await prisma.subscription.findUnique({ where: { userId } })

  if (!sub) return { isActive: false }

  const now = new Date()
  const isActive = sub.currentPeriodEnd > now

  if (!isActive) {
    return { isActive: false, currentPeriodEnd: sub.currentPeriodEnd }
  }

  const msRemaining = sub.currentPeriodEnd.getTime() - now.getTime()
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)))

  return {
    isActive: true,
    currentPeriodEnd: sub.currentPeriodEnd,
    daysRemaining,
    cancelAtPeriodEnd: sub.status === 'CANCELLED',
  }
}

export async function cancelSubscription(userId: string): Promise<void> {
  await prisma.subscription.update({
    where: { userId },
    data: { status: 'CANCELLED' },
  })
  logger.info({ userId }, 'Abonnement annulé')
}

export async function reactivateSubscription(userId: string): Promise<void> {
  const sub = await prisma.subscription.findUnique({ where: { userId } })
  if (!sub || sub.currentPeriodEnd <= new Date()) {
    throw new Error('NO_ACTIVE_SUBSCRIPTION')
  }
  await prisma.subscription.update({
    where: { userId },
    data: { status: 'ACTIVE' },
  })
  logger.info({ userId }, 'Abonnement réactivé')
}
