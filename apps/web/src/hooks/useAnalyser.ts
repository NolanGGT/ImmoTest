import { useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import type { MutateOptions } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAnalyseStore } from '@/stores/analyse.store'
import { useNotificationsStore } from '@/stores/notifications.store'
import type { BienFormulaire } from '@immosafe/shared-types'

interface AnalyseResponse {
  bienId: string
  scoreImmoSafe: number
  analyse: import('@immosafe/shared-types').AnalyseResult
}

type CustomMutateOptions = { background?: boolean } & MutateOptions<
  AnalyseResponse,
  unknown,
  BienFormulaire
>

export function useAnalyser(onFreeAnalysisUsed: () => void) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const setResult = useAnalyseStore((s) => s.setResult)
  const addNotification = useNotificationsStore((s) => s.add)
  const isBackgroundRef = useRef(false)

  const mutation = useMutation<AnalyseResponse, unknown, BienFormulaire>({
    mutationFn: async (input) => {
      const deviceId =
        typeof window !== 'undefined'
          ? (localStorage.getItem('device_id') ??
            (() => {
              const id = crypto.randomUUID()
              localStorage.setItem('device_id', id)
              return id
            })())
          : undefined
      const { data } = await api.post('/api/biens/analyser', input, {
        headers: deviceId ? { 'x-device-id': deviceId } : {},
      })
      return data
    },

    onSuccess: (data, variables) => {
      console.log('[useAnalyser] onSuccess déclenché', { bienId: data.bienId, scoreImmoSafe: data.scoreImmoSafe, isBackground: isBackgroundRef.current })
      localStorage.setItem('immosafe_has_analysed', '1')
      queryClient.invalidateQueries({ queryKey: ['biens'] })

      if (isBackgroundRef.current) {
        addNotification({
          type: 'ANALYSE_COMPLETE',
          bienId: data.bienId,
          ville: variables.ville,
          scoreImmoSafe: data.scoreImmoSafe,
        })
      } else {
        console.log('[useAnalyser] setResult avec bienId:', data.bienId)
        setResult(data.bienId, data.analyse, {
          id: data.bienId,
          prix: variables.prix,
          surface: variables.surface,
          typeBien: variables.typeBien,
          ville: variables.ville,
          scoreImmoSafe: data.scoreImmoSafe,
        })
        console.log('[useAnalyser] router.push vers /biens/' + data.bienId)
        router.push(`/biens/${data.bienId}`)
      }
    },

    onError: (err: unknown, variables: BienFormulaire) => {
      const axiosErr = err as { response?: { data?: { error?: { code?: string } } } }
      if (axiosErr?.response?.data?.error?.code === 'FREE_ANALYSIS_USED') {
        onFreeAnalysisUsed()
      }
      if (isBackgroundRef.current) {
        addNotification({
          type: 'ANALYSE_FAILED',
          ville: variables.ville,
          message: axiosErr?.response?.data?.error?.code,
        })
      }
    },
  })

  const { mutate: _mutate, ...rest } = mutation

  function mutate(data: BienFormulaire, opts?: CustomMutateOptions) {
    const { background, ...mutateOpts } = opts ?? {}
    isBackgroundRef.current = background ?? false
    _mutate(data, mutateOpts)
  }

  return { ...rest, mutate }
}
