import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ImmoSafeMap } from '../ImmoSafeMap'

// ── Image mock (jsdom doesn't fire onload for SVG data URLs) ─────────────────

class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  width = 0
  height = 0
  private _src = ''
  constructor(w = 0, h = 0) { this.width = w; this.height = h }
  set src(value: string) {
    this._src = value
    setTimeout(() => this.onload?.(), 0)
  }
  get src() { return this._src }
}
// @ts-expect-error - replace global Image for tests
global.Image = MockImage

// ── Mapbox mock ──────────────────────────────────────────────────────────────

const mockMap = {
  on: vi.fn((event: string, cb: () => void) => { if (event === 'load') cb() }),
  once: vi.fn((event: string, cb: () => void) => { if (event === 'style.load') cb() }),
  off: vi.fn(),
  remove: vi.fn(),
  isStyleLoaded: vi.fn(() => true),
  getSource: vi.fn(() => null),
  addSource: vi.fn(),
  getLayer: vi.fn(() => null),
  addLayer: vi.fn(),
  removeLayer: vi.fn(),
  removeSource: vi.fn(),
  hasImage: vi.fn(() => false),
  addImage: vi.fn(),
  loadImage: vi.fn(),
  getCanvas: vi.fn(() => ({ style: {} })),
  setFeatureState: vi.fn(),
  queryRenderedFeatures: vi.fn(() => []),
  fitBounds: vi.fn(),
  easeTo: vi.fn(),
  getZoom: vi.fn(() => 12),
  setStyle: vi.fn(),
  getStyle: vi.fn(() => ({ name: 'Streets', layers: [] })),
  setPaintProperty: vi.fn(),
  setLayoutProperty: vi.fn(),
  project: vi.fn(() => ({ x: 0, y: 0 })),
  addControl: vi.fn(),
}

vi.mock('mapbox-gl', () => ({
  default: {
    Map: vi.fn(() => mockMap),
    NavigationControl: vi.fn(),
    GeolocateControl: vi.fn(),
    AttributionControl: vi.fn(),
    LngLatBounds: vi.fn(() => ({ extend: vi.fn() })),
    Popup: vi.fn(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      setHTML: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
    })),
    Marker: vi.fn(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
      getElement: vi.fn(() => document.createElement('div')),
    })),
    accessToken: '',
  },
}))

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', theme: 'light', setTheme: vi.fn() }),
}))

vi.mock('@/hooks/usePersonalPoints', () => ({
  usePersonalPoints: () => ({
    points: [
      {
        id: 'p1', label: 'Travail', latitude: 48.85, longitude: 2.35,
        color: '#7c3aed', radiusKm: 0, userId: 'u1', createdAt: '',
      },
    ],
    addPoint: { mutate: vi.fn(), isPending: false },
    deletePoint: { mutate: vi.fn() },
    updatePoint: { mutate: vi.fn() },
    canAdd: true,
  }),
}))

vi.mock('@/hooks/useDeleteBien', () => ({
  useDeleteBien: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/lib/overpass', () => ({
  fetchOverpassData: vi.fn(() => Promise.resolve([])),
  fetchRisques: vi.fn(() => Promise.resolve(false)),
}))

vi.mock('@/lib/zones', () => ({
  computeComfortZone: vi.fn(() => null),
  isPointInZone: vi.fn(() => false),
}))

vi.mock('@/lib/directions', () => ({
  getRoute: vi.fn(() => Promise.resolve(null)),
  formatDistance: vi.fn((m: number) => `${m}m`),
  formatDuration: vi.fn((s: number) => `${s}s`),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const mockBiens = [
  {
    id: 'b1', ville: 'Paris', prix: 285000, surface: 62,
    typeBien: 'APPARTEMENT', scoreImmoSafe: 74,
    latitude: 48.8534, longitude: 2.3488,
    statut: 'EN_COURS', isFavorite: false, titre: 'Test bien',
  },
]

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ImmoSafeMap initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMap.isStyleLoaded.mockReturnValue(true)
    mockMap.getSource.mockReturnValue(null)
    mockMap.getLayer.mockReturnValue(null)
    mockMap.on.mockImplementation((event: string, cb: () => void) => {
      if (event === 'load') cb()
    })
    mockMap.once.mockImplementation((event: string, cb: () => void) => {
      if (event === 'style.load') cb()
    })
  })

  it('appelle addSource biens au chargement', async () => {
    render(<ImmoSafeMap biens={mockBiens} />, { wrapper })
    await waitFor(() => {
      expect(mockMap.addSource).toHaveBeenCalledWith('biens', expect.objectContaining({
        type: 'geojson',
        cluster: true,
      }))
    })
  })

  it('inclut les personal-points dans la source biens unifiée', async () => {
    render(<ImmoSafeMap biens={mockBiens} />, { wrapper })
    await waitFor(() => {
      // personal-points are now part of the unified 'biens' source — no separate source
      const sourceCalls = mockMap.addSource.mock.calls.map((c: unknown[]) => c[0])
      expect(sourceCalls).not.toContain('personal-points')
      expect(sourceCalls).toContain('biens')
    })
  })

  it('appelle addLayer biens-clusters', async () => {
    render(<ImmoSafeMap biens={mockBiens} />, { wrapper })
    await waitFor(() => {
      const layerIds = mockMap.addLayer.mock.calls.map((c: unknown[]) => (c[0] as { id: string })?.id)
      expect(layerIds).toContain('biens-clusters')
    })
  })

  it('appelle addLayer personal-points-icon', async () => {
    render(<ImmoSafeMap biens={mockBiens} />, { wrapper })
    await waitFor(() => {
      const layerIds = mockMap.addLayer.mock.calls.map((c: unknown[]) => (c[0] as { id: string })?.id)
      expect(layerIds).toContain('personal-points-icon')
    })
  })

  it('personal-points-icon utilise la source biens unifiée', async () => {
    render(<ImmoSafeMap biens={mockBiens} />, { wrapper })
    await waitFor(() => {
      const layerIds = mockMap.addLayer.mock.calls.map((c: unknown[]) => (c[0] as { id: string })?.id)
      expect(layerIds).toContain('personal-points-icon')
    })
    const personalLayer = mockMap.addLayer.mock.calls.find(
      (c: unknown[]) => (c[0] as { id: string })?.id === 'personal-points-icon'
    )?.[0] as { source: string; filter: unknown[] } | undefined
    expect(personalLayer?.source).toBe('biens')
    expect(JSON.stringify(personalLayer?.filter)).toContain('"personal"')
  })
})
