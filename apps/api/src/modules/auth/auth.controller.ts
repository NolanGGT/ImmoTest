import { Request, Response, NextFunction } from 'express'
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schema'
import * as authService from './auth.service'
import { UnauthorizedError } from '../../lib/errors'
import { auditLog } from '../../lib/audit'
import { logger } from '../../lib/logger'
import { checkPricesForUser } from '../../services/priceCheck.service'
import { revokeToken, isTokenRevoked, verifyRefreshToken } from '../../lib/jwt'
import { checkLoginAllowed, recordFailedAttempt, resetLoginAttempts } from '../../lib/loginProtection'

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/api/auth',
    maxAge,
  }
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = registerSchema.parse(req.body)
    const result = await authService.register(email, password)
    auditLog('USER_REGISTER', { userId: result.user.id, ip: req.ip }).catch(() => {})
    res.cookie('refreshToken', result.refreshToken, cookieOptions(authService.REFRESH_COOKIE_MAX_AGE))
    res.status(201).json({ user: result.user, accessToken: result.accessToken })
  } catch (err) {
    next(err)
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, rememberMe } = loginSchema.parse(req.body)

    await checkLoginAllowed(email)

    let result: Awaited<ReturnType<typeof authService.login>>
    try {
      result = await authService.login(email, password, rememberMe)
    } catch (authErr) {
      auditLog('USER_LOGIN_FAILED', { ip: req.ip, metadata: { email } }).catch(() => {})
      await recordFailedAttempt(email).catch(() => {})
      throw authErr
    }

    await resetLoginAttempts(email).catch(() => {})
    auditLog('USER_LOGIN', { userId: result.user.id, ip: req.ip }).catch(() => {})
    const maxAge = rememberMe
      ? authService.REFRESH_COOKIE_MAX_AGE_LONG
      : authService.REFRESH_COOKIE_MAX_AGE
    res.cookie('refreshToken', result.refreshToken, cookieOptions(maxAge))
    res.json({ user: result.user, accessToken: result.accessToken })
    setImmediate(() => {
      checkPricesForUser(result.user.id).catch((err) =>
        logger.error({ userId: result.user.id, err }, 'Erreur checkPricesForUser')
      )
    })
  } catch (err) {
    next(err)
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.refreshToken
    if (!token) throw new UnauthorizedError('Token de rafraîchissement manquant')

    if (await isTokenRevoked(token)) {
      throw new UnauthorizedError('Session invalide. Veuillez vous reconnecter.')
    }

    const result = await authService.refresh(token)
    res.cookie('refreshToken', result.refreshToken, cookieOptions(authService.REFRESH_COOKIE_MAX_AGE))
    res.json({ accessToken: result.accessToken })
  } catch (err) {
    next(err)
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.refreshToken
    let userId: string | undefined
    if (token) {
      try {
        const payload = verifyRefreshToken(token)
        userId = payload.id
        await revokeToken(token, userId)
        await authService.logout(userId)
      } catch {
        // Invalid token — clear cookie anyway
      }
    }
    auditLog('USER_LOGOUT', { userId, ip: req.ip }).catch(() => {})
    res.clearCookie('refreshToken', { path: '/api/auth' })
    res.sendStatus(200)
  } catch (err) {
    next(err)
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = forgotPasswordSchema.parse(req.body)
    await authService.forgotPassword(email)
    // Always return the same message regardless of whether email exists
    res.json({ message: 'Si cet email existe, un lien a été envoyé' })
  } catch (err) {
    next(err)
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body)
    const userId = await authService.resetPassword(token, password)
    auditLog('PASSWORD_RESET', { userId, ip: req.ip }).catch(() => {})
    res.json({ message: 'Mot de passe mis à jour' })
  } catch (err) {
    next(err)
  }
}

export async function googleCallback(req: Request, res: Response): Promise<void> {
  const webUrl = process.env.WEB_URL ?? 'http://localhost:3001'
  try {
    const user = req.user as { id: string; email: string; role: 'USER' | 'ADMIN' }
    const result = await authService.issueTokens(user.id, user.email, user.role ?? 'USER', false)

    res.cookie('refreshToken', result.refreshToken, {
      ...cookieOptions(authService.REFRESH_COOKIE_MAX_AGE),
      sameSite: 'lax', // needed for cross-origin OAuth redirect
    })

    res.redirect(`${webUrl}/auth/google/callback?token=${result.accessToken}`)
  } catch {
    res.redirect(`${webUrl}/login?error=google_failed`)
  }
}
