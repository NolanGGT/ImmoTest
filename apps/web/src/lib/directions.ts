// eslint-disable-next-line @typescript-eslint/no-require-imports
const MapboxDirections = require('@mapbox/mapbox-sdk/services/directions')

const directionsClient = MapboxDirections({
  accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '',
})

export type TravelMode = 'walking' | 'cycling' | 'driving'

export interface RouteResult {
  distance: number
  duration: number
  geometry: GeoJSON.Geometry
}

export async function getRoute(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
  mode: TravelMode
): Promise<RouteResult | null> {
  try {
    const response = await directionsClient
      .getDirections({
        profile: mode,
        waypoints: [
          { coordinates: [from.lon, from.lat] },
          { coordinates: [to.lon, to.lat] },
        ],
        geometries: 'geojson',
        overview: 'full',
      })
      .send()

    const route = response.body.routes?.[0]
    if (!route) return null

    return {
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry,
    }
  } catch (error) {
    console.error('Directions API error:', error)
    return null
  }
}

export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)} m`
  return `${(metres / 1000).toFixed(1)} km`
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `< 1 min`
  const min = Math.round(seconds / 60)
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`
}
