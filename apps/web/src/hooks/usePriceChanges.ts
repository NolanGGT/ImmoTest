'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'

export interface PriceChange {
  id: string
  ancienPrix: number
  nouveauPrix: number
  pourcentage: number
  createdAt: string
  bien: {
    id: string
    titre: string | null
    ville: string
    surface: number
    typeBien: string
  }
}

export function usePriceChanges() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const queryClient = useQueryClient()
  const [enabled, setEnabled] = useState(false)

  // Delay the first fetch by 5s to let the backend price check job run
  useEffect(() => {
    if (!isAuthenticated) { setEnabled(false); return }
    const timer = setTimeout(() => setEnabled(true), 5000)
    return () => clearTimeout(timer)
  }, [isAuthenticated])

  const { data } = useQuery({
    queryKey: ['price-changes'],
    queryFn: async () => {
      const res = await api.get<{ changes: PriceChange[] }>('/api/biens/price-changes')
      return res.data.changes
    },
    enabled,
    refetchInterval: false,
    staleTime: 0,
  })

  const markAsSeen = useMutation({
    mutationFn: () => api.post('/api/biens/price-changes/seen'),
    onSuccess: () => queryClient.setQueryData(['price-changes'], []),
  })

  return {
    changes: data ?? [],
    hasChanges: (data?.length ?? 0) > 0,
    markAsSeen: markAsSeen.mutate,
  }
}
