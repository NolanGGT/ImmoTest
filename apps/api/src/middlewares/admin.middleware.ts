import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { ForbiddenError } from '../lib/errors'
import { auditLog } from '../lib/audit'

export async function requireAdmin(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const user = req.user

  if (!user || user.role !== 'ADMIN') {
    auditLog('ADMIN_ACCESS_DENIED', {
      userId: user?.id,
      ip: req.ip,
      metadata: { path: req.path, role: user?.role ?? 'none' },
    }).catch(() => {})
    throw new ForbiddenError('Accès non autorisé')
  }

  // Check if 2FA is set up for this admin
  const tfa = await prisma.twoFactorAuth.findUnique({
    where: { userId: user.id },
    select: { verified: true },
  })

  // If 2FA is set up and verified in DB, the token must carry twoFactorVerified: true
  if (tfa?.verified && !user.twoFactorVerified) {
    auditLog('ADMIN_ACCESS_DENIED', {
      userId: user.id,
      ip: req.ip,
      metadata: { path: req.path, reason: '2fa_required' },
    }).catch(() => {})
    throw new ForbiddenError('Authentification 2FA requise')
  }

  // If 2FA not yet set up, let through (frontend redirects to /admin/setup-2fa)
  next()
}
