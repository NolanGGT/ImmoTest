import { Request, Response, NextFunction } from 'express'
import * as twoFactorService from './twoFactor.service'
import { ForbiddenError } from '../../lib/errors'
import { auditLog } from '../../lib/audit'

function requireAdminRole(req: Request): void {
  if (req.user?.role !== 'ADMIN') throw new ForbiddenError('Accès non autorisé')
}

export async function setup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireAdminRole(req)
    const { id, email } = req.user!
    const result = await twoFactorService.setupTwoFactor(id, email)
    auditLog('ADMIN_2FA_SETUP', { userId: id, ip: req.ip }).catch(() => {})
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function verify(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireAdminRole(req)
    const { token } = req.body as { token: string }
    await twoFactorService.verifyTwoFactor(req.user!.id, token)
    auditLog('ADMIN_2FA_VERIFIED', { userId: req.user!.id, ip: req.ip }).catch(() => {})
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function validate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireAdminRole(req)
    const { token } = req.body as { token: string }
    const result = await twoFactorService.validateTwoFactor(
      req.user!.id,
      req.user!.email,
      token
    )
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function status(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    requireAdminRole(req)
    const result = await twoFactorService.getTwoFactorStatus(req.user!.id)
    res.json(result)
  } catch (err) {
    next(err)
  }
}
