import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { prisma } from './prisma'

export interface AccessTokenPayload {
  id: string
  email: string
  role: 'USER' | 'ADMIN'
  twoFactorVerified: boolean
}

export interface RefreshTokenPayload {
  id: string
}

function getSecret(key: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET'): string {
  const secret = process.env[key]
  if (!secret) throw new Error(`Missing env var: ${key}`)
  return secret
}

export function generateAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, getSecret('JWT_ACCESS_SECRET'), { expiresIn: '15m' })
}

export function generateRefreshToken(
  payload: RefreshTokenPayload,
  expiresIn: '30d' | '90d' = '30d'
): string {
  // Cast needed because @types/jsonwebtoken uses ms.StringValue for expiresIn
  return jwt.sign(payload, getSecret('JWT_REFRESH_SECRET'), {
    expiresIn: expiresIn as unknown as number,
  })
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, getSecret('JWT_ACCESS_SECRET')) as AccessTokenPayload
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, getSecret('JWT_REFRESH_SECRET')) as RefreshTokenPayload
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function isTokenRevoked(token: string): Promise<boolean> {
  const hash = hashToken(token)
  const revoked = await prisma.revokedToken.findUnique({ where: { tokenHash: hash } })
  return !!revoked
}

export async function revokeToken(token: string, userId: string): Promise<void> {
  const hash = hashToken(token)

  let expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null
    if (decoded?.exp) expiresAt = new Date(decoded.exp * 1000)
  } catch {
    // Use default 90-day expiry if decode fails
  }

  await prisma.revokedToken.upsert({
    where: { tokenHash: hash },
    update: {},
    create: { tokenHash: hash, userId, expiresAt },
  })
}
