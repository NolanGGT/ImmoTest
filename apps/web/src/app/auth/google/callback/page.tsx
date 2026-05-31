'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'

function GoogleCallbackContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  useEffect(() => {
    const token = searchParams.get('token')
    const error = searchParams.get('error')

    if (error || !token) {
      router.replace('/login?error=google_failed')
      return
    }

    try {
      // Decode JWT payload (trusted — issued by our own API just now)
      const payloadB64 = token.split('.')[1]
      const payload = JSON.parse(
        atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
      ) as { id: string; email: string; role?: 'USER' | 'ADMIN'; twoFactorVerified?: boolean }

      setAuth(
        { id: payload.id, email: payload.email, role: payload.role ?? 'USER', twoFactorVerified: payload.twoFactorVerified ?? false },
        token
      )
      // Replace URL so the token isn't visible in browser history
      router.replace('/analyser')
    } catch {
      router.replace('/login?error=google_failed')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
      <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
      <p className="text-sm text-muted-foreground">Connexion en cours…</p>
    </div>
  )
}

export default function GoogleCallbackPage() {
  return (
    <Suspense>
      <GoogleCallbackContent />
    </Suspense>
  )
}
