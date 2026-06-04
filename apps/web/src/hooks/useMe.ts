'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import api from '@/lib/api'

interface UserProfile {
  id: string
  email: string
  role: string
  createdAt: string
}

export function useMe() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  return useQuery<UserProfile>({
    queryKey: ['me'],
    queryFn: async () => (await api.get<UserProfile>('/api/auth/me')).data,
    enabled: isAuthenticated,
    staleTime: 300_000,
  })
}
