export const ZOOM_THRESHOLDS = {
  CLUSTERS_DISSOLVE: 10,
  LABELS_APPEAR: 13,
  STREET_LEVEL: 15,
} as const

export interface MapStyle {
  id: string
  label: string
  url: string
  preview: string
}

export const MAP_STYLES: MapStyle[] = [
  { id: 'streets',   label: 'Rues',      url: 'mapbox://styles/mapbox/streets-v12',           preview: '#e8e0d5' },
  { id: 'light',     label: 'Clair',     url: 'mapbox://styles/mapbox/light-v11',              preview: '#f5f5f0' },
  { id: 'dark',      label: 'Sombre',    url: 'mapbox://styles/mapbox/dark-v11',               preview: '#1a1a2e' },
  { id: 'satellite', label: 'Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12',  preview: '#2d4a2d' },
]

export function getMarkerColor(score: number): string {
  if (score >= 70) return '#22c55e'
  if (score >= 40) return '#f97316'
  return '#ef4444'
}

export function getMarkerSize(score: number): number {
  if (score >= 70) return 44
  if (score >= 40) return 38
  return 34
}

export type LayerType =
  | 'metro'
  | 'bus'
  | 'gare'
  | 'supermarche'
  | 'ecole'
  | 'universite'
  | 'parc'
  | 'pharmacie'
  | 'risques'

export interface LayerConfig {
  id: LayerType
  label: string
  emoji: string
  color: string
  overpassQuery: string
}

export const LAYERS: LayerConfig[] = [
  {
    id: 'metro',
    label: 'Métro & Tram',
    emoji: '🚇',
    color: '#3b82f6',
    overpassQuery: `node["railway"~"station|tram_stop"]["public_transport"="stop_position"]
node["station"="subway"]`,
  },
  {
    id: 'bus',
    label: 'Bus',
    emoji: '🚌',
    color: '#06b6d4',
    overpassQuery: 'node["highway"="bus_stop"]',
  },
  {
    id: 'gare',
    label: 'Gares',
    emoji: '🚆',
    color: '#8b5cf6',
    overpassQuery: 'node["railway"="station"]["public_transport"!="stop_position"]',
  },
  {
    id: 'supermarche',
    label: 'Supermarchés',
    emoji: '🛒',
    color: '#f59e0b',
    overpassQuery: 'node["shop"~"supermarket|convenience"]',
  },
  {
    id: 'ecole',
    label: 'Écoles',
    emoji: '🏫',
    color: '#10b981',
    overpassQuery: 'node["amenity"~"school|kindergarten"]',
  },
  {
    id: 'universite',
    label: 'Universités',
    emoji: '🎓',
    color: '#6366f1',
    overpassQuery: 'node["amenity"~"university|college"]',
  },
  {
    id: 'parc',
    label: 'Parcs',
    emoji: '🌳',
    color: '#22c55e',
    overpassQuery: 'node["leisure"~"park|garden"]',
  },
  {
    id: 'pharmacie',
    label: 'Pharmacies',
    emoji: '💊',
    color: '#ef4444',
    overpassQuery: 'node["amenity"="pharmacy"]',
  },
  {
    id: 'risques',
    label: 'Zones à risque',
    emoji: '⚠️',
    color: '#dc2626',
    overpassQuery: '',
  },
]

export const LAYER_GROUPS: { label: string; icon: string; layers: LayerType[] }[] = [
  { label: 'Transports', icon: '🚌', layers: ['metro', 'bus', 'gare'] },
  { label: 'Commodités', icon: '🏪', layers: ['supermarche', 'ecole', 'universite', 'parc', 'pharmacie'] },
  { label: 'Risques', icon: '⚠️', layers: ['risques'] },
]

export function calculateScoreLocalisation(params: {
  distanceTravailKm?: number
  nbTransports: number
  nbCommerces: number
  nbEcoles: number
  hasRisques: boolean
}): number {
  let score = 0

  if (params.distanceTravailKm !== undefined) {
    if (params.distanceTravailKm < 2) score += 35
    else if (params.distanceTravailKm < 5) score += 25
    else if (params.distanceTravailKm < 10) score += 15
    else if (params.distanceTravailKm < 20) score += 8
    else score += 2
  } else {
    score += 17
  }

  score += Math.min(params.nbTransports * 8, 25)
  score += Math.min(params.nbCommerces * 5, 20)
  score += Math.min(params.nbEcoles * 5, 15)
  if (params.hasRisques) score -= 15

  return Math.max(0, Math.min(100, Math.round(score)))
}
