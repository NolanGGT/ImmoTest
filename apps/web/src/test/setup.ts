import '@testing-library/jest-dom'

// jsdom doesn't implement URL.createObjectURL / revokeObjectURL
if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = () => 'blob:mock'
  URL.revokeObjectURL = () => {}
}

// Mock mapbox-gl (no WebGL in jsdom)
vi.mock('mapbox-gl', () => {
  const mockMap = {
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    addSource: vi.fn(),
    getSource: vi.fn(),
    addLayer: vi.fn(),
    getLayer: vi.fn(),
    removeLayer: vi.fn(),
    removeSource: vi.fn(),
    setPaintProperty: vi.fn(),
    setLayoutProperty: vi.fn(),
    setFeatureState: vi.fn(),
    queryRenderedFeatures: vi.fn(() => []),
    isStyleLoaded: vi.fn(() => true),
    loaded: vi.fn(() => true),
    getCanvas: vi.fn(() => ({ style: {} })),
    getContainer: vi.fn(() => document.createElement('div')),
    flyTo: vi.fn(),
    fitBounds: vi.fn(),
    getBounds: vi.fn(() => ({
      getNorthEast: () => ({ lat: 49, lng: 3 }),
      getSouthWest: () => ({ lat: 48, lng: 2 }),
    })),
    getZoom: vi.fn(() => 10),
    setStyle: vi.fn(),
    addControl: vi.fn(),
    removeControl: vi.fn(),
    resize: vi.fn(),
  }

  return {
    default: {
      Map: vi.fn(() => mockMap),
      NavigationControl: vi.fn(),
      GeolocateControl: vi.fn(),
      Marker: vi.fn(() => ({
        setLngLat: vi.fn().mockReturnThis(),
        addTo: vi.fn().mockReturnThis(),
        remove: vi.fn(),
        getElement: vi.fn(() => document.createElement('div')),
      })),
      Popup: vi.fn(() => ({
        setLngLat: vi.fn().mockReturnThis(),
        setHTML: vi.fn().mockReturnThis(),
        addTo: vi.fn().mockReturnThis(),
        remove: vi.fn(),
      })),
      accessToken: '',
    },
  }
})

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}))
