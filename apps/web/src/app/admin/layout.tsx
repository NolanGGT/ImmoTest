'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { BarChart2, Users, ClipboardList, DollarSign, ArrowLeft, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/admin', label: 'Vue d\'ensemble', icon: BarChart2, exact: true },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users, exact: false },
  { href: '/admin/logs', label: 'Audit logs', icon: ClipboardList, exact: false },
  { href: '/admin/tokens', label: 'Tokens & coûts', icon: DollarSign, exact: false },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated } = useAuthStore()

  useEffect(() => setIsMounted(true), [])

  useEffect(() => {
    if (!isMounted) return
    if (!isAuthenticated || user?.role !== 'ADMIN') {
      router.replace('/login')
      return
    }
    if (!user.twoFactorVerified && pathname !== '/admin/setup-2fa') {
      router.replace('/admin/setup-2fa')
    }
  }, [isMounted, isAuthenticated, user, pathname, router])

  if (!isMounted || !isAuthenticated || user?.role !== 'ADMIN') return null
  if (!user.twoFactorVerified && pathname !== '/admin/setup-2fa') return null

  if (pathname === '/admin/setup-2fa') {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r bg-background flex flex-col sticky top-0 h-screen">
        <div className="px-4 py-4 border-b">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-indigo-600" />
            <span className="font-bold text-sm">ImmoSafe Admin</span>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-2 py-3 border-t">
          <Link
            href="/analyser"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            Retour à l&apos;app
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}
