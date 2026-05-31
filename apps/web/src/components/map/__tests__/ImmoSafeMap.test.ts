import { describe, it, expect } from 'vitest'
import { buildGeoJSON, type BienMapData } from '@/lib/mapUtils'

const makeBien = (overrides: Partial<BienMapData> = {}): BienMapData => ({
  id: 'b1',
  ville: 'Paris',
  prix: 300000,
  surface: 50,
  typeBien: 'Appartement',
  scoreImmoSafe: 75,
  latitude: 48.8566,
  longitude: 2.3522,
  statut: 'EN_COURS',
  isFavorite: false,
  ...overrides,
})

describe('buildGeoJSON', () => {
  it('returns a FeatureCollection', () => {
    const result = buildGeoJSON([makeBien()])
    expect(result.type).toBe('FeatureCollection')
    expect(Array.isArray(result.features)).toBe(true)
  })

  it('filters out biens with missing coordinates', () => {
    const biens = [
      makeBien({ id: 'ok', latitude: 48.8566, longitude: 2.3522 }),
      makeBien({ id: 'no-lat', latitude: 0, longitude: 2.3522 }),
      makeBien({ id: 'no-lng', latitude: 48.8566, longitude: 0 }),
    ]
    const result = buildGeoJSON(biens)
    expect(result.features).toHaveLength(1)
    expect(result.features[0].properties?.id).toBe('ok')
  })

  it('includes score in feature properties', () => {
    const result = buildGeoJSON([makeBien({ scoreImmoSafe: 82 })])
    expect(result.features[0].properties?.score).toBe(82)
    expect(result.features[0].properties?.scoreLabel).toBe('82')
  })

  it('propagates isFavorite', () => {
    const result = buildGeoJSON([makeBien({ isFavorite: true })])
    expect(result.features[0].properties?.isFavorite).toBe(true)
  })

  it('stores coordinates as [longitude, latitude] (GeoJSON order)', () => {
    const result = buildGeoJSON([makeBien({ latitude: 48.8566, longitude: 2.3522 })])
    const coords = result.features[0].geometry.coordinates as number[]
    expect(coords[0]).toBe(2.3522)  // longitude first
    expect(coords[1]).toBe(48.8566) // latitude second
  })

  it('returns empty features array for empty input', () => {
    const result = buildGeoJSON([])
    expect(result.features).toHaveLength(0)
  })

  it('sets atRisk from bienRisques map', () => {
    const biens = [makeBien({ id: 'risky' }), makeBien({ id: 'safe' })]
    const result = buildGeoJSON(biens, [], { risky: true })
    const risky = result.features.find((f) => f.properties?.id === 'risky')
    const safe = result.features.find((f) => f.properties?.id === 'safe')
    expect(risky?.properties?.atRisk).toBe(true)
    expect(safe?.properties?.atRisk).toBe(false)
  })

  it('marks bien features with type=bien', () => {
    const result = buildGeoJSON([makeBien()])
    expect(result.features[0].properties?.type).toBe('bien')
  })

  it('includes personal points with type=personal', () => {
    const point = { id: 'p1', label: 'Travail', latitude: 48.85, longitude: 2.35, color: '#7c3aed', radiusKm: 0, userId: 'u1', createdAt: '' }
    const result = buildGeoJSON([], [point])
    expect(result.features).toHaveLength(1)
    expect(result.features[0].properties?.type).toBe('personal')
    expect(result.features[0].properties?.id).toBe('p1')
  })

  it('combines biens and personal points in same collection', () => {
    const point = { id: 'p1', label: 'Travail', latitude: 48.85, longitude: 2.35, color: '#7c3aed', radiusKm: 0, userId: 'u1', createdAt: '' }
    const result = buildGeoJSON([makeBien()], [point])
    expect(result.features).toHaveLength(2)
    expect(result.features.some((f) => f.properties?.type === 'bien')).toBe(true)
    expect(result.features.some((f) => f.properties?.type === 'personal')).toBe(true)
  })
})
