import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as service from './sharedAccess.service'

const InviteSchema = z.object({
  email: z.string().email('Email invalide').max(254),
})

export async function invite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = InviteSchema.parse(req.body)
    const access = await service.createInvitation(req.user!.id, email)
    res.status(201).json(access)
  } catch (err) {
    next(err)
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.listAccess(req.user!.id)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function revoke(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string
    await service.revokeAccess(id, req.user!.id)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}

export async function accept(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.params.token as string
    await service.acceptInvitation(token, req.user!.id)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
