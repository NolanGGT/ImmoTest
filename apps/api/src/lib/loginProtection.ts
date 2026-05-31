import { prisma } from './prisma'
import { AppError } from './errors'
import { auditLog } from './audit'
import { logger } from './logger'

const MAX_ATTEMPTS = 5
const BASE_DELAY_MS = 1000

function getLockDurationMs(attempts: number): number {
  if (attempts >= MAX_ATTEMPTS) return 15 * 60 * 1000
  return Math.min(BASE_DELAY_MS * Math.pow(2, attempts - 1), 30_000)
}

export async function checkLoginAllowed(email: string): Promise<void> {
  const record = await prisma.loginAttempt.findUnique({
    where: { identifier: email.toLowerCase() },
  })

  if (!record) return

  if (record.lockedUntil && record.lockedUntil > new Date()) {
    const remainingMs = record.lockedUntil.getTime() - Date.now()
    const remainingMin = Math.ceil(remainingMs / 60_000)
    throw new AppError(
      429,
      'TOO_MANY_ATTEMPTS',
      `Trop de tentatives. Reessayez dans ${remainingMin} minute(s).`
    )
  }

  // Lock expired — reset so stale data doesn't accumulate
  if (record.lockedUntil && record.lockedUntil <= new Date()) {
    await prisma.loginAttempt.update({
      where: { identifier: email.toLowerCase() },
      data: { attempts: 0, lockedUntil: null },
    })
  }
}

export async function recordFailedAttempt(email: string): Promise<void> {
  const record = await prisma.loginAttempt.upsert({
    where: { identifier: email.toLowerCase() },
    update: { attempts: { increment: 1 }, lastAttempt: new Date() },
    create: { identifier: email.toLowerCase(), attempts: 1, lastAttempt: new Date() },
  })

  const newAttempts = record.attempts

  if (newAttempts >= MAX_ATTEMPTS) {
    const lockDuration = getLockDurationMs(newAttempts)
    const lockedUntil = new Date(Date.now() + lockDuration)

    await prisma.loginAttempt.update({
      where: { identifier: email.toLowerCase() },
      data: { lockedUntil },
    })

    auditLog('LOGIN_BLOCKED', {
      metadata: { email: email.toLowerCase(), attempts: newAttempts, lockedUntil },
    }).catch(() => {})

    logger.warn({ email: email.toLowerCase(), attempts: newAttempts }, 'Compte temporairement bloque')
  }
}

export async function resetLoginAttempts(email: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({
    where: { identifier: email.toLowerCase() },
  })
}
