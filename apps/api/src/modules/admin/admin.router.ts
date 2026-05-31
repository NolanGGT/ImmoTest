import { Router } from 'express'
import * as adminController from './admin.controller'

export const adminRouter = Router()

adminRouter.get('/metrics', adminController.getMetrics)
adminRouter.get('/users', adminController.listUsers)
adminRouter.get('/users/:id', adminController.getUserDetail)
adminRouter.patch('/users/:id', adminController.patchUser)
adminRouter.get('/audit-logs', adminController.listAuditLogs)
adminRouter.get('/token-stats', adminController.getTokenStats)
