import rateLimit from 'express-rate-limit'
import type { Request } from 'express'

export const generalRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  skip: (req) => {
    const auth = req.headers.authorization
    return !!auth && auth.startsWith('Bearer ')
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Trop de requêtes. Réessayez dans une minute.',
    },
  },
})

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'AUTH_RATE_LIMIT',
      message: "Trop de tentatives d'authentification. Réessayez dans 15 minutes.",
    },
  },
})

export const forgotPasswordRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Trop de tentatives. Réessayez dans 15 minutes.',
    },
  },
})

export const scrapingRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT',
      message: "Trop de requêtes d'import. Réessayez dans une minute.",
    },
  },
})

export const analyserRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req: Request) => {
    if (req.user) return `user:${req.user.id}`
    const deviceId = req.headers['x-device-id'] as string | undefined
    return deviceId ? `device:${deviceId}` : `ip:${req.ip ?? 'unknown'}`
  },
  skip: (req: Request) => req.user?.role === 'ADMIN',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_ANALYSE',
      message: "Trop d'analyses en cours. Attendez une minute.",
    },
  },
})
