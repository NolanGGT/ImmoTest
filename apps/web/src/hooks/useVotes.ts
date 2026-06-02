import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface BienVoteRecord {
  id: string
  bienId: string
  userId: string
  vote: 'LOVE' | 'LIKE' | 'DISLIKE'
  comment: string | null
  user: { email: string }
}

interface VotesResponse {
  votes: BienVoteRecord[]
  partner: { userId: string; email: string } | null
}

export function useVotes(bienId: string, enabled = true) {
  return useQuery<VotesResponse>({
    queryKey: ['votes', bienId],
    queryFn: async () => {
      const { data } = await api.get(`/api/biens/${bienId}/votes`)
      return data
    },
    enabled: !!bienId && enabled,
    staleTime: 30_000,
  })
}

export function useSubmitVote(bienId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { vote: 'LOVE' | 'LIKE' | 'DISLIKE'; comment?: string }) => {
      const { data } = await api.post(`/api/biens/${bienId}/vote`, payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['votes', bienId] }),
  })
}
