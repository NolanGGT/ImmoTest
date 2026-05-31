import { buildPersonalPointsGeoJSON } from '../mapUtils'
import type { PersonalPoint } from '../mapUtils'

describe('buildPersonalPointsGeoJSON', () => {
  it('génère une feature pour chaque point', () => {
    const points: PersonalPoint[] = [
      {
        id: 'p1',
        label: 'Mon bureau',
        latitude: 48.85,
        longitude: 2.35,
        color: '#7c3aed',
        userId: 'u1',
        createdAt: '',
        radiusKm: 0,
      },
    ]
    const result = buildPersonalPointsGeoJSON(points)
    expect(result.type).toBe('FeatureCollection')
    expect(result.features).toHaveLength(1)
    expect(result.features[0].properties?.label).toBe('Mon bureau')
    expect(result.features[0].properties?.color).toBe('#7c3aed')
    expect(result.features[0].properties?.id).toBe('p1')
    expect((result.features[0].geometry as GeoJSON.Point).coordinates).toEqual([2.35, 48.85])
  })

  it('retourne FeatureCollection vide si pas de points', () => {
    const result = buildPersonalPointsGeoJSON([])
    expect(result.type).toBe('FeatureCollection')
    expect(result.features).toHaveLength(0)
  })

  it('place longitude avant latitude dans les coordonnées GeoJSON', () => {
    const points: PersonalPoint[] = [
      {
        id: 'p2',
        label: 'Test',
        latitude: 43.2965,
        longitude: 5.3698,
        color: '#dc2626',
        userId: 'u1',
        createdAt: '',
        radiusKm: 0,
      },
    ]
    const result = buildPersonalPointsGeoJSON(points)
    const coords = (result.features[0].geometry as GeoJSON.Point).coordinates
    expect(coords[0]).toBe(5.3698)
    expect(coords[1]).toBe(43.2965)
  })

  it('génère des features pour plusieurs points', () => {
    const points: PersonalPoint[] = [
      { id: 'p1', label: 'A', latitude: 48.85, longitude: 2.35, color: '#7c3aed', userId: 'u1', createdAt: '', radiusKm: 0 },
      { id: 'p2', label: 'B', latitude: 45.75, longitude: 4.85, color: '#16a34a', userId: 'u1', createdAt: '', radiusKm: 0 },
      { id: 'p3', label: 'C', latitude: 43.30, longitude: 5.37, color: '#dc2626', userId: 'u1', createdAt: '', radiusKm: 0 },
    ]
    const result = buildPersonalPointsGeoJSON(points)
    expect(result.features).toHaveLength(3)
    expect(result.features.map((f) => f.properties?.label)).toEqual(['A', 'B', 'C'])
  })
})
