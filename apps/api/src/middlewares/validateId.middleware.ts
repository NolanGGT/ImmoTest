import { Request, Response, NextFunction } from 'express'
import { AppError } from '../lib/errors'

// CUID v1: 'c' + 24 lowercase alphanumeric chars = 25 chars total
const CUID_RE = /^[a-z0-9]{25}$/

export function validateId(req: Request, _res: Response, next: NextFunction): void {
  const id = req.params.id as string
  if (id && !CUID_RE.test(id)) {
    throw new AppError(400, 'INVALID_ID', 'Identifiant invalide')
  }
  next()
}
