'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Star, Trash2 } from 'lucide-react'
import { ScoreGauge } from './ScoreGauge'
import { formatPrix } from '@/lib/score'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STATUT_LABELS: Record<string, string> = {
  EN_COURS: 'En cours',
  VISITE_PLANIFIEE: 'Visite planifiée',
  OFFRE_FAITE: 'Offre faite',
  ABANDONNE: 'Abandonné',
}
const STATUT_VARIANT: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline'> = {
  EN_COURS: 'outline',
  VISITE_PLANIFIEE: 'warning',
  OFFRE_FAITE: 'success',
  ABANDONNE: 'secondary',
}

interface BienSummary {
  id: string
  titre: string | null
  ville: string
  typeBien: string
  prix: number
  surface: number
  scoreImmoSafe: number | null
  isFavorite: boolean
  statut: string
  createdAt: string
}

interface Props {
  bien: BienSummary
  onFavoriteToggle?: (id: string, current: boolean) => void
  onDelete?: () => void
  compareMode?: boolean
  isSelectedForCompare?: boolean
  onToggleCompare?: () => void
  compareMaxReached?: boolean
}

export function BienCard({
  bien,
  onFavoriteToggle,
  onDelete,
  compareMode,
  isSelectedForCompare,
  onToggleCompare,
  compareMaxReached,
}: Props) {
  const { id, titre, ville, typeBien, prix, surface, scoreImmoSafe, isFavorite, statut } = bien
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const isDisabled = compareMode && compareMaxReached && !isSelectedForCompare

  const inner = (
    <div
      className={cn(
        'rounded-xl border bg-card p-4 hover:shadow-md transition-all flex items-start gap-3',
        compareMode && isSelectedForCompare && 'ring-2 ring-indigo-500 border-indigo-300',
        isDisabled && 'opacity-40'
      )}
    >
      {compareMode && (
        <div className="shrink-0 mt-0.5">
          <div
            className={cn(
              'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
              isSelectedForCompare ? 'bg-indigo-600 border-indigo-600' : 'border-border bg-background'
            )}
          >
            {isSelectedForCompare && (
              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                <path
                  d="M1 4l3 3 5-6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        </div>
      )}

      {scoreImmoSafe != null ? (
        <ScoreGauge score={scoreImmoSafe} size="sm" animate={false} />
      ) : (
        <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate text-sm">
              {titre || `${
                typeBien === 'APPARTEMENT' ? 'Appartement' :
                typeBien === 'MAISON' ? 'Maison' : 'Studio'
              } · ${ville}`}
            </p>
            <p className="text-xs text-muted-foreground">{formatPrix(prix)} · {surface} m²</p>
          </div>
          {!compareMode && (
            <button
              onClick={(e) => { e.preventDefault(); onFavoriteToggle?.(id, isFavorite) }}
              className={cn(
                'p-1 rounded transition-colors shrink-0',
                isFavorite ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'
              )}
            >
              <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <Badge variant={STATUT_VARIANT[statut] ?? 'outline'} className="text-[10px]">
            {STATUT_LABELS[statut] ?? statut}
          </Badge>
        </div>
      </div>
    </div>
  )

  return (
    <div className="relative group">
      {compareMode ? (
        <button
          type="button"
          className={cn('w-full text-left', isDisabled ? 'cursor-not-allowed' : 'cursor-pointer')}
          onClick={() => { if (!isDisabled) onToggleCompare?.() }}
        >
          {inner}
        </button>
      ) : (
        <Link href={`/biens/${id}`} className="block">
          {inner}
        </Link>
      )}

      {/* Delete — only in normal mode */}
      {onDelete && !compareMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            setShowDeleteConfirm(true)
          }}
          title="Supprimer ce bien"
          className="absolute bottom-3 right-3 p-1.5 text-muted-foreground/40 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={14} />
        </button>
      )}

      {showDeleteConfirm && (
        <div
          className="absolute inset-0 bg-card/95 rounded-xl flex flex-col items-center justify-center gap-3 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-medium text-foreground">Supprimer ce bien ?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-1.5 text-sm rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => { onDelete?.(); setShowDeleteConfirm(false) }}
              className="px-4 py-1.5 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
