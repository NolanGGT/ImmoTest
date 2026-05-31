import { Request, Response, NextFunction } from 'express'
import * as adminService from './admin.service'
import { auditLog } from '../../lib/audit'
import { AppError } from '../../lib/errors'

export async function getMetrics(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const metrics = await adminService.getMetrics()
    res.json(metrics)
  } catch (err) {
    next(err)
  }
}

export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10))
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)))
    const search = req.query.search ? String(req.query.search) : undefined
    const filter = req.query.filter ? String(req.query.filter) : 'all'

    const result = await adminService.listUsers({ page, limit, search, filter })
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function getUserDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id)
    const result = await adminService.getUserDetail(id)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function patchUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id)
    const body = req.body as { blocked?: boolean; role?: 'USER' | 'ADMIN' }

    try {
      const updated = await adminService.patchUser(id, req.user!.id, body)

      if (body.blocked === true) {
        auditLog('ADMIN_USER_BLOCKED', {
          userId: req.user!.id,
          ip: req.ip,
          metadata: { targetUserId: id },
        }).catch(() => {})
      }
      if (body.role !== undefined) {
        auditLog('ADMIN_ROLE_CHANGED', {
          userId: req.user!.id,
          ip: req.ip,
          metadata: { targetUserId: id, newRole: body.role },
        }).catch(() => {})
      }

      res.json(updated)
    } catch (serviceErr) {
      if (serviceErr instanceof Error && serviceErr.message === 'SELF_BLOCK') {
        throw new AppError(400, 'BAD_REQUEST', 'Un admin ne peut pas se bloquer lui-même')
      }
      throw serviceErr
    }
  } catch (err) {
    next(err)
  }
}

export async function listAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10))
    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10)))
    const userId = req.query.userId ? String(req.query.userId) : undefined
    const action = req.query.action ? String(req.query.action) : undefined
    const startDate = req.query.startDate ? String(req.query.startDate) : undefined
    const endDate = req.query.endDate ? String(req.query.endDate) : undefined

    const result = await adminService.listAuditLogs({ page, limit, userId, action, startDate, endDate })
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function getTokenStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await adminService.getTokenStats()
    res.json(result)
  } catch (err) {
    next(err)
  }
}
