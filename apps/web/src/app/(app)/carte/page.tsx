'use client'

import Link from 'next/link'
import { List } from 'lucide-react'
import { useBiens } from '@/hooks/useBiens'
import { MapWrapper } from '@/components/map/MapWrapper'
import { EmptyMapState } from '@/components/map/EmptyMapState'
import type { BienMapData } from '@/components/map/ImmoSafeMap'

export default function CartePage() {
  const { data, isLoading } = useBiens({ limit: 100 })

  const allBiens = data?.biens ?? []

  const biensAvecCoords = allBiens.filter(
    (b): b is typeof b & { latitude: number; longitude: number } =>
      b.latitude !== null && b.longitude !== null && b.scoreImmoSafe !== null
  ) as BienMapData[]

  const biensSansCoords = allBiens.filter((b) => !b.latitude || !b.longitude)

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background flex-shrink-0">
        <div>
          <h1 className="font-semibold text-base">Carte de mes biens</h1>
          {!isLoading && (
            <p className="text-xs text-muted-foreground">
              {biensAvecCoords.length} bien{biensAvecCoords.length !== 1 ? 's' : ''} localisé{biensAvecCoords.length !== 1 ? 's' : ''}
              {biensSansCoords.length > 0 && (
                <span className="ml-2 text-amber-600">
                  · {biensSansCoords.length} sans localisation
                </span>
              )}
            </p>
          )}
        </div>
        {biensAvecCoords.length > 0 && (
          <Link
            href="/biens"
            className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
          >
            <List size={12} />
            Vue liste
          </Link>
        )}
      </div>

      {/* Map — full space, no padding */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {isLoading ? (
          <div className="w-full h-full bg-muted animate-pulse" />
        ) : biensAvecCoords.length === 0 ? (
          <EmptyMapState />
        ) : (
          <MapWrapper biens={biensAvecCoords} />
        )}
      </div>

      {biensSansCoords.length > 0 && !isLoading && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 flex-shrink-0">
          <p className="text-xs text-amber-600">
            ⚠️ {biensSansCoords.length} bien{biensSansCoords.length !== 1 ? 's' : ''} non affiché{biensSansCoords.length !== 1 ? 's' : ''} — adresse manquante lors de l'analyse
          </p>
        </div>
      )}
    </div>
  )
}
