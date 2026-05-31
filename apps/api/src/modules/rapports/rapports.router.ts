import { Router } from 'express'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { genererRapport } from './rapports.controller'

export const rapportsRouter = Router()

rapportsRouter.post('/generer/:bienId', authMiddleware, genererRapport)
