import { prisma } from '../../lib/prisma'
import { NotFoundError, ForbiddenError } from '../../lib/errors'

const SHARE_EXPIRY_DAYS = 7

export async function creerPartage(bienId: string, userId: string) {
  const bien = await prisma.bien.findFirst({ where: { id: bienId, userId } })
  if (!bien) throw new NotFoundError('Bien introuvable')

  const expiresAt = new Date(Date.now() + SHARE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  // One active share per bien — upsert reuses existing token if not expired
  const existing = await prisma.sharedAnalyse.findFirst({
    where: { bienId, expiresAt: { gt: new Date() } },
  })

  if (existing) {
    return { token: existing.token, expiresAt: existing.expiresAt }
  }

  const shared = await prisma.sharedAnalyse.create({
    data: { bienId, expiresAt },
  })

  return { token: shared.token, expiresAt: shared.expiresAt }
}

export async function getPartageByToken(token: string) {
  const shared = await prisma.sharedAnalyse.findUnique({
    where: { token },
    include: {
      bien: {
        select: {
          id: true,
          titre: true,
          prix: true,
          surface: true,
          typeBien: true,
          nbPieces: true,
          ville: true,
          codePostal: true,
          adresse: true,
          dpe: true,
          charges: true,
          anneeConstruction: true,
          prixM2Bien: true,
          prixM2Marche: true,
          scoreImmoSafe: true,
          analyse: true,
          historiqueScores: true,
          createdAt: true,
        },
      },
    },
  })

  if (!shared) throw new NotFoundError('Lien de partage invalide ou expiré')
  if (shared.expiresAt < new Date()) throw new NotFoundError('Lien de partage expiré')

  await prisma.sharedAnalyse.update({
    where: { token },
    data: { views: { increment: 1 } },
  })

  return { bien: shared.bien, expiresAt: shared.expiresAt, views: shared.views + 1 }
}

export async function revoquerPartage(bienId: string, userId: string) {
  const bien = await prisma.bien.findFirst({ where: { id: bienId, userId } })
  if (!bien) throw new NotFoundError('Bien introuvable')

  await prisma.sharedAnalyse.deleteMany({ where: { bienId } })
}

export async function getActiveShare(bienId: string, userId: string) {
  const bien = await prisma.bien.findFirst({ where: { id: bienId, userId } })
  if (!bien) throw new NotFoundError('Bien introuvable')

  const shared = await prisma.sharedAnalyse.findFirst({
    where: { bienId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })

  return shared ? { token: shared.token, expiresAt: shared.expiresAt } : null
}
