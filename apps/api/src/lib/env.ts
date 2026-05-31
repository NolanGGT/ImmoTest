import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL est requis'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL est requis'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET doit faire au moins 32 caractères'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET doit faire au moins 32 caractères'),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-', 'ANTHROPIC_API_KEY invalide'),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_', 'STRIPE_SECRET_KEY invalide (commence par sk_test_ ou sk_live_)'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_', 'STRIPE_WEBHOOK_SECRET invalide'),
  STRIPE_PRICE_ID: z.string().startsWith('price_', 'STRIPE_PRICE_ID invalide'),
  SUPABASE_URL: z.string().url('SUPABASE_URL doit être une URL valide'),
  SUPABASE_SERVICE_KEY: z.string().min(1, 'SUPABASE_SERVICE_KEY est requis'),
  WEB_URL: z.string().url('WEB_URL doit être une URL valide'),
  API_URL: z.string().url().optional(),
  RESEND_API_KEY: z.string().startsWith('re_', 'RESEND_API_KEY invalide').optional(),
  EMAIL_FROM: z.string().email('EMAIL_FROM doit être un email valide').optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

let _env: Env | undefined

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    console.error('\n❌ Variables d\'environnement manquantes ou invalides :')
    for (const [field, messages] of Object.entries(result.error.flatten().fieldErrors)) {
      console.error(`   ${field}: ${(messages as string[]).join(', ')}`)
    }
    console.error('\nCorrigez apps/api/.env puis relancez le serveur.\n')
    process.exit(1)
  }
  _env = result.data
  return _env
}

export function getEnv(): Env {
  if (!_env) return validateEnv()
  return _env
}
