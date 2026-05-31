'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Search, Building2, User, LogOut, Map } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { useSubscription } from '@/hooks/useSubscription'
import { useAuth } from '@/hooks/useAuth'
import { usePriceChanges } from '@/hooks/usePriceChanges'
import { NotificationBell } from '@/components/immosafe/NotificationBell'
import { PriceChangesAlert } from '@/components/immosafe/PriceChangesAlert'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

const desktopNavLinks = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/analyser', label: 'Analyser', icon: Search },
  { href: '/biens', label: 'Mes biens', icon: Building2 },
  { href: '/carte', label: 'Carte', icon: Map },
]

const mobileNavLinks = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/analyser', label: 'Analyser', icon: Search },
  { href: '/carte', label: 'Carte', icon: Map },
  { href: '/biens', label: 'Mes biens', icon: Building2 },
  { href: '/profil', label: 'Profil', icon: User },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false)
  const [showPriceAlert, setShowPriceAlert] = useState(false)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const router = useRouter()
  const pathname = usePathname()
  const { logout } = useAuth()
  const { isActive, isLoading: isLoadingSub } = useSubscription()
  const { changes, hasChanges, markAsSeen } = usePriceChanges()

  const relancerMutation = useMutation({
    mutationFn: (bienId: string) => api.post(`/api/biens/${bienId}/relancer`),
  })

  // The carte page manages its own height and needs no container/padding
  const isCartePage = pathname === '/carte'

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMounted && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isMounted, isAuthenticated, router])

  useEffect(() => {
    if (!hasChanges) return
    const timer = setTimeout(() => setShowPriceAlert(true), 2000)
    return () => clearTimeout(timer)
  }, [hasChanges])

  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-3 w-full max-w-sm px-4">
          <div className="h-8 bg-muted animate-pulse rounded-md" />
          <div className="h-4 bg-muted animate-pulse rounded-md w-3/4" />
          <div className="h-4 bg-muted animate-pulse rounded-md w-1/2" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop top navbar — h-14 = 56px */}
      <header className="hidden md:block border-b bg-background sticky top-0 z-50">
        <div className="container max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg tracking-tight">
            ImmoSafe
          </Link>

          <nav className="flex items-center gap-1">
            {desktopNavLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm transition-colors',
                  pathname === href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {!isLoadingSub && (
              isActive ? (
                <span className="text-xs text-green-600 font-medium">✅ Accès actif</span>
              ) : (
                <Link href="/profil" className="text-xs text-muted-foreground hover:text-foreground">
                  Passer premium
                </Link>
              )
            )}
            <ThemeToggle />
            <NotificationBell />
            <button
              onClick={() => logout()}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Se déconnecter"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Price change alert */}
      {showPriceAlert && changes.length > 0 && (
        <div className="sticky top-14 z-40 pt-3">
          <PriceChangesAlert
            changes={changes}
            onDismiss={() => {
              setShowPriceAlert(false)
              markAsSeen()
            }}
            onRelancerAnalyse={(bienId) => relancerMutation.mutate(bienId)}
          />
        </div>
      )}

      {/* Page content */}
      <main
        className={
          isCartePage
            ? 'overflow-hidden'
            : 'container max-w-5xl mx-auto px-4 py-6 pb-24 md:pb-6'
        }
      >
        {children}
      </main>

      {/* Mobile bottom navbar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-background border-t z-50">
        <div className="flex items-stretch h-16">
          {mobileNavLinks.map(({ href, label, icon: Icon }) => {
            const isActivePath = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 text-xs transition-colors',
                  isActivePath
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon size={20} strokeWidth={isActivePath ? 2.5 : 1.5} />
                <span className={isActivePath ? 'font-medium' : ''}>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
