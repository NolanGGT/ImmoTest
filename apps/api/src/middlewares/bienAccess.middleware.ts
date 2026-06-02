import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { AppError } from '../lib/errors'

export async function requireBienAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bienId = req.params.id as string
    const userId = req.user!.id

    const isOwner = await prisma.bien.findFirst({
      where: { id: bienId, userId },
      select: { id: true },
    })
    if (isOwner) return next()

    const bienOwner = await prisma.bien.findFirst({
      where: { id: bienId },
      select: { userId: true },
    })
    if (!bienOwner) throw new AppError(404, 'NOT_FOUND', 'Bien introuvable')

    if (bienOwner.userId) {
      const sharedAccess = await prisma.sharedAccess.findFirst({
        where: { ownerId: bienOwner.userId, guestId: userId, status: 'ACTIVE' },
        select: { id: true },
      })
      if (sharedAccess) return next()
    }

    throw new AppError(403, 'FORBIDDEN', 'Accès non autorisé')
  } catch (err) {
    next(err)
  }
}
