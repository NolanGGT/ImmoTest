import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

interface BienSummary {
  id: string
  isFavorite: boolean
  [key: string]: unknown
}

export function useFavoriteToggle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      api.patch(`/api/biens/${id}`, { isFavorite }),

    onMutate: async ({ id, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: ['biens'] })
      const previous = queryClient.getQueryData<BienSummary[]>(['biens'])
      queryClient.setQueryData<BienSummary[]>(['biens'], (old) =>
        old?.map((b) => b.id === id ? { ...b, isFavorite } : b) ?? []
      )
      return { previous }
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['biens'], context.previous)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['biens'] })
    },
  })
}
