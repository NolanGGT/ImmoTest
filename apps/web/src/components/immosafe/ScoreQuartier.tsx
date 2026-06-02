'use client'

import { MapPin } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useScoreQuartier } from '@/hooks/useScoreQuartier'

interface Props {
  bienId: string
  hasCoords: boolean
}

export function ScoreQuartierSection({ bienId, hasCoords }: Props) {
  const { data, isLoading } = useScoreQuartier(bienId, hasCoords)

  if (!hasCoords) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={16} className="text-gray-400" />
          <h3 className="font-semibold text-sm">Qualité du quartier</h3>
        </div>
        <p className="text-sm text-muted-foreground pl-6">
          Adresse GPS requise pour calculer le score de quartier.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-7 w-32 rounded-full" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    )
  }

  if (!data || !data.dataDisponible) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={16} className="text-gray-400" />
          <h3 className="font-semibold text-sm">Qualité du quartier</h3>
        </div>
        <p className="text-sm text-muted-foreground pl-6">
          Données indisponibles pour cette commune.
        </p>
      </div>
    )
  }

  const scoreColor =
    data.scoreGlobal >= 75 ? 'bg-green-500' :
    data.scoreGlobal >= 55 ? 'bg-blue-500' :
    data.scoreGlobal >= 35 ? 'bg-orange-500' : 'bg-red-500'

  const badgeColor =
    data.scoreGlobal >= 75
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : data.scoreGlobal >= 55
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      : data.scoreGlobal >= 35
      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Qualité du quartier</h3>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${badgeColor}`}>
          {data.label}
          <span className="text-xs font-normal opacity-70">{data.scoreGlobal}/100</span>
        </div>
      </div>

      <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
        <div
          className={`h-full rounded-full transition-all duration-700 ${scoreColor}`}
          style={{ width: `${data.scoreGlobal}%` }}
        />
      </div>

      <div className="space-y-3">
        {data.revenuMedian !== null && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">💰</span>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Revenus médians</p>
                <p className="text-xs text-gray-500">
                  {data.revenuMedian.toLocaleString('fr-FR')} €/an par unité de consommation
                </p>
              </div>
            </div>
            <div className="text-right shrink-0 ml-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{data.revenuNiveau}</p>
              {data.revenuVsNationale !== null && (
                <p className={`text-xs ${data.revenuVsNationale >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {data.revenuVsNationale >= 0 ? '+' : ''}{data.revenuVsNationale}% vs France
                </p>
              )}
            </div>
          </div>
        )}

        {data.tauxCambriolages !== null && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🔒</span>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Cambriolages</p>
                <p className="text-xs text-gray-500">
                  {data.tauxCambriolages.toFixed(1)} pour 1 000 habitants
                </p>
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 shrink-0 ml-2">
              {data.securiteNiveau}
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        Source : {data.sourceDate}
      </p>
    </div>
  )
}
