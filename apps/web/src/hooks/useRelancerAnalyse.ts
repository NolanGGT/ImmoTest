import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useNotificationsStore } from '@/stores/notifications.store'

async function relancerAnalyse(bienId: string) {
  const { data } = await api.post(`/api/biens/${bienId}/relancer`)
  return data as { bienId: string; scoreImmoSafe: number }
}

export function useRelancerAnalyse(bienId: string, ville: string) {
  const queryClient = useQueryClient()
  const addNotif = useNotificationsStore((s) => s.add)

  return useMutation({
    mutationFn: () => relancerAnalyse(bienId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['biens', bienId] })
      addNotif({
        type: 'ANALYSE_COMPLETE',
        bienId,
        ville,
        scoreImmoSafe: result.scoreImmoSafe,
        message: 'Analyse mise à jour avec les dernières données du marché.',
      })
    },
    onError: (err: { response?: { data?: { error?: { code?: string } } } }) => {
      const code = err.response?.data?.error?.code
      addNotif({
        type: 'ANALYSE_FAILED',
        bienId,
        ville,
        message:
          code === 'TOO_EARLY'
            ? 'Attendez 24h avant de relancer cette analyse.'
            : 'Erreur lors du relancement. Réessayez plus tard.',
      })
    },
  })
}
