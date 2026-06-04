import { prisma } from './prisma'
import { logger } from './logger'
import type { Prisma } from '@prisma/client'

export type AuditAction =
  | 'USER_REGISTER'
  | 'USER_LOGIN'
  | 'USER_LOGIN_FAILED'
  | 'USER_LOGOUT'
  | 'ANALYSE_STARTED'
  | 'ANALYSE_COMPLETED'
  | 'ANALYSE_FAILED'
  | 'SUBSCRIPTION_CREATED'
  | 'SUBSCRIPTION_EXPIRED'
  | 'SUSPICIOUS_INPUT'
  | 'RATE_LIMIT_HIT'
  | 'FREE_ANALYSIS_USED'
  | 'PASSWORD_RESET'
  | 'ADMIN_ACCESS_DENIED'
  | 'ADMIN_USER_BLOCKED'
  | 'ADMIN_ROLE_CHANGED'
  | 'ADMIN_2FA_SETUP'
  | 'ADMIN_2FA_VERIFIED'
  | 'ANALYSE_RELANCEE'
  | 'ANALYSE_PARTAGEE'
  | 'BIEN_SUPPRIME'
  | 'SCRAPING'
  | 'RAPPORT_GENERE'
  | 'LOGIN_BLOCKED'
  | 'PASSWORD_CHANGED'
  | 'ACCOUNT_DELETED'

export async function auditLog(
  action: AuditAction,
  data: { userId?: string; ip?: string; metadata?: Record<string, unknown> }
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId: data.userId ?? null,
        ip: data.ip ?? null,
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
      },
    })
  } catch (error) {
    // Never let an audit log failure block a user action
    logger.error({ error, action }, 'Échec audit log')
  }
}
