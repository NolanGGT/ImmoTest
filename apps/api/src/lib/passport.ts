import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { prisma } from './prisma'
import { auditLog } from './audit'
import { logger } from './logger'

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.API_URL ?? 'http://localhost:3011'}/api/auth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value
        if (!email) return done(new Error('Email Google non disponible'))

        let user = await prisma.user.findUnique({ where: { email } })

        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              passwordHash: '',
              googleId: profile.id,
            },
          })
          auditLog('USER_REGISTER', {
            userId: user.id,
            metadata: { provider: 'google' },
          }).catch(() => {})
        } else if (!user.googleId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { googleId: profile.id },
          })
        }

        auditLog('USER_LOGIN', {
          userId: user.id,
          metadata: { provider: 'google' },
        }).catch(() => {})

        return done(null, {
          id: user.id,
          email: user.email,
          role: user.role as 'USER' | 'ADMIN',
          twoFactorVerified: false,
        })
      } catch (error) {
        logger.error({ error }, 'Google OAuth strategy error')
        return done(error as Error)
      }
    }
  )
)

export default passport
