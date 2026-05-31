'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus, Search, Map, GitCompare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BienCard } from '@/components/immosafe/BienCard'
import { useBiens, type SortOption } from '@/hooks/useBiens'
import { useDebounce } from '@/hooks/useDebounce'
import { useFavoriteToggle } from '@/hooks/useFavoriteToggle'
import { useDeleteBien } from '@/hooks/useDeleteBien'

const STATUTS = [
  { value: '', label: 'Tous' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'VISITE_PLANIFIEE', label: 'Visite' },
  { value: 'OFFRE_FAITE', label: 'Offre' },
  { value: 'ABANDONNE', label: 'Abandonné' },
]

const LIMIT = 12
const MAX_COMPARE = 4

export default function BiensPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentPage = parseInt(searchParams.get('page') ?? '1', 10)

  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const debouncedSearch = useDebounce(searchInput, 300)

  // Compare mode
  const [compareMode, setCompareMode] = useState(
    () => searchParams.get('compareMode') === 'true'
  )
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(() => {
    const preselect = searchParams.get('preselect')
    return preselect ? new Set([preselect]) : new Set()
  })

  const [sort, setSort] = useState<SortOption>('score')

  const { data, isLoading } = useBiens({
    search: debouncedSearch || undefined,
    page: currentPage,
    limit: LIMIT,
    sort,
  })

  const favoriteToggle = useFavoriteToggle()
  const deleteBien = useDeleteBien()

  // Reset to page 1 when search changes
  useEffect(() => {
    if (debouncedSearch !== (searchParams.get('search') ?? '')) {
      const params = new URLSearchParams(searchParams.toString())
      if (debouncedSearch) {
        params.set('search', debouncedSearch)
      } else {
        params.delete('search')
      }
      params.set('page', '1')
      router.replace(`/biens?${params.toString()}`)
    }
  }, [debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(page))
    router.push(`/biens?${params.toString()}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleCompare = (id: string) => {
    setSelectedForCompare((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < MAX_COMPARE) {
        next.add(id)
      }
      return next
    })
  }

  const exitCompareMode = () => {
    setCompareMode(false)
    setSelectedForCompare(new Set())
  }

  const biens = data?.biens ?? []
  const pagination = data?.pagination

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Mes biens</h1>
        <div className="flex items-center gap-2">
          {compareMode ? (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedForCompare.size}/{MAX_COMPARE} sélectionnés
              </span>
              <Button variant="ghost" size="sm" onClick={exitCompareMode}>
                Annuler
              </Button>
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={selectedForCompare.size < 2}
                onClick={() => {
                  const ids = Array.from(selectedForCompare).join(',')
                  router.push(`/biens/comparer?ids=${ids}`)
                }}
              >
                Comparer {selectedForCompare.size > 0 ? selectedForCompare.size : ''} biens →
              </Button>
            </>
          ) : (
            <>
              {data && data.biens.some((b) => b.latitude && b.longitude) && (
                <Button size="sm" variant="outline" asChild>
                  <Link href="/carte"><Map size={14} className="mr-1" />Carte</Link>
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setCompareMode(true)}>
                <GitCompare size={14} className="mr-1.5" />
                Comparer
              </Button>
              <Button size="sm" asChild className="bg-indigo-600 hover:bg-indigo-700">
                <Link href="/analyser"><Plus size={14} className="mr-1" />Analyser</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher par ville..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {STATUTS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString())
              if (value) {
                params.set('statut', value)
              } else {
                params.delete('statut')
              }
              params.set('page', '1')
              router.replace(`/biens?${params.toString()}`)
            }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              (searchParams.get('statut') ?? '') === value
                ? 'bg-indigo-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="text-xs rounded-lg border border-border bg-background px-2 py-1 text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
          >
            <option value="score">Meilleur score</option>
            <option value="recent">Plus récent</option>
            <option value="prix_asc">Prix croissant</option>
            <option value="prix_desc">Prix décroissant</option>
          </select>
          {pagination && (
            <span className="text-xs text-muted-foreground">
              {pagination.total} bien{pagination.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {compareMode && (
        <p className="text-sm text-muted-foreground bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-lg px-3 py-2">
          Sélectionnez 2 à {MAX_COMPARE} biens à comparer.
        </p>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: LIMIT }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : biens.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🏡</p>
          <p className="font-medium">Aucun bien trouvé</p>
          <p className="text-sm text-muted-foreground mt-1">
            {debouncedSearch
              ? `Aucun résultat pour "${debouncedSearch}".`
              : 'Commencez par analyser un bien.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {biens.map((bien, i) => (
            <motion.div
              key={bien.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <BienCard
                bien={bien}
                onFavoriteToggle={!compareMode ? (id, current) => favoriteToggle.mutate({ id, isFavorite: !current }) : undefined}
                onDelete={!compareMode ? () => deleteBien.mutate(bien.id) : undefined}
                compareMode={compareMode}
                isSelectedForCompare={selectedForCompare.has(bien.id)}
                onToggleCompare={() => toggleCompare(bien.id)}
                compareMaxReached={selectedForCompare.size >= MAX_COMPARE}
              />
            </motion.div>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2 pb-6">
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.hasPrevPage}
            onClick={() => goToPage(currentPage - 1)}
          >
            Précédent
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                  page === currentPage
                    ? 'bg-indigo-600 text-white'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.hasNextPage}
            onClick={() => goToPage(currentPage + 1)}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  )
}
