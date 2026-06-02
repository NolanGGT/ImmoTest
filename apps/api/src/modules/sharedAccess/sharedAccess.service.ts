import { prisma } from '../../lib/prisma'
import { sendEmail } from '../../lib/email'
import * as emailTemplates from '../../lib/emailTemplates'
import { AppError } from '../../lib/errors'

const MAX_INVITATIONS = 3
const INVITE_EXPIRY_DAYS = 7

export async function createInvitation(ownerId: string, guestEmail: string) {
  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { email: true } })
  if (!owner) throw new AppError(404, 'NOT_FOUND', 'Utilisateur introuvable')
  if (owner.email.toLowerCase() === guestEmail.toLowerCase()) {
    throw new AppError(400, 'INVALID_EMAIL', 'Vous ne pouvez pas vous inviter vous-même')
  }

  const activeCount = await prisma.sharedAccess.count({
    where: { ownerId, status: { in: ['PENDING', 'ACTIVE'] } },
  })
  if (activeCount >= MAX_INVITATIONS) {
    throw new AppError(400, 'MAX_INVITATIONS', 'Maximum 3 invités actifs par compte')
  }

  const existing = await prisma.sharedAccess.findFirst({
    where: { ownerId, guestEmail: guestEmail.toLowerCase(), status: { in: ['PENDING', 'ACTIVE'] } },
  })
  if (existing) throw new AppError(409, 'ALREADY_INVITED', 'Cet email a déjà été invité')

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS)

  const access = await prisma.sharedAccess.create({
    data: { ownerId, guestEmail: guestEmail.toLowerCase(), expiresAt },
  })

  const webUrl = process.env.WEB_URL ?? 'http://localhost:3010'
  await sendEmail({
    to: guestEmail,
    subject: `${owner.email.split('@')[0]} vous invite sur ImmoSafe`,
    html: emailTemplates.invitationPartage({
      ownerEmail: owner.email,
      inviteUrl: `${webUrl}/invite/${access.token}`,
      expiresIn: `${INVITE_EXPIRY_DAYS} jours`,
    }),
  })

  return access
}

export async function listAccess(userId: string) {
  const [owned, received] = await Promise.all([
    prisma.sharedAccess.findMany({
      where: { ownerId: userId },
      include: { guest: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.sharedAccess.findFirst({
      where: { guestId: userId, status: 'ACTIVE' },
      include: { owner: { select: { email: true } } },
    }),
  ])
  return { owned, received }
}

export async function revokeAccess(id: string, ownerId: string) {
  const access = await prisma.sharedAccess.findFirst({ where: { id, ownerId } })
  if (!access) throw new AppError(404, 'NOT_FOUND', 'Accès introuvable')
  await prisma.sharedAccess.update({ where: { id }, data: { status: 'REVOKED' } })
}

export async function acceptInvitation(token: string, userId: string) {
  const access = await prisma.sharedAccess.findUnique({ where: { token } })
  if (!access) throw new AppError(404, 'NOT_FOUND', 'Invitation introuvable')
  if (access.status === 'REVOKED') throw new AppError(410, 'REVOKED', 'Invitation révoquée')
  if (access.expiresAt < new Date()) throw new AppError(410, 'EXPIRED', 'Invitation expirée')
  if (access.status === 'ACTIVE') return access
  if (access.ownerId === userId) {
    throw new AppError(400, 'INVALID', 'Vous ne pouvez pas accepter votre propre invitation')
  }

  return prisma.sharedAccess.update({
    where: { id: access.id },
    data: { guestId: userId, status: 'ACTIVE' },
  })
}
