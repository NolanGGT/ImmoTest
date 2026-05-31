import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/lib/api'
import type { PersonalPoint } from '@/lib/mapUtils'

export function usePersonalPoints() {
  const queryClient = useQueryClient()

  const { data: points = [] } = useQuery({
    queryKey: ['personal-points'],
    queryFn: async () => {
      const res = await api.get('/api/personal-points')
      return res.data as PersonalPoint[]
    },
    staleTime: 5 * 60 * 1000,
  })

  const addPoint = useMutation({
    mutationFn: (data: Omit<PersonalPoint, 'id' | 'userId' | 'createdAt'>) =>
      api.post('/api/personal-points', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-points'] })
      toast.success('Point ajouté')
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { code?: string } } } }
      if (err.response?.data?.error?.code === 'MAX_POINTS_REACHED') {
        toast.error('Maximum 10 points atteint. Supprimez-en un pour en ajouter.')
      } else {
        toast.error("Impossible d'ajouter ce point")
      }
    },
  })

  const updatePoint = useMutation({
    mutationFn: ({ id, radiusKm }: { id: string; radiusKm: number }) =>
      api.patch(`/api/personal-points/${id}`, { radiusKm }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-points'] })
    },
    onError: () => {
      toast.error('Impossible de modifier ce point')
    },
  })

  const deletePoint = useMutation({
    mutationFn: (id: string) => api.delete(`/api/personal-points/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-points'] })
      toast.success('Point supprimé')
    },
    onError: () => {
      toast.error('Impossible de supprimer ce point')
    },
  })

  return {
    points,
    addPoint,
    updatePoint,
    deletePoint,
    canAdd: points.length < 10,
  }
}
