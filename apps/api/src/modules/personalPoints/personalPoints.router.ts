import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { validateId } from '../../middlewares/validateId.middleware'
import { getPoints, createPoint, updatePoint, deletePoint } from './personalPoints.controller'

export const personalPointsRouter = Router()

personalPointsRouter.get('/', authMiddleware, getPoints)
personalPointsRouter.post('/', authMiddleware, createPoint)
personalPointsRouter.patch('/:id', authMiddleware, validateId, updatePoint)
personalPointsRouter.delete('/:id', authMiddleware, validateId, deletePoint)
