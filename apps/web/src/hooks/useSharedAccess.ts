import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'

export interface SharedAccessRecord {
  id: string
  guestEmail: string
  status: 'PENDING' | 'ACTIVE' | 'REVOKED'
  createdAt: string
  guest: { email: string } | null
}

export interface ReceivedAccess {
  id: string
  ownerId: string
  status: 'ACTIVE'
  owner: { email: string }
}

interface SharedAccessData {
  owned: SharedAccessRecord[]
  received: ReceivedAccess | null
}

export function useSharedAccess() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery<SharedAccessData>({
    queryKey: ['shared-access'],
    queryFn: async () => {
      const { data } = await api.get('/api/shared-access')
      return data
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  })
}

export function useInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (email: string) => {
      const { data } = await api.post('/api/shared-access/invite', { email })
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shared-access'] }),
  })
}

export function useRevokeAccess() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/shared-access/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shared-access'] }),
  })
}
