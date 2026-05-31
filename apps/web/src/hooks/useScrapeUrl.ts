'use client'

import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import type { ScrapingResult } from '@immosafe/shared-types'

export function useScrapeUrl() {
  return useMutation<ScrapingResult, Error, string>({
    mutationFn: async (url: string) => {
      const response = await api.post<ScrapingResult>('/api/biens/scrape', { url })
      return response.data
    },
  })
}
