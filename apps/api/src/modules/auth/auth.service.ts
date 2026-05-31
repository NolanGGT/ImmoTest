import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../../lib/jwt'
import { sendEmail } from '../../lib/email'
import * as emailTemplates from '../../lib/emailTemplates'
import { ConflictError, UnauthorizedError, AppError } from '../../lib/errors'

export const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000
export const REFRESH_COOKIE_MAX_AGE_LONG = 90 * 24 * 60 * 60 * 1000

export interface AuthTokens {
  user: { id: string; email: string; role: 'USER' | 'ADMIN'; twoFactorVerified: boolean }
  accessToken: string
  refreshToken: string
}

export async function issueTokens(
  userId: string,
  email: string,
  role: 'USER' | 'ADMIN' = 'USER',
  twoFactorVerified: boolean = false,
  refreshExpiry: '30d' | '90d' = '30d'
): Promise<AuthTokens> {
  const accessToken = generateAccessToken({ id: userId, email, role, twoFactorVerified })
  const refreshToken = generateRefreshToken({ id: userId }, refreshExpiry)
  const refreshTokenHash = await bcrypt.hash(refreshToken, 12)

  await prisma.user.update({
    where: { id: userId },
    data: { refreshTokenHash },
  })

  return { user: { id: userId, email, role, twoFactorVerified }, accessToken, refreshToken }
}

export async function register(email: string, password: string): Promise<AuthTokens> {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new ConflictError('Cet email est déjà utilisé')

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({ data: { email, passwordHash } })

  return issueTokens(user.id, user.email, 'USER', false)
}

export async function login(
  email: string,
  password: string,
  rememberMe: boolean = false
): Promise<AuthTokens> {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw new UnauthorizedError('Email ou mot de passe incorrect')

  // Google-only accounts have no password
  if (!user.passwordHash) throw new UnauthorizedError('Email ou mot de passe incorrect')

  const isValid = await bcrypt.compare(password, user.passwordHash)
  if (!isValid) throw new UnauthorizedError('Email ou mot de passe incorrect')

  // Admin always gets twoFactorVerified: false — they must validate via /2fa/validate
  return issueTokens(
    user.id,
    user.email,
    user.role as 'USER' | 'ADMIN',
    false,
    rememberMe ? '90d' : '30d' as const
  )
}

export async function refresh(token: string): Promise<{ accessToken: string; refreshToken: string }> {
  let payload: { id: string }
  try {
    payload = verifyRefreshToken(token)
  } catch {
    throw new UnauthorizedError('Token de rafraîchissement invalide')
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    include: { twoFactorAuth: { select: { verified: true } } },
  })
  if (!user?.refreshTokenHash) throw new UnauthorizedError('Session expirée')

  const isValid = await bcrypt.compare(token, user.refreshTokenHash)
  if (!isValid) throw new UnauthorizedError('Token de rafraîchissement invalide')

  // Admins with verified 2FA keep their twoFactorVerified=true across refreshes
  const twoFactorVerified =
    user.role === 'ADMIN' && user.twoFactorAuth?.verified === true

  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role as 'USER' | 'ADMIN',
    twoFactorVerified,
  })
  const newRefreshToken = generateRefreshToken({ id: user.id })
  const refreshTokenHash = await bcrypt.hash(newRefreshToken, 12)

  await prisma.user.update({ where: { id: user.id }, data: { refreshTokenHash } })

  return { accessToken, refreshToken: newRefreshToken }
}

export async function logout(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshTokenHash: null },
  })
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } })
  // Always return silently — never reveal whether an email exists
  if (!user) return

  const rawToken = crypto.randomBytes(32).toString('hex')
  const hashedToken = await bcrypt.hash(rawToken, 10)

  // Invalidate previous unused tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  })

  // Create new token (1 hour expiry)
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token: hashedToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  })

  const resetLink = `${process.env.WEB_URL ?? 'http://localhost:3010'}/reset-password?token=${rawToken}`
  await sendEmail({
    to: user.email,
    subject: '🔑 Réinitialisation de votre mot de passe ImmoSafe',
    html: emailTemplates.resetMotDePasse({ lienReset: resetLink }),
  })
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<string> {
  const pendingTokens = await prisma.passwordResetToken.findMany({
    where: { used: false, expiresAt: { gt: new Date() } },
    include: { user: true },
  })

  let matchedToken: (typeof pendingTokens)[0] | undefined
  for (const t of pendingTokens) {
    const isMatch = await bcrypt.compare(rawToken, t.token)
    if (isMatch) {
      matchedToken = t
      break
    }
  }

  if (!matchedToken) {
    throw new AppError(400, 'INVALID_TOKEN', 'Lien invalide ou expiré')
  }

  // Mark used
  await prisma.passwordResetToken.update({
    where: { id: matchedToken.id },
    data: { used: true },
  })

  const passwordHash = await bcrypt.hash(newPassword, 12)

  await prisma.user.update({
    where: { id: matchedToken.userId },
    data: {
      passwordHash,
      refreshTokenHash: null, // invalidate all sessions
    },
  })

  return matchedToken.userId
}
