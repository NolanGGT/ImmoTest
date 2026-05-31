'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/hooks/useNotifications'
import type { AppNotification } from '@/stores/notifications.store'

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  return `il y a ${Math.floor(hours / 24)}j`
}

function NotificationItem({
  n,
  onNavigate,
}: {
  n: AppNotification
  onNavigate: (bienId: string) => void
}) {
  return (
    <button
      onClick={() => n.bienId && onNavigate(n.bienId)}
      disabled={!n.bienId}
      className={cn(
        'w-full text-left px-4 py-3 border-b last:border-b-0 transition-colors text-sm',
        n.bienId ? 'hover:bg-accent cursor-pointer' : 'cursor-default',
        !n.read && 'bg-indigo-50/60 dark:bg-indigo-950/20'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span
            className={cn(
              'font-medium block',
              n.type === 'ANALYSE_FAILED' ? 'text-destructive' : 'text-foreground'
            )}
          >
            {n.type === 'ANALYSE_COMPLETE' ? 'Analyse terminée' : 'Analyse échouée'}
          </span>
          <p className="text-muted-foreground mt-0.5 truncate">
            {n.ville}
            {n.scoreImmoSafe !== undefined && (
              <span className="ml-1 text-indigo-600 font-medium">· Score {n.scoreImmoSafe}</span>
            )}
          </p>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
          {formatRelativeTime(n.createdAt)}
        </span>
      </div>
    </button>
  )
}

interface NotificationBellProps {
  placement?: 'down' | 'up'
}

export function NotificationBell({ placement = 'down' }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-mark-read 2s after opening
  useEffect(() => {
    if (!open || unreadCount === 0) return
    const timer = setTimeout(() => markAllRead(), 2000)
    return () => clearTimeout(timer)
  }, [open, unreadCount, markAllRead])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleNavigate(bienId: string) {
    markRead(notifications.find((n) => n.bienId === bienId)?.id ?? '')
    setOpen(false)
    router.push(`/biens/${bienId}`)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute right-0 w-80 rounded-xl border bg-popover shadow-lg z-50 overflow-hidden ${
            placement === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm font-semibold">Notifications</span>
            {notifications.length > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Tout marquer lu
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-sm text-center text-muted-foreground">
                Aucune notification
              </p>
            ) : (
              notifications.map((n) => (
                <NotificationItem key={n.id} n={n} onNavigate={handleNavigate} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
