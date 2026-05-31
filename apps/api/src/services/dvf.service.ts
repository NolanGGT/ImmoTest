import { httpClient } from '../lib/httpClient'
import { logger } from '../lib/logger'
import { dvfCache } from '../lib/cache'

type TypeBien = 'APPARTEMENT' | 'MAISON' | 'STUDIO'

export interface GeocodingResult {
  lat: number
  lon: number
}

export interface DvfData {
  prixM2MoyenQuartier: number
  prixM2Min: number
  prixM2Max: number
  nbTransactions: number
  transactionsRecentes: Array<{ prix: number; surface: number; date: string }>
}

function getCutoffDate(): Date {
  const d = new Date()
  d.setMonth(d.getMonth() - 24)
  return d
}

function percentile(arr: number[], p: number): number {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)]
}

function typeToLocalTypes(typeBien: TypeBien): string[] {
  if (typeBien === 'MAISON') return ['Maison', 'Maison de village']
  return ['Appartement'] // APPARTEMENT + STUDIO
}

function filterTransactions(
  features: unknown[],
  surface: number,
  typeBien: TypeBien
): Array<{ prixM2: number; prix: number; surface: number; date: Date }> {
  const cutoff = getCutoffDate()
  const localTypes = typeToLocalTypes(typeBien)
  const surfMin = surface * 0.7
  const surfMax = surface * 1.3

  return (features as Array<{ properties: Record<string, unknown> }>)
    .map((f) => f.properties)
    .filter((p) => {
      if (!p.date_mutation || !p.valeur_fonciere || !p.surface_reelle_bati) return false
      if (Number(p.valeur_fonciere) <= 0) return false
      if (!localTypes.includes(String(p.type_local))) return false
      if (new Date(String(p.date_mutation)) < cutoff) return false
      const surf = Number(p.surface_reelle_bati)
      return surf >= surfMin && surf <= surfMax
    })
    .map((p) => ({
      prixM2: Number(p.valeur_fonciere) / Number(p.surface_reelle_bati),
      prix: Number(p.valeur_fonciere),
      surface: Number(p.surface_reelle_bati),
      date: new Date(String(p.date_mutation)),
    }))
}

async function fetchRaw(lat: number, lon: number, dist: number): Promise<unknown[]> {
  const response = await httpClient.get('https://api.cquest.org/dvf', {
    params: { lat, lon, dist, nature_mutation: 'Vente' },
  })
  return (response.data?.features as unknown[]) ?? []
}

export async function geocoder(
  adresse: string,
  ville: string,
  codePostal: string
): Promise<GeocodingResult> {
  const q = `${adresse} ${ville} ${codePostal}`
  const response = await httpClient.get('https://api-adresse.data.gouv.fr/search/', {
    params: { q, limit: 1 },
  })

  const features = response.data?.features as Array<{
    geometry: { coordinates: [number, number] }
  }>

  if (!features?.length) {
    throw new Error('Adresse introuvable, vérifiez la ville et le code postal')
  }

  const [lon, lat] = features[0].geometry.coordinates
  return { lat, lon }
}

export async function getTransactions(
  lat: number,
  lon: number,
  surface: number,
  typeBien: TypeBien
): Promise<DvfData | null> {
  // Round coords to ~100m precision so nearby biens share a cache entry
  const cacheKey = `dvf:${lat.toFixed(3)}:${lon.toFixed(3)}:${typeBien}`
  const cached = dvfCache.get<DvfData>(cacheKey)
  if (cached) {
    logger.info({ cacheKey }, 'DVF cache hit')
    return cached
  }

  let features = await fetchRaw(lat, lon, 500)
  let filtered = filterTransactions(features, surface, typeBien)

  if (filtered.length === 0) {
    logger.info({ lat, lon }, 'DVF 500m vide, élargissement à 1000m')
    features = await fetchRaw(lat, lon, 1000)
    filtered = filterTransactions(features, surface, typeBien)
  }

  if (filtered.length === 0) {
    dvfCache.set(cacheKey, null as unknown as DvfData)
    return null
  }

  const prixM2s = filtered.map((t) => t.prixM2)
  const sorted = [...filtered].sort((a, b) => b.date.getTime() - a.date.getTime())

  const result: DvfData = {
    prixM2MoyenQuartier: Math.round(prixM2s.reduce((a, b) => a + b, 0) / prixM2s.length),
    prixM2Min: Math.round(percentile(prixM2s, 10)),
    prixM2Max: Math.round(percentile(prixM2s, 90)),
    nbTransactions: filtered.length,
    transactionsRecentes: sorted.slice(0, 5).map((t) => ({
      prix: Math.round(t.prix),
      surface: Math.round(t.surface),
      date: t.date.toISOString().split('T')[0],
    })),
  }
  dvfCache.set(cacheKey, result)
  return result
}
