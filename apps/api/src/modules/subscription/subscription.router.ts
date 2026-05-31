import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import * as subscriptionController from './subscription.controller'

export const subscriptionRouter = Router()

subscriptionRouter.post('/create-checkout', authMiddleware, subscriptionController.createCheckout)
subscriptionRouter.get('/status', authMiddleware, subscriptionController.getStatus)
subscriptionRouter.patch('/cancel', authMiddleware, subscriptionController.cancel)
