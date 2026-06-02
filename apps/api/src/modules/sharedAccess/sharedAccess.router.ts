import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import * as ctrl from './sharedAccess.controller'

export const sharedAccessRouter = Router()

sharedAccessRouter.post('/invite', authMiddleware, ctrl.invite)
sharedAccessRouter.get('/', authMiddleware, ctrl.list)
sharedAccessRouter.delete('/:id', authMiddleware, ctrl.revoke)
sharedAccessRouter.get('/accept/:token', authMiddleware, ctrl.accept)
