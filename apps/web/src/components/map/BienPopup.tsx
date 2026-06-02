'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X, ArrowRight, Trash2, MapPin, Navigation, ChevronDown, Loader2 } from 'lucide-react'
import { useScoreQuartier } from '@/hooks/useScoreQuartier'
import { Badge } from '@/components/ui/badge'
import { formatPrix, getScoreConfig } from '@/lib/score'
import {
  distanceMetres,
  minutesAPied,
  findNearestPoints,
  type PersonalPoint,
} from '@/lib/mapUtils'
import { getRoute, formatDistance as fmtDist, formatDuration, type TravelMode, type RouteResult } from '@/lib/directions'
import type { OverpassNode } from '@/lib/overpass'
import type { LayerType } from '@/lib/map'

const STATUT_LABELS: Record<string, string> = {
  EN_COURS: 'En cours',
  VISITE_PLANIFIEE: 'Visite planifiée',
  OFFRE_FAITE: 'Offre faite',
  ABANDONNE: 'Abandonné',
}

const STATUT_VARIANT: Record<
  string,
  'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline'
> = {
  EN_COURS: 'outline',
  VISITE_PLANIFIEE: 'warning',
  OFFRE_FAITE: 'success',
  ABANDONNE: 'secondary',
}

interface BienMapData {
  id: string
  ville: string
  prix: number
  surface: number
  typeBien: string
  scoreImmoSafe: number
  latitude: number
  longitude: number
  statut: string
  isFavorite: boolean
}

interface BienPopupProps {
  bien: BienMapData
  layerData: Partial<Record<LayerType, OverpassNode[]>>
  activeLayers: Set<LayerType>
  personalPoints: PersonalPoint[]
  onClose: () => void
  onDelete: () => void
  onRouteCalculated?: (geometry: GeoJSON.Geometry) => void
  onRouteClear?: () => void
}

function formatProxDist(m: number): string {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`
}

interface AddrSuggestion { label: string; lat: number; lon: number }

export function BienPopup({
  bien,
  layerData,
  activeLayers,
  personalPoints,
  onClose,
  onDelete,
  onRouteCalculated,
  onRouteClear,
}: BienPopupProps) {
  const { data: scoreQuartier } = useScoreQuartier(bien.id, !!(bien.latitude && bien.longitude))

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showItinerary, setShowItinerary] = useState(false)
  const [itineraryMode, setItineraryMode] = useState<TravelMode>('walking')
  const [itineraryFrom, setItineraryFrom] = useState('')
  const [itinerarySuggestions, setItinerarySuggestions] = useState<AddrSuggestion[]>([])
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const router = useRouter()
  const scoreConfig = getScoreConfig(bien.scoreImmoSafe)

  const nearestPoints = useMemo(() => {
    if (!bien.latitude || !bien.longitude) return []
    return findNearestPoints(
      bien.latitude,
      bien.longitude,
      layerData as Record<string, OverpassNode[]>,
      activeLayers as Set<string>
    )
  }, [bien, layerData, activeLayers])

  const personalPointsWithDist = useMemo(() => {
    if (!bien.latitude || !bien.longitude || !personalPoints.length) return []
    return personalPoints
      .map((p) => {
        const dist = distanceMetres(bien.latitude, bien.longitude, p.latitude, p.longitude)
        return { point: p, distance: Math.round(dist), minutes: minutesAPied(dist) }
      })
      .sort((a, b) => a.distance - b.distance)
  }, [bien, personalPoints])

  const hasProximity = nearestPoints.length > 0 || personalPointsWithDist.length > 0

  const fetchItinerarySuggestions = useCallback(async (q: string) => {
    if (q.length < 3) { setItinerarySuggestions([]); return }
    try {
      const res = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5`
      )
      const data = await res.json() as {
        features?: { properties: { label: string }; geometry: { coordinates: [number, number] } }[]
      }
      setItinerarySuggestions(
        (data.features ?? []).map((f) => ({
          label: f.properties.label,
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
        }))
      )
    } catch {
      setItinerarySuggestions([])
    }
  }, [])

  const handleItineraryInputChange = (value: string) => {
    setItineraryFrom(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchItinerarySuggestions(value), 300)
  }

  const calculateRoute = async (fromCoords: { lat: number; lon: number }) => {
    if (!bien.latitude || !bien.longitude) return
    setIsCalculating(true)
    const route = await getRoute(fromCoords, { lat: bien.latitude, lon: bien.longitude }, itineraryMode)
    setActiveRoute(route)
    setIsCalculating(false)
    if (route) onRouteCalculated?.(route.geometry)
  }

  const handleClearRoute = () => {
    setActiveRoute(null)
    setItineraryFrom('')
    setItinerarySuggestions([])
    onRouteClear?.()
  }

  const transitUrl = `https://www.google.com/maps/dir/?api=1&destination=${bien.latitude},${bien.longitude}&travelmode=transit`

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 w-72 overflow-hidden">

      {/* Header */}
      <div className="px-4 pt-3 pb-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
              {bien.typeBien} · {bien.ville}
            </p>
            {bien.surface > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{bien.surface} m²</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
            aria-label="Fermer"
          >
            <X size={14} className="text-gray-400 dark:text-gray-500" />
          </button>
        </div>
      </div>

      {/* Score */}
      <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Score ImmoSafe</span>
          <span className={`text-sm font-bold ${scoreConfig.color}`}>
            {bien.scoreImmoSafe}/100
          </span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${bien.scoreImmoSafe}%`,
              backgroundColor:
                bien.scoreImmoSafe >= 70
                  ? '#22c55e'
                  : bien.scoreImmoSafe >= 40
                  ? '#f97316'
                  : '#ef4444',
            }}
          />
        </div>
      </div>

      {/* Prix + Statut */}
      <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatPrix(bien.prix)}</p>
        <div className="mt-1">
          <Badge variant={STATUT_VARIANT[bien.statut] ?? 'outline'} className="text-[10px]">
            {STATUT_LABELS[bien.statut] ?? bien.statut}
          </Badge>
        </div>
      </div>

      {/* Score quartier */}
      {scoreQuartier?.dataDisponible && (
        <div className="flex items-center justify-between text-xs px-4 py-2 border-b border-gray-100 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <MapPin size={10} />
            Quartier
          </span>
          <span className={`font-medium ${
            scoreQuartier.scoreGlobal >= 75 ? 'text-green-600 dark:text-green-400' :
            scoreQuartier.scoreGlobal >= 55 ? 'text-blue-600 dark:text-blue-400' :
            scoreQuartier.scoreGlobal >= 35 ? 'text-orange-500 dark:text-orange-400' :
            'text-red-500 dark:text-red-400'
          }`}>
            {scoreQuartier.label} · {scoreQuartier.scoreGlobal}/100
          </span>
        </div>
      )}

      {/* Proximité */}
      {hasProximity && (
        <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            À proximité
          </p>
          <div className="space-y-1.5">
            {nearestPoints.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1 min-w-0 mr-2">
                  <span className="flex-shrink-0">{p.emoji}</span>
                  <span className="truncate">{p.name}</span>
                </span>
                <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">
                  {formatProxDist(p.distance)} · {p.minutes} min
                </span>
              </div>
            ))}

            {personalPointsWithDist.map(({ point, distance, minutes }) => (
              <div key={point.id} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 min-w-0 mr-2" style={{ color: point.color }}>
                  <span className="flex-shrink-0">📌</span>
                  <span className="truncate">{point.label}</span>
                </span>
                <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">
                  {formatProxDist(distance)} · {minutes} min
                </span>
              </div>
            ))}
          </div>

          {bien.latitude && bien.longitude && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${bien.latitude},${bien.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-2"
            >
              <MapPin size={10} />
              Ouvrir l'itinéraire dans Google Maps ↗
            </a>
          )}
        </div>
      )}

      {/* Itinéraire */}
      <button
        onClick={() => setShowItinerary(!showItinerary)}
        className="w-full flex items-center justify-between px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
      >
        <span className="flex items-center gap-2">
          <Navigation size={14} />
          Calculer un itinéraire
        </span>
        <ChevronDown
          size={14}
          className={`transition-transform ${showItinerary ? 'rotate-180' : ''}`}
        />
      </button>

      {showItinerary && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          {/* Sélecteur de mode */}
          <div className="flex gap-1.5 mb-3">
            {([
              { mode: 'walking' as const, icon: '🚶', label: 'Pied' },
              { mode: 'cycling' as const, icon: '🚲', label: 'Vélo' },
              { mode: 'driving' as const, icon: '🚗', label: 'Voiture' },
            ]).map(({ mode, icon, label }) => (
              <button
                key={mode}
                onClick={() => {
                  setItineraryMode(mode)
                  setActiveRoute(null)
                  onRouteClear?.()
                }}
                className={[
                  'flex-1 flex flex-col items-center py-1.5 rounded-lg text-xs transition',
                  itineraryMode === mode
                    ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-medium'
                    : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300',
                ].join(' ')}
              >
                <span className="text-base">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Input adresse départ */}
          <div className="relative">
            <input
              placeholder="Adresse de départ…"
              value={itineraryFrom}
              onChange={(e) => handleItineraryInputChange(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 pr-7"
            />
            {itineraryFrom && (
              <button
                onClick={handleClearRoute}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <X size={12} className="text-gray-400 dark:text-gray-500" />
              </button>
            )}
          </div>

          {/* Suggestions */}
          {itinerarySuggestions.length > 0 && !activeRoute && (
            <div className="mt-1 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              {itinerarySuggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setItineraryFrom(s.label)
                    setItinerarySuggestions([])
                    calculateRoute({ lat: s.lat, lon: s.lon })
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border-b border-gray-100 dark:border-gray-600 last:border-0"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Raccourcis points perso */}
          {personalPoints.length > 0 && !activeRoute && (
            <div className="mt-2">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Depuis mes points :</p>
              <div className="flex flex-wrap gap-1">
                {personalPoints.slice(0, 4).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setItineraryFrom(p.label)
                      setItinerarySuggestions([])
                      calculateRoute({ lat: p.latitude, lon: p.longitude })
                    }}
                    className="px-2 py-0.5 rounded-full text-xs border"
                    style={{ borderColor: p.color, color: p.color }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Calcul en cours */}
          {isCalculating && (
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
              <Loader2 size={12} className="animate-spin" />
              Calcul en cours…
            </div>
          )}

          {/* Résultat */}
          {activeRoute && !isCalculating && (
            <div className="mt-2 p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-indigo-700 dark:text-indigo-300 text-sm">
                    {formatDuration(activeRoute.duration)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1.5">
                    {fmtDist(activeRoute.distance)}
                  </span>
                </div>
                <button
                  onClick={handleClearRoute}
                  className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  Effacer
                </button>
              </div>
            </div>
          )}

          {/* Transports en commun */}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Pour les transports en commun →{' '}
            {bien.latitude && bien.longitude && (
              <a
                href={transitUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-500 dark:text-indigo-400 hover:underline"
              >
                Google Maps ↗
              </a>
            )}
          </p>
        </div>
      )}

      {/* Actions */}
      {!showDeleteConfirm ? (
        <div className="flex items-center gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => router.push(`/biens/${bien.id}`)}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl py-2 flex items-center justify-center gap-1.5 transition-colors"
          >
            Voir l'analyse
            <ArrowRight size={13} />
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            title="Supprimer ce bien"
            className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ) : (
        <div className="px-4 py-3">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">Supprimer ce bien ?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex-1 text-xs py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
            >
              Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
