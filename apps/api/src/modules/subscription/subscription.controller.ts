import { Request, Response, NextFunction } from 'express'
import * as subscriptionService from './subscription.service'
import { AppError } from '../../lib/errors'
import { auditLog } from '../../lib/audit'

export async function createCheckout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = await subscriptionService.getSubscriptionStatus(req.user!.id)
    if (status.isActive) {
      throw new AppError(400, 'ALREADY_SUBSCRIBED', 'Vous avez déjà un abonnement actif.')
    }
    const result = await subscriptionService.createCheckoutSession(req.user!.id)
    auditLog('SUBSCRIPTION_CREATED', { userId: req.user!.id, ip: req.ip }).catch(() => {})
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = await subscriptionService.getSubscriptionStatus(req.user!.id)
    res.json(status)
  } catch (err) {
    next(err)
  }
}

export async function cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = await subscriptionService.getSubscriptionStatus(req.user!.id)
    if (!status.isActive) {
      throw new AppError(400, 'NO_ACTIVE_SUBSCRIPTION', 'Aucun abonnement actif à annuler.')
    }
    await subscriptionService.cancelSubscription(req.user!.id)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
