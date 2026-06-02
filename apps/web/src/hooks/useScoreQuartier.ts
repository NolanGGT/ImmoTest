import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { ScoreQuartier } from '@immosafe/shared-types'

export function useScoreQuartier(bienId: string, hasCoords: boolean) {
  return useQuery<ScoreQuartier>({
    queryKey: ['quartier', bienId],
    queryFn: async () => {
      const res = await api.get<ScoreQuartier>(`/api/biens/${bienId}/quartier`)
      return res.data
    },
    enabled: !!bienId && hasCoords,
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  })
}
