import { Router } from 'express'
import * as authController from './auth.controller'
import * as twoFactorController from './twoFactor.controller'
import { authRateLimit, forgotPasswordRateLimit } from '../../middlewares/rateLimit.middleware'
import { authMiddleware } from '../../middlewares/auth.middleware'
import passport from '../../lib/passport'

export const authRouter = Router()

authRouter.post('/register', authRateLimit, authController.register)
authRouter.post('/login', authRateLimit, authController.login)
authRouter.post('/refresh', authController.refreshToken)
authRouter.post('/logout', authController.logout)
authRouter.post('/forgot-password', forgotPasswordRateLimit, authController.forgotPassword)
authRouter.post('/reset-password', authController.resetPassword)

// Google OAuth
authRouter.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
)
authRouter.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.WEB_URL ?? 'http://localhost:3010'}/login?error=google_failed`,
  }),
  authController.googleCallback
)

authRouter.get('/me', authMiddleware, authController.getMe)
authRouter.patch('/password', authMiddleware, authController.changePassword)
authRouter.delete('/account', authMiddleware, authController.deleteAccount)

// 2FA (admin only — role check is in controller)
authRouter.post('/2fa/setup', authMiddleware, twoFactorController.setup)
authRouter.post('/2fa/verify', authMiddleware, twoFactorController.verify)
authRouter.post('/2fa/validate', authMiddleware, twoFactorController.validate)
authRouter.get('/2fa/status', authMiddleware, twoFactorController.status)
