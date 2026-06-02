import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'

export type SortOption = 'recent' | 'score' | 'prix_asc' | 'prix_desc'

export interface BienSummary {
  id: string
  userId: string | null
  titre: string | null
  ville: string
  typeBien: string
  prix: number
  surface: number
  scoreImmoSafe: number | null
  isFavorite: boolean
  statut: string
  createdAt: string
  latitude: number | null
  longitude: number | null
  annonceRetiree: boolean
  votes: Array<{ userId: string; vote: string; comment: string | null }>
}

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

interface BiensResponse {
  biens: BienSummary[]
  pagination: Pagination
  meta: { isGuestView: boolean; ownerEmail: string | null }
}

async function fetchBiens(opts: {
  search?: string
  page?: number
  limit?: number
  sort?: SortOption
}): Promise<BiensResponse> {
  const params = new URLSearchParams()
  if (opts.search) params.set('search', opts.search)
  if (opts.page) params.set('page', String(opts.page))
  if (opts.limit) params.set('limit', String(opts.limit))
  if (opts.sort) params.set('sort', opts.sort)
  const { data } = await api.get(`/api/biens?${params.toString()}`)
  return data
}

export function useBiens(
  opts: { search?: string; page?: number; limit?: number; sort?: SortOption } = {}
) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery<BiensResponse>({
    queryKey: ['biens', opts.search ?? '', opts.page ?? 1, opts.limit ?? 12, opts.sort ?? 'score'],
    queryFn: () => fetchBiens(opts),
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
  })
}
