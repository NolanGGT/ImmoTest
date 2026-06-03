import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../lib/errors'

const UpdatePointSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  radiusKm: z.number().min(0).max(50).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
})

const CreatePointSchema = z.object({
  label: z.string().min(1).max(50),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

export async function getPoints(req: Request, res: Response) {
  const userId = req.user!.id
  const points = await prisma.personalPoint.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })
  return res.json(points)
}

export async function createPoint(req: Request, res: Response) {
  const userId = req.user!.id
  const body = CreatePointSchema.parse(req.body)

  const count = await prisma.personalPoint.count({ where: { userId } })
  if (count >= 10) {
    throw new AppError(400, 'MAX_POINTS_REACHED', 'Vous avez atteint la limite de 10 points personnalisés')
  }

  const point = await prisma.personalPoint.create({
    data: {
      userId,
      label: body.label.trim().slice(0, 50),
      latitude: body.latitude,
      longitude: body.longitude,
      color: body.color ?? '#7c3aed',
    },
  })

  return res.status(201).json(point)
}

export async function updatePoint(req: Request, res: Response) {
  try {
    const id = req.params.id as string
    const { radiusKm, label, color } = req.body
    console.log('PATCH personal-point:', { id, radiusKm, label, color })
    console.log('userId:', req.user?.id)

    const body = UpdatePointSchema.parse(req.body)

    const point = await prisma.personalPoint.findFirst({ where: { id, userId: req.user!.id } })
    console.log('Point trouvé:', point)

    if (!point) {
      throw new AppError(404, 'NOT_FOUND', 'Point introuvable')
    }

    const updated = await prisma.personalPoint.update({
      where: { id },
      data: {
        ...(body.label !== undefined && { label: body.label.trim().slice(0, 50) }),
        ...(body.radiusKm !== undefined && { radiusKm: body.radiusKm }),
        ...(body.color !== undefined && { color: body.color }),
      },
    })
    return res.json(updated)
  } catch (error) {
    console.error('ERREUR PATCH personal-point:', error)
    throw error
  }
}

export async function deletePoint(req: Request, res: Response) {
  const userId = req.user!.id
  const id = req.params.id as string

  const point = await prisma.personalPoint.findFirst({ where: { id, userId } })
  if (!point) {
    throw new AppError(404, 'NOT_FOUND', 'Point introuvable')
  }

  await prisma.personalPoint.delete({ where: { id } })
  return res.status(204).send()
}
