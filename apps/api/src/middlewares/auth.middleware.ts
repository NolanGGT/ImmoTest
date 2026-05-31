import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../lib/jwt'
import { UnauthorizedError } from '../lib/errors'

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError()
  }

  const token = authHeader.slice(7)

  try {
    req.user = verifyAccessToken(token)
    next()
  } catch {
    throw new UnauthorizedError('Token invalide ou expiré')
  }
}

export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    try {
      req.user = verifyAccessToken(authHeader.slice(7))
    } catch {
      // Invalid token treated as unauthenticated — don't block the request
    }
  }
  next()
}
