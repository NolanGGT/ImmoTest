import { prisma } from '../../lib/prisma'
import {
  encryptSecret,
  decryptSecret,
  generateTotpSecret,
  generateQrCodeDataUrl,
  verifyTotpToken,
} from '../../lib/twoFactor'
import { generateAccessToken } from '../../lib/jwt'
import { AppError } from '../../lib/errors'

export async function setupTwoFactor(
  userId: string,
  email: string
): Promise<{ qrCodeUrl: string; secret: string }> {
  const { secret, otpauthUrl } = generateTotpSecret(email)
  const encryptedSecret = encryptSecret(secret)
  const qrCodeUrl = await generateQrCodeDataUrl(otpauthUrl)

  await prisma.twoFactorAuth.upsert({
    where: { userId },
    update: { secret: encryptedSecret, verified: false },
    create: { userId, secret: encryptedSecret, verified: false },
  })

  return { qrCodeUrl, secret }
}

export async function verifyTwoFactor(userId: string, token: string): Promise<void> {
  const tfa = await prisma.twoFactorAuth.findUnique({ where: { userId } })
  if (!tfa) throw new AppError(400, 'NOT_FOUND', 'Setup 2FA non initialisé')

  const plainSecret = decryptSecret(tfa.secret)
  const isValid = verifyTotpToken(plainSecret, token)
  if (!isValid) throw new AppError(400, 'INVALID_TOKEN', 'Code invalide')

  await prisma.twoFactorAuth.update({ where: { userId }, data: { verified: true } })
}

export async function validateTwoFactor(
  userId: string,
  email: string,
  token: string
): Promise<{ accessToken: string }> {
  const tfa = await prisma.twoFactorAuth.findUnique({ where: { userId } })
  if (!tfa?.verified) throw new AppError(400, 'NOT_FOUND', '2FA non configuré')

  const plainSecret = decryptSecret(tfa.secret)
  const isValid = verifyTotpToken(plainSecret, token)
  if (!isValid) throw new AppError(401, 'INVALID_TOKEN', 'Code incorrect')

  const accessToken = generateAccessToken({
    id: userId,
    email,
    role: 'ADMIN',
    twoFactorVerified: true,
  })

  return { accessToken }
}

export async function getTwoFactorStatus(userId: string): Promise<{ enabled: boolean }> {
  const tfa = await prisma.twoFactorAuth.findUnique({
    where: { userId },
    select: { verified: true },
  })
  return { enabled: tfa?.verified ?? false }
}
