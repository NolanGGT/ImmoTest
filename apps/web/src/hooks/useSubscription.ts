'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import api from '@/lib/api'

interface SubscriptionStatus {
  isActive: boolean
  currentPeriodEnd?: string
  daysRemaining?: number
}

export function useSubscription() {
  const queryClient = useQueryClient()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const statusQuery = useQuery<SubscriptionStatus>({
    queryKey: ['subscription'],
    queryFn: async () => {
      const response = await api.get<SubscriptionStatus>('/api/subscription/status')
      return response.data
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  })

  const createCheckoutMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<{ checkoutUrl: string }>('/api/subscription/create-checkout')
      return response.data
    },
    onSuccess: ({ checkoutUrl }) => {
      window.location.href = checkoutUrl
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/api/subscription/cancel')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
    },
  })

  return {
    isActive: statusQuery.data?.isActive ?? false,
    currentPeriodEnd: statusQuery.data?.currentPeriodEnd,
    daysRemaining: statusQuery.data?.daysRemaining,
    isLoading: statusQuery.isLoading,
    createCheckout: createCheckoutMutation.mutate,
    isCreatingCheckout: createCheckoutMutation.isPending,
    checkoutError: createCheckoutMutation.error,
    cancel: cancelMutation.mutate,
    isCancelling: cancelMutation.isPending,
  }
}
