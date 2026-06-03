import { useMemo } from 'react'
import type { LayerType } from '@/lib/map'
import type { OverpassNode } from '@/lib/overpass'
import { calculateScoreLocalisation } from '@/lib/map'

interface BienWithCoords {
  id: string
  latitude: number
  longitude: number
}

export function useScoreLocalisation(
  biens: BienWithCoords[],
  layerData: Partial<Record<LayerType, OverpassNode[]>>,
  lieuTravail?: { lat: number; lon: number },
  bienRisques?: Record<string, boolean>
): Record<string, number> {
  return useMemo(() => {
    const scores: Record<string, number> = {}

    for (const bien of biens) {
      if (!bien.latitude || !bien.longitude) continue

      const countNearby = (nodes: OverpassNode[], radius: number) =>
        (nodes ?? []).filter((n) => {
          const dlat = n.lat - bien.latitude
          const dlon = n.lon - bien.longitude
          const dist = Math.sqrt(dlat * dlat + dlon * dlon) * 111_000
          return dist <= radius
        }).length

      const distanceTravail = lieuTravail
        ? Math.sqrt(
            Math.pow(lieuTravail.lat - bien.latitude, 2) +
              Math.pow(lieuTravail.lon - bien.longitude, 2)
          ) * 111
        : undefined

      const transports = [
        ...(layerData.metro ?? []),
        ...(layerData.bus ?? []),
        ...(layerData.gare ?? []),
      ]

      scores[bien.id] = calculateScoreLocalisation({
        distanceTravailKm: distanceTravail,
        nbTransports: countNearby(transports, 500),
        nbCommerces: countNearby(layerData.supermarche ?? [], 500),
        nbEcoles: countNearby(layerData.ecole ?? [], 800),
        hasRisques: bienRisques?.[bien.id] ?? false,
      })
    }

    return scores
  }, [biens, layerData, lieuTravail, bienRisques])
}
