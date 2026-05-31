import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/lib/api'

export function useDeleteBien() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (bienId: string) => api.delete(`/api/biens/${bienId}`),

    onSuccess: (_, bienId) => {
      queryClient.invalidateQueries({ queryKey: ['biens'] })
      queryClient.removeQueries({ queryKey: ['biens', bienId] })
      toast.success('Bien supprimé')
    },

    onError: () => {
      toast.error('Impossible de supprimer ce bien')
    },
  })
}
