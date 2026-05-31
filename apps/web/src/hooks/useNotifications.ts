import { useNotificationsStore } from '@/stores/notifications.store'

export function useNotifications() {
  const notifications = useNotificationsStore((s) => s.notifications)
  const add = useNotificationsStore((s) => s.add)
  const markRead = useNotificationsStore((s) => s.markRead)
  const markAllRead = useNotificationsStore((s) => s.markAllRead)
  const clear = useNotificationsStore((s) => s.clear)
  const unreadCount = notifications.filter((n) => !n.read).length

  return { notifications, unreadCount, add, markRead, markAllRead, clear }
}
