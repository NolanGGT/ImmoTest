import { circle, union, booleanPointInPolygon, featureCollection } from '@turf/turf'
import type { Feature, Polygon, MultiPolygon, Point } from 'geojson'
import type { PersonalPoint } from './mapUtils'

export function computeComfortZone(
  points: PersonalPoint[]
): Feature<Polygon | MultiPolygon> | null {
  const active = points.filter((p) => p.radiusKm > 0)
  if (active.length === 0) return null

  const circles = active.map((p) =>
    circle([p.longitude, p.latitude], p.radiusKm, { steps: 64, units: 'kilometers' })
  )

  if (circles.length === 1) return circles[0]

  return union(featureCollection(circles))
}

export function isPointInZone(
  lat: number,
  lon: number,
  zone: Feature<Polygon | MultiPolygon> | null
): boolean {
  if (!zone) return false
  const pt: Feature<Point> = {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lon, lat] },
    properties: {},
  }
  return booleanPointInPolygon(pt, zone)
}
