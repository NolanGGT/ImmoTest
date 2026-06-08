import { LAYERS } from './map'
import type { OverpassNode } from './overpass'

export interface BienMapData {
  id: string
  ville: string
  adresse?: string
  prix: number
  surface: number
  typeBien: string
  scoreImmoSafe: number
  latitude: number
  longitude: number
  statut: string
  isFavorite: boolean
  snapshotPhotos: string[]
}

export interface PersonalPoint {
  id: string
  userId: string
  label: string
  latitude: number
  longitude: number
  color: string
  radiusKm: number
  createdAt: string
}

export interface NearestPoint {
  layerId: string
  name: string
  distance: number
  minutes: number
  emoji: string
}

function toFirstPhoto(raw: unknown): string | null {
  let photos: unknown = raw
  if (typeof photos === 'string') {
    try { photos = JSON.parse(photos) } catch { return null }
  }
  if (Array.isArray(photos) && typeof photos[0] === 'string') return photos[0]
  return null
}

export function buildGeoJSON(
  biens: BienMapData[],
  personalPoints: PersonalPoint[] = [],
  bienRisques: Record<string, boolean> = {}
): GeoJSON.FeatureCollection {
  console.log('[GEOJSON] bien.snapshotPhotos:', biens[0]?.snapshotPhotos)
  biens.forEach(b => {
    if (!b.latitude || !b.longitude) {
      console.warn('[GEOJSON] bien sans coordonnées:', b.id, b.ville, b.adresse)
    }
  })
  const bienFeatures = biens
    .filter((b) => b.latitude && b.longitude)
    .map((b) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [b.longitude, b.latitude] },
      properties: {
        type: 'bien',
        id: b.id,
        score: b.scoreImmoSafe,
        scoreLabel: String(b.scoreImmoSafe),
        ville: b.ville,
        prix: b.prix,
        surface: b.surface,
        typeBien: b.typeBien,
        statut: b.statut,
        isFavorite: b.isFavorite,
        atRisk: bienRisques[b.id] ?? false,
        photo: toFirstPhoto(b.snapshotPhotos),
      },
    }))

  const personalFeatures = personalPoints.map((p) => ({
    type: 'Feature' as const,
    id: `personal-${p.id}`,
    geometry: { type: 'Point' as const, coordinates: [p.longitude, p.latitude] },
    properties: { type: 'personal', id: p.id, label: p.label, color: p.color },
  }))

  const features = [...bienFeatures, ...personalFeatures]

  const seen = new Map()
  features.forEach(f => {
    const key = `${f.geometry.coordinates[0].toFixed(4)}_${f.geometry.coordinates[1].toFixed(4)}`
    const count = seen.get(key) || 0
    seen.set(key, count + 1)
    if (count > 0) {
      f.geometry.coordinates[0] += (Math.random() - 0.5) * 0.0006
      f.geometry.coordinates[1] += (Math.random() - 0.5) * 0.0006
    }
  })

  return {
    type: 'FeatureCollection',
    features,
  }
}

export function buildPersonalPointsGeoJSON(points: PersonalPoint[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: points.map((p) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [p.longitude, p.latitude],
      },
      properties: { id: p.id, label: p.label, color: p.color },
    })),
  }
}

export function distanceMetres(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export function minutesAPied(metres: number): number {
  return Math.round(metres / 83)
}

export function findNearestPoints(
  bienLat: number,
  bienLon: number,
  layerData: Partial<Record<string, OverpassNode[]>>,
  activeLayers: Set<string>,
  maxDistance = 1000
): NearestPoint[] {
  const results: NearestPoint[] = []

  for (const layerId of activeLayers) {
    if (layerId === 'risques') continue
    const nodes = layerData[layerId] ?? []
    if (nodes.length === 0) continue

    let nearest: OverpassNode | null = null
    let nearestDist = Infinity

    for (const node of nodes) {
      const dist = distanceMetres(bienLat, bienLon, node.lat, node.lon)
      if (dist < nearestDist && dist <= maxDistance) {
        nearestDist = dist
        nearest = node
      }
    }

    if (nearest) {
      const config = LAYERS.find((l) => l.id === layerId)
      results.push({
        layerId,
        name: nearest.tags.name || nearest.tags.operator || config?.label || layerId,
        distance: Math.round(nearestDist),
        minutes: minutesAPied(nearestDist),
        emoji: config?.emoji ?? '📍',
      })
    }
  }

  return results.sort((a, b) => a.distance - b.distance).slice(0, 4)
}
