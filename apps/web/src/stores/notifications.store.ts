import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AppNotification {
  id: string
  type: 'ANALYSE_COMPLETE' | 'ANALYSE_FAILED'
  bienId?: string
  ville: string
  scoreImmoSafe?: number
  message?: string
  read: boolean
  createdAt: number
}

interface NotificationsState {
  notifications: AppNotification[]
  add: (n: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => void
  markRead: (id: string) => void
  markAllRead: () => void
  clear: () => void
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      notifications: [],
      add: (n) => {
        const newNotif: AppNotification = {
          ...n,
          id: crypto.randomUUID(),
          read: false,
          createdAt: Date.now(),
        }
        set((state) => ({
          notifications: [newNotif, ...state.notifications].slice(0, 20),
        }))
      },
      markRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),
      clear: () => set({ notifications: [] }),
    }),
    { name: 'immosafe-notifications' }
  )
)
