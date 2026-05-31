'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, Loader2, MapPin, Crosshair, Trash2 } from 'lucide-react'
interface LocalPoint {
  lat: number
  lon: number
  label: string
}

interface Suggestion {
  label: string
  lat: number
  lon: number
}

interface PointPersonnaliseProps {
  point: LocalPoint | null
  onSet: (point: LocalPoint) => void
  onClear: () => void
  isPlacingMode: boolean
  onTogglePlacingMode: () => void
}

export function PointPersonnalise({
  point,
  onSet,
  onClear,
  isPlacingMode,
  onTogglePlacingMode,
}: PointPersonnaliseProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState(point?.label ?? '')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLabel(point?.label ?? '')
  }, [point])

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 3) { setSuggestions([]); setOpen(false); return }
    setLoading(true)
    try {
      const res = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5`
      )
      const data = await res.json() as {
        features?: { properties: { label: string }; geometry: { coordinates: [number, number] } }[]
      }
      const items: Suggestion[] = (data.features ?? []).map((f) => ({
        label: f.properties.label,
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
      }))
      setSuggestions(items)
      setOpen(items.length > 0)
    } catch {
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300)
  }

  const handleSelect = (s: Suggestion) => {
    setQuery('')
    setSuggestions([])
    setOpen(false)
    onSet({ lat: s.lat, lon: s.lon, label: 'Mon point' })
  }

  const handleClearInput = () => {
    setQuery('')
    setSuggestions([])
    setOpen(false)
  }

  const handleLabelChange = (newLabel: string) => {
    setLabel(newLabel)
    if (point) onSet({ ...point, label: newLabel })
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (point) {
    return (
      <div className="space-y-2">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Libellé</label>
          <input
            type="text"
            value={label}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder="Ex : Mon bureau"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
          />
        </div>
        <p className="text-xs text-gray-400 font-mono">
          {point.lat.toFixed(4)}, {point.lon.toFixed(4)}
        </p>
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors"
        >
          <Trash2 size={12} />
          Supprimer ce point
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2" ref={containerRef}>
      {/* Address autocomplete */}
      <div className="relative">
        <Search
          size={13}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Rechercher une adresse…"
          className="w-full pl-8 pr-7 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {loading && <Loader2 size={12} className="animate-spin text-gray-400" />}
          {!loading && query && (
            <button type="button" onClick={handleClearInput}>
              <X size={12} className="text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {open && suggestions.length > 0 && (
          <div className="absolute top-full mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-100 z-50 overflow-hidden">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s) }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-violet-50 hover:text-violet-700 transition-colors border-b border-gray-50 last:border-0 flex items-start gap-1.5"
              >
                <MapPin size={11} className="mt-0.5 flex-shrink-0 text-gray-400" />
                <span className="leading-snug">{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400">
        <div className="flex-1 h-px bg-gray-200" />
        <span>ou</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <button
        type="button"
        onClick={onTogglePlacingMode}
        className={[
          'w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors border',
          isPlacingMode
            ? 'bg-violet-600 text-white border-violet-600'
            : 'border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-600',
        ].join(' ')}
      >
        <Crosshair size={13} />
        {isPlacingMode ? 'Annuler le placement' : 'Cliquer sur la carte'}
      </button>
    </div>
  )
}
