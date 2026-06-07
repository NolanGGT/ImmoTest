import 'dotenv/config'
import { validateEnv } from './lib/env'
validateEnv()

import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { ZodError } from 'zod'
import { AppError } from './lib/errors'
import { logger } from './lib/logger'
import { authRouter } from './modules/auth/auth.router'
import { biensRouter } from './modules/biens/biens.router'
import { subscriptionRouter } from './modules/subscription/subscription.router'
import { adminRouter } from './modules/admin/admin.router'
import { partageRouter } from './modules/partage/partage.router'
import { rapportsRouter } from './modules/rapports/rapports.router'
import { personalPointsRouter } from './modules/personalPoints/personalPoints.router'
import { sharedAccessRouter } from './modules/sharedAccess/sharedAccess.router'
import { stripeWebhookHandler } from './webhooks/stripe.webhook'
import { generalRateLimit } from './middlewares/rateLimit.middleware'
import { authMiddleware } from './middlewares/auth.middleware'
import { requireAdmin } from './middlewares/admin.middleware'
import passportInstance from './lib/passport'
import './jobs/subscriptionReminder'
import './jobs/tokenCleanup'

const app = express()
app.set('trust proxy', 1)

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true },
    noSniff: true,
    frameguard: { action: 'deny' },
    crossOriginEmbedderPolicy: false, // required for Stripe
  })
)
app.use(
  cors({
    origin: process.env.WEB_URL || 'http://localhost:3010',
    credentials: true,
  })
)

// Webhook AVANT express.json() — Stripe a besoin du body brut non parsé
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler)

app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))
app.use(cookieParser())
app.use(passportInstance.initialize())
app.use(generalRateLimit)

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRouter)
app.use('/api/biens', biensRouter)
app.use('/api/subscription', subscriptionRouter)
app.use('/api/admin', authMiddleware, requireAdmin, adminRouter)
app.use('/api/partage', partageRouter)
app.use('/api/rapports', rapportsRouter)
app.use('/api/personal-points', personalPointsRouter)
app.use('/api/shared-access', sharedAccessRouter)

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({
        err,
        method: req.method,
        url: req.url,
        userId: req.user?.id,
        ip: req.ip,
      }, 'Erreur serveur AppError')
    }
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    })
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      },
    })
  }

  logger.error({
    err,
    method: req.method,
    url: req.url,
    userId: req.user?.id,
    ip: req.ip,
  }, 'Erreur serveur non gérée')

  const anyErr = err as Record<string, unknown>
  const isDev = process.env.NODE_ENV !== 'production'
  const message = isDev
    ? (typeof anyErr.message === 'string' ? anyErr.message : 'Erreur interne')
    : 'Une erreur interne est survenue'

  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message,
      ...(isDev && typeof anyErr.stack === 'string' ? { stack: anyErr.stack } : {}),
    },
  })
})

const PORT = parseInt(process.env.PORT || '3011', 10)
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost'
app.listen(PORT, HOST, () => {
  logger.info(`API running on http://${HOST}:${PORT}`)
})

export default app
