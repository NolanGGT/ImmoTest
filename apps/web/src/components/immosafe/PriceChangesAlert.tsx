'use client'

import { useRouter } from 'next/navigation'
import { X, TrendingDown, TrendingUp, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { formatPrix } from '@/lib/score'
import type { PriceChange } from '@/hooks/usePriceChanges'

interface Props {
  changes: PriceChange[]
  onDismiss: () => void
  onRelancerAnalyse: (bienId: string) => void
}

function variationClass(pct: number, major: boolean): string {
  if (!major) return 'bg-muted text-muted-foreground'
  return pct > 0 ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400' : 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400'
}

function variationLabel(pct: number): string {
  return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`
}

export function PriceChangesAlert({ changes, onDismiss, onRelancerAnalyse }: Props) {
  const router = useRouter()

  const handleRelancer = (bienId: string) => {
    onDismiss()
    onRelancerAnalyse(bienId)
    toast('Analyse relancée avec le nouveau prix', {
      description: 'Vous recevrez une notification quand elle sera prête.',
    })
  }

  const handleRelancerAll = () => {
    onDismiss()
    changes.forEach((c) => onRelancerAnalyse(c.bien.id))
    toast(`${changes.length} analyses relancées`, {
      description: 'Vous recevrez des notifications quand elles seront prêtes.',
    })
  }

  if (changes.length === 1) {
    const c = changes[0]
    const hausse = c.pourcentage > 0
    const major = Math.abs(c.pourcentage) >= 2
    const label = c.bien.titre || `${c.bien.typeBien.charAt(0) + c.bien.typeBien.slice(1).toLowerCase()} · ${c.bien.ville}`

    return (
      <div className="mx-4 md:mx-auto md:max-w-5xl mb-4">
        <div className="bg-card border border-border rounded-2xl shadow-md p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {hausse
                ? <TrendingUp size={15} className="text-red-500 shrink-0" />
                : <TrendingDown size={15} className="text-green-500 shrink-0" />}
              <span className="font-semibold text-sm">Changement de prix détecté</span>
            </div>
            <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground transition-colors ml-2">
              <X size={15} />
            </button>
          </div>

          <p className="text-sm font-medium text-foreground truncate mb-1">{label}</p>
          <div className="flex items-center gap-2 text-sm mb-4">
            <span className="text-muted-foreground">{formatPrix(c.ancienPrix)}</span>
            <span className="text-muted-foreground/60">→</span>
            <span className={`font-medium ${hausse ? 'text-red-600' : 'text-green-600'}`}>
              {formatPrix(c.nouveauPrix)}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${variationClass(c.pourcentage, major)}`}>
              {variationLabel(c.pourcentage)}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => { onDismiss(); router.push(`/biens/${c.bien.id}`) }}
              className="flex-1 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              Voir l'analyse
            </button>
            <button
              onClick={() => handleRelancer(c.bien.id)}
              className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={12} />
              Relancer l'analyse
            </button>
            <button
              onClick={onDismiss}
              className="py-1.5 px-3 text-xs font-medium rounded-lg border border-border hover:bg-muted/50 transition-colors text-muted-foreground"
            >
              Ignorer
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Multiple changes
  return (
    <div className="mx-4 md:mx-auto md:max-w-5xl mb-4">
      <div className="bg-card border border-border rounded-2xl shadow-md p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingDown size={15} className="text-indigo-500 shrink-0" />
            <span className="font-semibold text-sm">{changes.length} changements de prix détectés</span>
          </div>
          <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground transition-colors ml-2">
            <X size={15} />
          </button>
        </div>

        <div className="space-y-1.5 mb-4">
          {changes.map((c) => {
            const hausse = c.pourcentage > 0
            const major = Math.abs(c.pourcentage) >= 2
            const label = c.bien.titre || `${c.bien.typeBien.charAt(0) + c.bien.typeBien.slice(1).toLowerCase()} · ${c.bien.ville}`
            return (
              <div key={c.id} className="flex items-center gap-2 text-xs">
                <span className="text-foreground/80 truncate flex-1 min-w-0">{label}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-muted-foreground">
                    {formatPrix(c.ancienPrix)} → {formatPrix(c.nouveauPrix)}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded font-medium ${variationClass(c.pourcentage, major)}`}>
                    {variationLabel(c.pourcentage)} {hausse ? '📈' : '📉'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { onDismiss(); router.push('/biens') }}
            className="flex-1 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted/50 transition-colors"
          >
            Voir tous les changements
          </button>
          <button
            onClick={handleRelancerAll}
            className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <RefreshCw size={12} />
            Relancer toutes
          </button>
        </div>
      </div>
    </div>
  )
}
