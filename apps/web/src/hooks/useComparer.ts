'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'
import type { AnalyseResult } from '@immosafe/shared-types'

export interface BienComplet {
  id: string
  ville: string
  typeBien: string
  prix: number
  surface: number
  scoreImmoSafe: number | null
  prixM2Bien: number | null
  prixM2Marche: number | null
  dpe: string | null
  charges: number | null
  anneeConstruction: number | null
  statut: string
  isFavorite: boolean
  analyse: AnalyseResult | null
}

export function useComparer(ids: string[]) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: ['biens', 'comparer', ids.join(',')],
    queryFn: async () => {
      const response = await api.get<{ biens: BienComplet[] }>(
        `/api/biens/comparer?ids=${ids.join(',')}`
      )
      return response.data.biens
    },
    enabled: isAuthenticated && ids.length >= 2 && ids.length <= 4,
    staleTime: 5 * 60 * 1000,
  })
}
