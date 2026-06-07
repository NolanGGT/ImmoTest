'use client'

import mapboxgl from 'mapbox-gl'
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, Crosshair, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { MapSidebar } from './MapSidebar'
import { BienPopup } from './BienPopup'
import { ScoreLegend } from './ScoreLegend'
import { MapAddressSearch } from './MapAddressSearch'
import { useDeleteBien } from '@/hooks/useDeleteBien'
import { usePersonalPoints } from '@/hooks/usePersonalPoints'
import { LAYERS, MAP_STYLES, ZOOM_THRESHOLDS, type LayerType } from '@/lib/map'
import { fetchOverpassData, fetchRisques, type OverpassNode } from '@/lib/overpass'
import { buildGeoJSON, type PersonalPoint } from '@/lib/mapUtils'
import { PRIX_DATA, arrKeyFromCAr, getPrixColor, getPrixLabel, type PrixYear } from '@/lib/heatmapData'
import { computeComfortZone, isPointInZone } from '@/lib/zones'
import { ZoomIndicator } from './ZoomIndicator'
import { TimeReplay } from './TimeReplay'

export type { BienMapData } from '@/lib/mapUtils'
import type { BienMapData } from '@/lib/mapUtils'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

interface ImmoSafeMapProps {
  biens: BienMapData[]
}

// ─── Pure module-level helpers ────────────────────────────────────────────────

function applyPOIVisibility(map: mapboxgl.Map, show: boolean): void {
  const style = map.getStyle()
  if (!style?.layers) return
  for (const layer of style.layers) {
    if (
      (layer.id.includes('poi') || layer.id === 'transit-label') &&
      !layer.id.startsWith('layer-') &&
      !layer.id.startsWith('personal-')
    ) {
      try {
        map.setLayoutProperty(layer.id, 'visibility', show ? 'visible' : 'none')
      } catch { /* */ }
    }
  }
}

function createPinSVG(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="28" viewBox="0 0 20 28">
    <path d="M10 0C4.5 0 0 4.5 0 10C0 17.5 10 28 10 28S20 17.5 20 10C20 4.5 15.5 0 10 0Z" fill="${color}"/>
    <circle cx="10" cy="10" r="5.5" fill="white" opacity="0.92"/>
  </svg>`
}

function createBienPinSVG(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
    <path d="M16 0C7.2 0 0 7.2 0 16C0 28 16 40 16 40C16 40 32 28 32 16C32 7.2 24.8 0 16 0Z"
          fill="${color}"/>
  </svg>`
}


function loadSVGImage(map: mapboxgl.Map, name: string, svg: string, w: number, h: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const img = new Image(w, h)
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      try {
        if (!map.hasImage(name)) map.addImage(name, img)
        resolve()
      } catch (e) {
        reject(e)
      } finally {
        URL.revokeObjectURL(url)
      }
    }
    img.onerror = reject
    img.src = url
  })
}

async function loadLayerIcons(map: mapboxgl.Map): Promise<void> {
  const iconDefs: Array<{ id: string; color: string }> = [
    { id: 'icon-metro', color: '#3b82f6' },
    { id: 'icon-bus', color: '#06b6d4' },
    { id: 'icon-gare', color: '#8b5cf6' },
    { id: 'icon-supermarche', color: '#f59e0b' },
    { id: 'icon-ecole', color: '#10b981' },
    { id: 'icon-universite', color: '#6366f1' },
    { id: 'icon-parc', color: '#22c55e' },
    { id: 'icon-pharmacie', color: '#ef4444' },
  ]

  await Promise.all(
    iconDefs.map(
      ({ id, color }) =>
        new Promise<void>((resolve) => {
          if (map.hasImage(id)) { resolve(); return }
          const svg = createPinSVG(color)
          const img = new Image(20, 28)
          img.onload = () => {
            if (!map.hasImage(id)) map.addImage(id, img)
            resolve()
          }
          img.onerror = () => resolve()
          img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
        })
    )
  )

  await loadSVGImage(map, 'pin-green',  createBienPinSVG('#22c55e'), 32, 40)
  await loadSVGImage(map, 'pin-orange', createBienPinSVG('#f97316'), 32, 40)
  await loadSVGImage(map, 'pin-red',    createBienPinSVG('#ef4444'), 32, 40)
}

function buildLayerPopupContent(layerId: string, props: Record<string, string>): string {
  const name = props.name || props.operator || 'Sans nom'
  const ref = props.ref || ''
  const network = props.network || ''

  const base = (emoji: string, subtitle?: string) => `
    <div style="font-family:system-ui;padding:4px 2px">
      <div style="font-weight:600;font-size:13px">${emoji} ${name}</div>
      ${subtitle ? `<div style="color:#6b7280;font-size:11px;margin-top:2px">${subtitle}</div>` : ''}
    </div>`

  switch (layerId) {
    case 'metro':
      return base('🚇', [ref ? `Ligne ${ref}` : '', network].filter(Boolean).join(' · '))
    case 'bus':
      return base('🚌', ref ? `Ligne ${ref}` : '')
    case 'gare':
      return base('🚆', network)
    case 'ecole':
      return base('🏫', props.operator)
    case 'universite':
      return base('🎓', props.operator)
    case 'supermarche':
      return base('🛒', props.operator)
    case 'parc':
      return base('🌳')
    case 'pharmacie':
      return base('💊', props.operator)
    default:
      return base('📍')
  }
}

const CLUSTER_MAX_ZOOM = 11

const BIENS_LAYER_IDS = [
  'biens-risque',
  'biens-favorite',
  'biens-symbol',
  'manual-cluster-count',
  'manual-cluster',
  'personal-points-label',
  'personal-points-letter',
  'personal-points-circle',
] as const

const ZONE_LAYER_IDS = ['comfort-zone-fill', 'comfort-zone-border'] as const
const ROUTE_LAYER_IDS = ['route-line', 'route-casing'] as const

// ─── Component ────────────────────────────────────────────────────────────────

export function ImmoSafeMap({ biens }: ImmoSafeMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const searchPinRef = useRef<mapboxgl.Marker | null>(null)
  const hoveredIdRef = useRef<string | null>(null)
  const layerPopupRef = useRef<mapboxgl.Popup | null>(null)
  const bienPhotoPopupRef = useRef<mapboxgl.Popup | null>(null)
  const layerClickHandlersRef = useRef<
    Map<LayerType, (e: mapboxgl.MapLayerMouseEvent) => void>
  >(new Map())

  const biensRef = useRef(biens)
  biensRef.current = biens
  const isPlacingModeRef = useRef(false)
  const activeLayersRef = useRef<Set<LayerType>>(new Set())
  const visibleBiensRef = useRef<BienMapData[]>(biens)
  const bienRisquesRef = useRef<Record<string, boolean>>({})
  const layerDataRef = useRef<Partial<Record<LayerType, OverpassNode[]>>>({})
  const showNativePOIRef = useRef(false)
  const activeRouteRef = useRef<GeoJSON.Geometry | null>(null)
  const routeAnimFrameRef = useRef<number | null>(null)
  const currentStyleRef = useRef<string>('')

  // ── Personal points (BDD) ────────────────────────────────────────────────────
  const { points: personalPoints, addPoint, updatePoint, deletePoint, canAdd } = usePersonalPoints()
  const personalPointsRef = useRef(personalPoints)
  useEffect(() => { personalPointsRef.current = personalPoints }, [personalPoints])

  // ── States ──────────────────────────────────────────────────────────────────

  const [isPlacingMode, setIsPlacingMode] = useState(false)
  isPlacingModeRef.current = isPlacingMode

  const [placedCoords, setPlacedCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [activeRoute, setActiveRoute] = useState<GeoJSON.Geometry | null>(null)
  activeRouteRef.current = activeRoute

  const [mapReady, setMapReady] = useState(false)

  const [activeLayers, setActiveLayers] = useState<Set<LayerType>>(new Set())
  const [selectedBienIds, setSelectedBienIds] = useState<Set<string>>(
    () => new Set(biens.map((b) => b.id))
  )
  const [filterStatut, setFilterStatut] = useState<string | null>(null)
  const [currentStyle, setCurrentStyle] = useState(() => {
    try {
      const theme = localStorage.getItem('theme')
      const isDark = theme === 'dark' ||
        (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)
      return isDark ? 'dark' : 'streets'
    } catch {
      return 'streets'
    }
  })
  const [showNativePOI, setShowNativePOI] = useState(false)
  showNativePOIRef.current = showNativePOI

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedBien, setSelectedBien] = useState<BienMapData | null>(null)
  const [heatmapActive, setHeatmapActive] = useState(false)
  const [arrondissementsGeoJSON, setArrondissementsGeoJSON] = useState<GeoJSON.FeatureCollection | null>(null)
  const [currentZoom, setCurrentZoom] = useState(0)
  const [replayYear, setReplayYear] = useState<PrixYear>(2024)
  const [isPlaying, setIsPlaying] = useState(false)
  const replayIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const deleteBien = useDeleteBien()
  const { resolvedTheme } = useTheme()

  const [layerData, setLayerData] = useState<Partial<Record<LayerType, OverpassNode[]>>>({})
  const [loadingLayer, setLoadingLayer] = useState<LayerType | null>(null)
  const [bienRisques, setBienRisques] = useState<Record<string, boolean>>({})
  bienRisquesRef.current = bienRisques

  useEffect(() => { activeLayersRef.current = activeLayers }, [activeLayers])
  useEffect(() => { layerDataRef.current = layerData }, [layerData])

  // ── Derived ─────────────────────────────────────────────────────────────────

  const filteredBiens = useMemo(
    () => biens.filter((b) => filterStatut === null || b.statut === filterStatut),
    [biens, filterStatut]
  )

  const visibleBiens = useMemo(
    () => filteredBiens.filter((b) => selectedBienIds.has(b.id)),
    [filteredBiens, selectedBienIds]
  )
  visibleBiensRef.current = visibleBiens

  // ── WebGL biens layers ──────────────────────────────────────────────────────

  const setupBiensLayers = useCallback(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    for (const id of BIENS_LAYER_IDS) {
      try { if (map.getLayer(id)) map.removeLayer(id) } catch { /* */ }
    }
    try { if (map.getSource('biens')) map.removeSource('biens') } catch { /* */ }
    try { if (map.getSource('manual-cluster')) map.removeSource('manual-cluster') } catch { /* */ }

    map.addSource('biens', {
      type: 'geojson',
      data: buildGeoJSON(visibleBiensRef.current, personalPointsRef.current, bienRisquesRef.current),
      promoteId: 'id',
    })

    // ── Manuel cluster (zoom < 10) ────────────────────────────────────────────
    const validBiens = visibleBiensRef.current.filter((b) => b.latitude && b.longitude)
    if (validBiens.length > 0) {
      const centerLat = validBiens.reduce((s, b) => s + b.latitude, 0) / validBiens.length
      const centerLon = validBiens.reduce((s, b) => s + b.longitude, 0) / validBiens.length
      map.addSource('manual-cluster', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [centerLon, centerLat] },
          properties: { count: validBiens.length },
        } as GeoJSON.Feature,
      })
      map.addLayer({
        id: 'manual-cluster',
        type: 'circle',
        source: 'manual-cluster',
        paint: {
          'circle-radius': 30,
          'circle-color': '#4f46e5',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
      })
      map.addLayer({
        id: 'manual-cluster-count',
        type: 'symbol',
        source: 'manual-cluster',
        layout: {
          'text-field': ['get', 'count'],
          'text-size': 16,
          'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#ffffff' },
      })
    }

    map.addLayer({
      id: 'biens-symbol',
      type: 'symbol',
      source: 'biens',
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'type'], 'bien']],
      layout: {
        'icon-image': [
          'step', ['get', 'score'],
          'pin-red',
          40, 'pin-orange',
          70, 'pin-green',
        ],
        'icon-size': 1,
        'icon-anchor': 'bottom',
        'icon-allow-overlap': true,
        'text-field': ['get', 'scoreLabel'],
        'text-offset': [0, -1.8],
        'text-anchor': 'center',
        'text-size': 11,
        'text-allow-overlap': true,
        'text-ignore-placement': true,
        'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
      },
      paint: { 'text-color': '#ffffff' },
    })

    map.addLayer({
      id: 'biens-favorite',
      type: 'symbol',
      source: 'biens',
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'type'], 'bien'], ['==', ['get', 'isFavorite'], true]],
      layout: {
        'text-field': '⭐',
        'text-size': 11,
        'text-offset': [1.0, -2.1],
        'text-allow-overlap': true,
      },
    })

    map.addLayer({
      id: 'biens-risque',
      type: 'symbol',
      source: 'biens',
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'type'], 'bien'], ['==', ['get', 'atRisk'], true]],
      layout: {
        'text-field': '⚠️',
        'text-size': 11,
        'text-offset': [-1.0, -2.1],
        'text-allow-overlap': true,
      },
    })

    const personalFilter: mapboxgl.FilterSpecification = ['all', ['!', ['has', 'point_count']], ['==', ['get', 'type'], 'personal']]

    map.addLayer({
      id: 'personal-points-circle',
      type: 'circle',
      source: 'biens',
      filter: personalFilter,
      minzoom: CLUSTER_MAX_ZOOM,
      paint: {
        'circle-radius': 12,
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
      },
    })

    map.addLayer({
      id: 'personal-points-letter',
      type: 'symbol',
      source: 'biens',
      filter: personalFilter,
      minzoom: CLUSTER_MAX_ZOOM,
      layout: {
        'text-field': ['slice', ['get', 'label'], 0, 1],
        'text-size': 12,
        'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: { 'text-color': '#ffffff' },
    })

    map.addLayer({
      id: 'personal-points-label',
      type: 'symbol',
      source: 'biens',
      filter: personalFilter,
      minzoom: CLUSTER_MAX_ZOOM,
      layout: {
        'text-field': ['get', 'label'],
        'text-offset': [0, 1.8],
        'text-anchor': 'top',
        'text-size': 11,
        'text-optional': true,
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'],
      },
      paint: {
        'text-color': ['get', 'color'],
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
      },
    })
  }, [])

  const updateBiensSource = useCallback(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return

    const source = map.getSource('biens') as mapboxgl.GeoJSONSource | undefined
    source?.setData(buildGeoJSON(visibleBiensRef.current, personalPointsRef.current, bienRisquesRef.current))

    const validBiens = visibleBiensRef.current.filter((b) => b.latitude && b.longitude)
    const manualSource = map.getSource('manual-cluster') as mapboxgl.GeoJSONSource | undefined
    if (manualSource && validBiens.length > 0) {
      const centerLat = validBiens.reduce((s, b) => s + b.latitude, 0) / validBiens.length
      const centerLon = validBiens.reduce((s, b) => s + b.longitude, 0) / validBiens.length
      manualSource.setData({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [centerLon, centerLat] },
        properties: { count: validBiens.length },
      } as GeoJSON.Feature)
    }
  }, [])

  const loadAllImages = useCallback(async (mapInstance: mapboxgl.Map) => {
    await loadLayerIcons(mapInstance)
  }, [])

  const applyPersonalPoints = useCallback((points: PersonalPoint[]) => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return

    // STEP 1 — sync biens source (personal features live here)
    const biensSource = map.getSource('biens') as mapboxgl.GeoJSONSource | undefined
    biensSource?.setData(buildGeoJSON(visibleBiensRef.current, points, bienRisquesRef.current))

    // STEP 3 — rebuild comfort zone from scratch
    for (const id of ZONE_LAYER_IDS) {
      try { if (map.getLayer(id)) map.removeLayer(id) } catch { /* */ }
    }
    try { if (map.getSource('comfort-zone')) map.removeSource('comfort-zone') } catch { /* */ }

    if (points.length === 0) return

    const zone = computeComfortZone(points)
    if (!zone) return

    map.addSource('comfort-zone', { type: 'geojson', data: zone })
    const beforeLayer = map.getLayer('personal-points-circle') ? 'personal-points-circle' : undefined
    map.addLayer({
      id: 'comfort-zone-fill',
      type: 'fill',
      source: 'comfort-zone',
      minzoom: CLUSTER_MAX_ZOOM,
      paint: { 'fill-color': '#7c3aed', 'fill-opacity': 0.12 },
    }, beforeLayer)
    map.addLayer({
      id: 'comfort-zone-border',
      type: 'line',
      source: 'comfort-zone',
      minzoom: CLUSTER_MAX_ZOOM,
      paint: {
        'line-color': '#7c3aed',
        'line-width': 2,
        'line-opacity': 0.6,
        'line-dasharray': [3, 2],
      },
    }, beforeLayer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Route layer ──────────────────────────────────────────────────────────────

  const updateRouteLayer = useCallback(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return

    for (const id of ROUTE_LAYER_IDS) {
      try { if (map.getLayer(id)) map.removeLayer(id) } catch { /* */ }
    }
    try { if (map.getSource('route')) map.removeSource('route') } catch { /* */ }

    const geometry = activeRouteRef.current
    if (!geometry) return

    map.addSource('route', {
      type: 'geojson',
      data: { type: 'Feature', geometry, properties: {} },
    })

    map.addLayer({
      id: 'route-casing',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.8 },
    })

    map.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#4f46e5', 'line-width': 5, 'line-opacity': 0.9 },
    })

    if ('coordinates' in geometry) {
      const coords = geometry.coordinates as number[][]
      if (coords.length > 0) {
        const bounds = new mapboxgl.LngLatBounds()
        coords.forEach((c) => bounds.extend([c[0], c[1]]))
        map.fitBounds(bounds, { padding: 80, duration: 600 })
      }
    }
  }, [])

  // ── Overlay layer helpers ───────────────────────────────────────────────────

  const addLayerToMap = useCallback(
    (layerType: LayerType, nodes: OverpassNode[]) => {
      if (!mapRef.current || nodes.length === 0) return

      const doAdd = () => {
        const map = mapRef.current
        if (!map) return
        const sourceId = `layer-${layerType}`
        const layerId = `layer-${layerType}-points`
        const labelId = `layer-${layerType}-labels`
        const config = LAYERS.find((l) => l.id === layerType)!

        try { if (map.getLayer(labelId)) map.removeLayer(labelId) } catch { /* */ }

        const prevClickHandler = layerClickHandlersRef.current.get(layerType)
        if (prevClickHandler) {
          try { map.off('click', layerId, prevClickHandler) } catch { /* */ }
        }
        try { if (map.getLayer(layerId)) map.removeLayer(layerId) } catch { /* */ }
        try { if (map.getSource(sourceId)) map.removeSource(sourceId) } catch { /* */ }

        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: nodes.map((node) => ({
              type: 'Feature' as const,
              geometry: { type: 'Point' as const, coordinates: [node.lon, node.lat] },
              properties: {
                name: node.tags.name || '',
                ref: node.tags.ref || '',
                network: node.tags.network || '',
                operator: node.tags.operator || '',
              },
            })),
          },
        })

        map.addLayer({
          id: layerId,
          type: 'symbol',
          source: sourceId,
          minzoom: 12,
          layout: {
            'icon-image': `icon-${layerType}`,
            'icon-size': ['interpolate', ['linear'], ['zoom'], 12, 0.7, 16, 1.0],
            'icon-allow-overlap': false,
            'icon-ignore-placement': false,
            'text-field': ['get', 'name'],
            'text-size': 10,
            'text-offset': [0, 1.8],
            'text-anchor': 'top',
            'text-optional': true,
            'text-max-width': 8,
            'text-font': ['DIN Offc Pro Regular', 'Arial Unicode MS Regular'],
          },
          paint: {
            'text-color': '#374151',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.5,
          },
        })

        const clickHandler = (e: mapboxgl.MapLayerMouseEvent) => {
          if (!e.features?.length) return
          const props = e.features[0].properties as Record<string, string>
          const coords = (e.features[0].geometry as GeoJSON.Point).coordinates as [number, number]
          layerPopupRef.current?.remove()
          layerPopupRef.current = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: false,
            maxWidth: '220px',
            className: 'immosafe-popup',
          })
            .setLngLat(coords)
            .setHTML(buildLayerPopupContent(layerType, props))
            .addTo(map)
        }
        layerClickHandlersRef.current.set(layerType, clickHandler)
        map.on('click', layerId, clickHandler)

        map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', layerId, () => {
          if (!isPlacingModeRef.current) map.getCanvas().style.cursor = ''
        })
      }

      if (mapRef.current.isStyleLoaded()) doAdd()
      else mapRef.current.once('styledata', doAdd)
    },
    []
  )

  const removeLayerFromMap = useCallback((layerType: LayerType) => {
    const map = mapRef.current
    if (!map) return
    const sourceId = `layer-${layerType}`
    const layerId = `layer-${layerType}-points`
    const labelId = `layer-${layerType}-labels`

    layerPopupRef.current?.remove()

    const handler = layerClickHandlersRef.current.get(layerType)
    if (handler) {
      try { map.off('click', layerId, handler) } catch { /* */ }
      layerClickHandlersRef.current.delete(layerType)
    }
    try { if (map.getLayer(labelId)) map.removeLayer(labelId) } catch { /* */ }
    try { if (map.getLayer(layerId)) map.removeLayer(layerId) } catch { /* */ }
    try { if (map.getSource(sourceId)) map.removeSource(sourceId) } catch { /* */ }
  }, [])

  // ── Toggle overlay layer ────────────────────────────────────────────────────

  const toggleLayer = useCallback(
    async (layerType: LayerType) => {
      const current = activeLayersRef.current

      if (current.has(layerType)) {
        const next = new Set(current)
        next.delete(layerType)
        activeLayersRef.current = next
        setActiveLayers(new Set(next))
        removeLayerFromMap(layerType)
        return
      }

      const next = new Set(current)
      next.add(layerType)
      activeLayersRef.current = next
      setActiveLayers(new Set(next))

      const validBiens = biensRef.current.filter(
        (b) => b.latitude && b.longitude && !isNaN(b.latitude) && !isNaN(b.longitude)
      )
      if (validBiens.length === 0) return

      const centerLat = validBiens.reduce((s, b) => s + b.latitude, 0) / validBiens.length
      const centerLon = validBiens.reduce((s, b) => s + b.longitude, 0) / validBiens.length
      const config = LAYERS.find((l) => l.id === layerType)!

      setLoadingLayer(layerType)

      if (layerType === 'risques') {
        try {
          const results = await Promise.all(
            validBiens.map((b) => fetchRisques(b.latitude, b.longitude))
          )
          const risquesMap: Record<string, boolean> = {}
          validBiens.forEach((b, i) => { risquesMap[b.id] = results[i] })
          setBienRisques(risquesMap)
        } catch { /* */ }
        setLoadingLayer(null)
        return
      }

      try {
        const nodes = await fetchOverpassData(config.overpassQuery, centerLat, centerLon, 2000)
        const newLayerData = { ...layerDataRef.current, [layerType]: nodes }
        layerDataRef.current = newLayerData
        setLayerData(newLayerData)
        addLayerToMap(layerType, nodes)
        if ((mapRef.current?.getZoom() ?? 13) < 12) {
          mapRef.current?.easeTo({ zoom: 13, duration: 800 })
        }
      } catch (err) {
        console.error('[toggleLayer]', err)
      }
      setLoadingLayer(null)
    },
    [addLayerToMap, removeLayerFromMap]
  )

  // ── Central layer initialization ─────────────────────────────────────────────

  const initializeAllLayers = useCallback(async () => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    await loadAllImages(map)
    setupBiensLayers()
    await applyPersonalPoints(personalPointsRef.current)
    activeLayersRef.current.forEach((layerType) => {
      if (layerType === 'risques') return
      const data = layerDataRef.current[layerType]
      if (data) addLayerToMap(layerType, data)
    })
    applyPOIVisibility(map, showNativePOIRef.current)
    updateRouteLayer()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Style change ─────────────────────────────────────────────────────────────

  const changeStyle = useCallback(
    (styleId: string) => {
      const styleConfig = MAP_STYLES.find((s) => s.id === styleId)
      if (!styleConfig || !mapRef.current) return

      hoveredIdRef.current = null
      setCurrentStyle(styleId)
      currentStyleRef.current = styleConfig.url
      mapRef.current.setStyle(styleConfig.url)

      let attempts = 0
      const waitForStyle = setInterval(() => {
        attempts++
        if (!mapRef.current) { clearInterval(waitForStyle); return }
        if (mapRef.current.isStyleLoaded()) {
          clearInterval(waitForStyle)
          initializeAllLayers()
        }
        if (attempts > 50) {
          clearInterval(waitForStyle)
          console.error('[STYLE] timeout — style jamais chargé')
        }
      }, 100)
    },
    [initializeAllLayers]
  )

  // ── Mapbox theme sync ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current || !mapReady) return
    const map = mapRef.current

    const targetStyle = resolvedTheme === 'dark'
      ? 'mapbox://styles/mapbox/dark-v11'
      : MAP_STYLES.find((s) => s.id === currentStyle)?.url ?? 'mapbox://styles/mapbox/streets-v12'

    if (currentStyleRef.current === targetStyle) return
    currentStyleRef.current = targetStyle

    map.setStyle(targetStyle)

    let attempts = 0
    const waitForStyle = setInterval(() => {
      attempts++
      if (!mapRef.current) { clearInterval(waitForStyle); return }
      if (mapRef.current.isStyleLoaded()) {
        clearInterval(waitForStyle)
        initializeAllLayers()
      }
      if (attempts > 50) clearInterval(waitForStyle)
    }, 100)

    return () => clearInterval(waitForStyle)
  }, [resolvedTheme, mapReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Native POI toggle ────────────────────────────────────────────────────────

  const toggleNativePOI = useCallback((show: boolean) => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    applyPOIVisibility(map, show)
    setShowNativePOI(show)
  }, [])

  // ── Sidebar handlers ─────────────────────────────────────────────────────────

  const handleToggleBien = useCallback((id: string) => {
    setSelectedBienIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSelectAllBiens = useCallback(() => {
    setSelectedBienIds(new Set(filteredBiens.map((b) => b.id)))
  }, [filteredBiens])

  const handleDeselectAllBiens = useCallback(() => {
    setSelectedBienIds(new Set())
  }, [])

  const handleFilterStatut = useCallback(
    (statut: string | null) => {
      setFilterStatut(statut)
      setSelectedBienIds(
        new Set(biens.filter((b) => statut === null || b.statut === statut).map((b) => b.id))
      )
    },
    [biens]
  )

  const handleDeleteBien = useCallback(
    async (bienId: string) => {
      try {
        await deleteBien.mutateAsync(bienId)
        setSelectedBien(null)
      } catch { /* toast already shown by hook */ }
    },
    [deleteBien]
  )

  const fitBounds = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const valid = visibleBiensRef.current.filter((b) => b.latitude && b.longitude)
    if (valid.length === 0) return
    if (valid.length === 1) {
      map.flyTo({ center: [valid[0].longitude, valid[0].latitude], zoom: 13, duration: 800 })
      return
    }
    const bounds = new mapboxgl.LngLatBounds()
    valid.forEach((b) => bounds.extend([b.longitude, b.latitude]))
    map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 800 })
  }, [])

  const handleUpdatePointRadius = useCallback((id: string, radiusKm: number) => {
    updatePoint.mutate({ id, radiusKm })
  }, [updatePoint])

  // ── Address search pin ───────────────────────────────────────────────────────

  const handleSelectAddress = useCallback((label: string, lat: number, lon: number) => {
    const map = mapRef.current
    if (!map) return

    searchPinRef.current?.remove()
    map.flyTo({ center: [lon, lat], zoom: 15, duration: 700 })

    if (!document.getElementById('_immo-pin-style')) {
      const s = document.createElement('style')
      s.id = '_immo-pin-style'
      s.textContent = `
        @keyframes _immo-pulse {
          0%,100% { transform:scale(1); box-shadow:0 0 0 0 rgba(79,70,229,0.5); }
          50%      { transform:scale(1.15); box-shadow:0 0 0 8px rgba(79,70,229,0); }
        }
      `
      document.head.appendChild(s)
    }

    const el = document.createElement('div')
    el.style.cssText = 'display:flex;flex-direction:column;align-items:center;'
    el.innerHTML = `
      <div style="
        width:18px;height:18px;border-radius:50%;background:#4f46e5;border:3px solid white;
        box-shadow:0 2px 10px rgba(79,70,229,0.45);
        animation:_immo-pulse 1.8s ease-in-out infinite;
      "></div>
      <div style="width:2px;height:10px;background:linear-gradient(#4f46e5,transparent);margin-top:-1px;"></div>
    `
    el.title = label
    searchPinRef.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([lon, lat])
      .addTo(map)
  }, [])

  const handleClearSearchPin = useCallback(() => {
    searchPinRef.current?.remove()
    searchPinRef.current = null
  }, [])

  // ── Route callbacks for BienPopup ────────────────────────────────────────────

  const handleRouteCalculated = useCallback((geometry: GeoJSON.Geometry) => {
    setActiveRoute(geometry)
  }, [])

  const handleRouteClear = useCallback(() => {
    setActiveRoute(null)
  }, [])

  // ── Map init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const first = biensRef.current[0]
    const center: [number, number] = first
      ? [first.longitude, first.latitude]
      : [2.3522, 46.8566]

    const initialStyle = resolvedTheme === 'dark'
      ? 'mapbox://styles/mapbox/dark-v11'
      : 'mapbox://styles/mapbox/streets-v12'

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: initialStyle,
      center,
      zoom: biensRef.current.length === 1 ? 13 : 5,
      attributionControl: false,
    })

    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right')
    map.addControl(
      new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }),
      'bottom-right'
    )
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left')

    mapRef.current = map

    map.on('load', async () => {
      currentStyleRef.current = initialStyle
      await initializeAllLayers()
      setMapReady(true)

      setCurrentZoom(map.getZoom())
      map.on('zoom', () => setCurrentZoom(map.getZoom()))

      if (biensRef.current.length > 1) {
        const bounds = new mapboxgl.LngLatBounds()
        biensRef.current
          .filter((b) => b.latitude && b.longitude)
          .forEach((b) => bounds.extend([b.longitude, b.latitude]))
        map.fitBounds(bounds, { padding: 80, maxZoom: 14 })
      }

      // Manual cluster click → zoom in centered on the cluster
      map.on('click', 'manual-cluster', (e) => {
        if (!e.features?.length) return
        const coords = (e.features[0].geometry as GeoJSON.Point).coordinates as [number, number]
        map.easeTo({ center: coords, zoom: 11, duration: 600 })
      })

      // Individual bien click → toggle popup
      map.on('click', 'biens-symbol', (e) => {
        if (!e.features?.length) return
        const bienId = e.features[0].properties?.id as string
        const bien = visibleBiensRef.current.find((b) => b.id === bienId)
        if (!bien) return
        setSelectedBien((prev) => (prev?.id === bienId ? null : bien))
      })

      // Personal point click → popup with label
      map.on('click', 'personal-points-circle', (e) => {
        if (!e.features?.length) return
        const props = e.features[0].properties as { label: string }
        const coords = (e.features[0].geometry as GeoJSON.Point).coordinates as [number, number]
        new mapboxgl.Popup({ closeButton: true, maxWidth: '180px' })
          .setLngLat(coords)
          .setHTML(`
            <div style="font-family:system-ui;padding:4px">
              <div style="font-weight:600;font-size:13px">${props.label}</div>
              <div style="color:#6b7280;font-size:11px;margin-top:2px">Point personnalisé</div>
            </div>
          `)
          .addTo(map)
      })

      // Hover scale via feature-state + photo popup
      map.on('mouseenter', 'biens-symbol', (e) => {
        if (!isPlacingModeRef.current) map.getCanvas().style.cursor = 'pointer'
        const feature = e.features?.[0]
        if (!feature) return
        const id = feature.properties?.id as string | undefined
        if (!id) return
        if (hoveredIdRef.current && hoveredIdRef.current !== id) {
          map.setFeatureState({ source: 'biens', id: hoveredIdRef.current }, { hover: false })
        }
        hoveredIdRef.current = id
        map.setFeatureState({ source: 'biens', id }, { hover: true })

        // Photo popup
        const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number]
        const photo = feature.properties?.photo as string | null
        bienPhotoPopupRef.current?.remove()
        if (photo) {
          bienPhotoPopupRef.current = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 20,
            className: 'bien-photo-popup',
            maxWidth: 'none',
          })
            .setLngLat(coords)
            .setHTML(`
              <div style="
                width:180px;
                border-radius:10px;
                overflow:hidden;
                box-shadow:0 8px 24px rgba(0,0,0,0.3);
                border:2px solid rgba(255,255,255,0.15);
              ">
                <img
                  src="${photo}"
                  style="width:180px;height:120px;object-fit:cover;display:block;"
                  onerror="this.parentElement.style.display='none'"
                />
              </div>
            `)
            .addTo(map)
        }
      })

      map.on('mouseleave', 'biens-symbol', () => {
        if (!isPlacingModeRef.current) map.getCanvas().style.cursor = ''
        if (hoveredIdRef.current) {
          map.setFeatureState({ source: 'biens', id: hoveredIdRef.current }, { hover: false })
          hoveredIdRef.current = null
        }
        bienPhotoPopupRef.current?.remove()
        bienPhotoPopupRef.current = null
      })

      map.on('mouseenter', 'manual-cluster', () => {
        if (!isPlacingModeRef.current) map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'manual-cluster', () => {
        if (!isPlacingModeRef.current) map.getCanvas().style.cursor = ''
      })

      map.on('mouseenter', 'personal-points-circle', () => {
        if (!isPlacingModeRef.current) map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'personal-points-circle', () => {
        if (!isPlacingModeRef.current) map.getCanvas().style.cursor = ''
      })

      // Map click — place personal point OR close bien popup
      map.on('click', (e) => {
        if (isPlacingModeRef.current) {
          const { lat, lng } = e.lngLat
          setPlacedCoords({ lat, lon: lng })
          setIsPlacingMode(false)
          return
        }
        const possibleLayers = ['biens-symbol', 'manual-cluster', 'personal-points-circle']
        const layersToQuery = possibleLayers.filter((id) => {
          try { return !!map.getLayer(id) } catch { return false }
        })
        if (layersToQuery.length === 0) { setSelectedBien(null); return }
        const features = map.queryRenderedFeatures(e.point, { layers: layersToQuery })
        if (!features.length) setSelectedBien(null)
      })

    })

    return () => {
      searchPinRef.current?.remove()
      layerPopupRef.current?.remove()
      bienPhotoPopupRef.current?.remove()
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cursor when placing mode changes ─────────────────────────────────────────

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.getCanvas().style.cursor = isPlacingMode ? 'crosshair' : ''
  }, [isPlacingMode])

  // ── Zoom-based visibility : cluster manuel < 10, marqueurs individuels >= 10 ──

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded() || !mapReady) return
    const isZoomedOut = currentZoom < 10

    const individualLayers = ['biens-symbol', 'biens-favorite', 'biens-risque', 'personal-points-circle', 'personal-points-letter', 'personal-points-label']
    const clusterLayers = ['manual-cluster', 'manual-cluster-count']

    individualLayers.forEach((id) => {
      try { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', isZoomedOut ? 'none' : 'visible') } catch { /* */ }
    })
    clusterLayers.forEach((id) => {
      try { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', isZoomedOut ? 'visible' : 'none') } catch { /* */ }
    })
  }, [currentZoom, mapReady])

  // ── Sync personal points layers ───────────────────────────────────────────────

  useEffect(() => {
    if (!mapReady) return

    const apply = () => {
      if (!mapRef.current?.isStyleLoaded()) {
        setTimeout(apply, 200)
        return
      }
      applyPersonalPoints(personalPoints)
    }
    apply()
  }, [personalPoints, mapReady, applyPersonalPoints])

  // ── Sync biens source ────────────────────────────────────────────────────────

  useEffect(() => {
    updateBiensSource()
  }, [visibleBiens, bienRisques, updateBiensSource])

  // ── Sync route layer ─────────────────────────────────────────────────────────

  useEffect(() => {
    updateRouteLayer()
  }, [activeRoute, updateRouteLayer])

  // ── GeoJSON fetch ─────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/arrondissements-paris.geojson')
      .then((r) => r.json())
      .then((data) => setArrondissementsGeoJSON(data as GeoJSON.FeatureCollection))
      .catch((e) => console.error('[GEOJSON] erreur:', e))
  }, [])

  // ── Heatmap layers ────────────────────────────────────────────────────────────

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return

    try { if (map.getLayer('heatmap-labels'))  map.removeLayer('heatmap-labels')  } catch { /* */ }
    try { if (map.getLayer('heatmap-outline')) map.removeLayer('heatmap-outline') } catch { /* */ }
    try { if (map.getLayer('heatmap-fill'))    map.removeLayer('heatmap-fill')    } catch { /* */ }
    try { if (map.getSource('arrondissements')) map.removeSource('arrondissements') } catch { /* */ }

    if (!heatmapActive || !arrondissementsGeoJSON) return

    const prixData = PRIX_DATA[replayYear]
    const annotated: GeoJSON.FeatureCollection = {
      ...arrondissementsGeoJSON,
      features: arrondissementsGeoJSON.features.map((f) => {
        const cAr = f.properties?.c_ar as number
        const prix = prixData[arrKeyFromCAr(cAr)] ?? 0
        return {
          ...f,
          properties: { ...f.properties, prix, prixLabel: getPrixLabel(prix), color: getPrixColor(prix) },
        }
      }),
    }

    map.addSource('arrondissements', { type: 'geojson', data: annotated })
    map.addLayer({ id: 'heatmap-fill', type: 'fill', source: 'arrondissements',
      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.65 } })
    map.addLayer({ id: 'heatmap-outline', type: 'line', source: 'arrondissements',
      paint: { 'line-color': '#ffffff', 'line-width': 1, 'line-opacity': 0.8 } })
    map.addLayer({ id: 'heatmap-labels', type: 'symbol', source: 'arrondissements',
      layout: {
        'text-field': ['get', 'prixLabel'],
        'text-size': 11,
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'],
        'text-allow-overlap': false,
      },
      paint: { 'text-color': '#1a1a1a', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 },
    })
  }, [heatmapActive, arrondissementsGeoJSON, replayYear, mapReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Replay interval ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isPlaying) {
      if (replayIntervalRef.current) clearInterval(replayIntervalRef.current)
      return
    }
    const years: PrixYear[] = [2019, 2020, 2021, 2022, 2023, 2024]
    replayIntervalRef.current = setInterval(() => {
      setReplayYear((prev) => {
        const idx = years.indexOf(prev)
        if (idx >= years.length - 1) { setIsPlaying(false); return prev }
        return years[idx + 1]
      })
    }, 1000)
    return () => { if (replayIntervalRef.current) clearInterval(replayIntervalRef.current) }
  }, [isPlaying])

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-full flex">

      {/* ── Map area ── */}
      <div className="flex-1 relative min-w-0">
        <div ref={mapContainer} className="w-full h-full" />

        {/* Address search bar */}
        <MapAddressSearch onSelect={handleSelectAddress} onClear={handleClearSearchPin} />

        {/* Placing mode banner */}
        <AnimatePresence>
          {isPlacingMode && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="absolute top-14 left-1/2 -translate-x-1/2 z-20 bg-violet-600 text-white text-xs font-medium px-4 py-2 rounded-xl shadow-lg flex items-center gap-2"
            >
              <span>Cliquez sur la carte pour placer votre point</span>
              <button
                type="button"
                onClick={() => setIsPlacingMode(false)}
                className="ml-1 hover:text-violet-200 transition-colors"
              >
                <X size={13} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating controls */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="lg:hidden bg-white rounded-lg shadow-md p-2 hover:bg-gray-50 transition-colors"
            aria-label="Calques et filtres"
          >
            <Layers size={18} className="text-gray-600" />
          </button>

          <button
            type="button"
            onClick={fitBounds}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-md hover:shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <Crosshair size={14} />
            Recentrer
          </button>
        </div>

        {/* Score legend */}
        <div className="absolute bottom-8 left-3 z-10">
          <ScoreLegend />
        </div>

        {/* Zoom indicator */}
        <ZoomIndicator zoom={currentZoom} />

        {/* Time replay (heatmap) */}
        {heatmapActive && (
          <TimeReplay
            year={replayYear}
            onYearChange={(y) => setReplayYear(y as PrixYear)}
            isPlaying={isPlaying}
            onTogglePlay={() => {
              if (replayYear === 2024) setReplayYear(2019)
              setIsPlaying((v) => !v)
            }}
          />
        )}

        {/* Bien popup */}
        <AnimatePresence mode="wait">
          {selectedBien && (
            <motion.div
              key={selectedBien.id}
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute left-0 top-0 bottom-0 z-20 flex items-center pointer-events-none"
            >
              <div className="pointer-events-auto m-3">
                <BienPopup
                  bien={selectedBien}
                  layerData={layerData}
                  activeLayers={activeLayers}
                  personalPoints={personalPoints}
                  onClose={() => setSelectedBien(null)}
                  onDelete={() => handleDeleteBien(selectedBien.id)}
                  onRouteCalculated={handleRouteCalculated}
                  onRouteClear={handleRouteClear}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Sidebar ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="sidebar"
            initial={{ x: 288, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 288, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="w-72 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 overflow-y-auto flex-shrink-0 z-20 max-lg:absolute max-lg:right-0 max-lg:top-0 max-lg:bottom-0 max-lg:shadow-xl"
          >
            <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Personnaliser</span>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>

            <MapSidebar
              biens={filteredBiens}
              selectedBienIds={selectedBienIds}
              onToggleBien={handleToggleBien}
              onSelectAllBiens={handleSelectAllBiens}
              onDeselectAllBiens={handleDeselectAllBiens}
              filterStatut={filterStatut}
              onFilterStatut={handleFilterStatut}
              personalPoints={personalPoints}
              canAdd={canAdd}
              onAddPoint={(data) => addPoint.mutate({ ...data, radiusKm: 0 })}
              isAddingPoint={addPoint.isPending}
              onUpdatePointRadius={handleUpdatePointRadius}
              onDeletePoint={(id) => deletePoint.mutate(id)}
              isPlacingMode={isPlacingMode}
              onActivatePlacingMode={() => setIsPlacingMode((v) => !v)}
              placedCoords={placedCoords}
              onClearPlacedCoords={() => setPlacedCoords(null)}
              activeLayers={activeLayers}
              loadingLayer={loadingLayer}
              onToggleLayer={toggleLayer}
              heatmapActive={heatmapActive}
              onToggleHeatmap={() => setHeatmapActive((v) => !v)}
              currentStyle={currentStyle}
              onChangeStyle={changeStyle}
              showNativePOI={showNativePOI}
              onToggleNativePOI={toggleNativePOI}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar toggle tab */}
      <button
        type="button"
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label={sidebarOpen ? 'Masquer la sidebar' : 'Afficher la sidebar'}
        className={[
          'hidden lg:flex absolute top-1/2 -translate-y-1/2 z-30',
          'bg-white border border-gray-200 rounded-l-lg p-1.5',
          'hover:bg-gray-50 transition-all shadow-sm',
          sidebarOpen ? 'right-72' : 'right-0',
        ].join(' ')}
      >
        {sidebarOpen ? (
          <ChevronRight size={14} className="text-gray-500" />
        ) : (
          <ChevronLeft size={14} className="text-gray-500" />
        )}
      </button>
    </div>
  )
}
