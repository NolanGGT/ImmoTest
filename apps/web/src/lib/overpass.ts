export interface OverpassNode {
  id: number
  lat: number
  lon: number
  tags: Record<string, string>
}

const overpassCache = new Map<string, OverpassNode[]>()

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

export async function fetchOverpassData(
  layerQuery: string,
  centerLat: number,
  centerLon: number,
  radiusMeters = 1000
): Promise<OverpassNode[]> {
  const cacheKey = `${layerQuery.slice(0, 20)}:${centerLat.toFixed(2)}:${centerLon.toFixed(2)}`
  if (overpassCache.has(cacheKey)) {
    return overpassCache.get(cacheKey)!
  }

  // Support multi-line queries: each `node[...]` line gets its own (around:...) wrapper
  const statements = layerQuery
    .split('\n')
    .map((s) => s.trim().replace(/;$/, ''))
    .filter((s) => s.startsWith('node['))
    .map((s) => `${s}(around:${radiusMeters},${centerLat},${centerLon})`)
    .join(';')

  const query = `[out:json][timeout:15];(${statements};);out body;`

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: query,
        signal: AbortSignal.timeout(8000),
      })

      if (!response.ok) continue

      const data = await response.json()
      const nodes: OverpassNode[] = data.elements || []

      overpassCache.set(cacheKey, nodes)
      setTimeout(() => overpassCache.delete(cacheKey), 3_600_000)

      return nodes
    } catch {
      console.warn(`Overpass endpoint ${endpoint} indisponible, essai suivant…`)
      continue
    }
  }

  console.warn('Tous les endpoints Overpass ont échoué')
  return []
}

export async function fetchRisques(lat: number, lon: number): Promise<boolean> {
  try {
    const response = await fetch(
      `https://georisques.gouv.fr/api/v1/gaspar/azi?latlon=${lon},${lat}&rayon=100`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!response.ok) return false
    const data = await response.json()
    return (data.total_count ?? 0) > 0
  } catch {
    return false
  }
}
