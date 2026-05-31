import { Request, Response, NextFunction } from 'express'
import * as partageService from './partage.service'
import { auditLog } from '../../lib/audit'

export async function creerPartage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bienId = String(req.params.id)
    const result = await partageService.creerPartage(bienId, req.user!.id)
    auditLog('ANALYSE_PARTAGEE', {
      userId: req.user!.id,
      ip: req.ip,
      metadata: { bienId, token: result.token },
    }).catch(() => {})
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function revoquerPartage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bienId = String(req.params.id)
    await partageService.revoquerPartage(bienId, req.user!.id)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function getActiveShare(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bienId = String(req.params.id)
    const share = await partageService.getActiveShare(bienId, req.user!.id)
    res.json(share ?? null)
  } catch (err) {
    next(err)
  }
}

export async function getByToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = String(req.params.token)
    const result = await partageService.getPartageByToken(token)
    res.json(result)
  } catch (err) {
    next(err)
  }
}
