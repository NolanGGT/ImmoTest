'use client'

import { useState, useEffect, useRef } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { makeQueryClient } from '@/lib/queryClient'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAuthStore } from '@/stores/auth.store'
import api from '@/lib/api'

function AuthInitializer({ onReady }: { onReady: () => void }) {
  const { setAuth, clearAuth, accessToken } = useAuthStore()
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    if (accessToken) {
      onReady()
      return
    }

    api.post('/api/auth/refresh')
      .then((res) => { setAuth(res.data.user, res.data.accessToken) })
      .catch(() => { clearAuth() })
      .finally(() => { onReady() })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient())
  const [authReady, setAuthReady] = useState(false)

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          <AuthInitializer onReady={() => setAuthReady(true)} />
          {authReady ? children : null}
          <Toaster position="bottom-center" richColors />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
