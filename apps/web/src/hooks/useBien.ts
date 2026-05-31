import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'

async function fetchBien(id: string) {
  const { data } = await api.get(`/api/biens/${id}`)
  return data
}

export function useBien(id: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: ['biens', id],
    queryFn: () => fetchBien(id),
    enabled: isAuthenticated && !!id,
    staleTime: 60_000,
  })
}
