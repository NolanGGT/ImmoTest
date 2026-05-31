'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, Loader2, MapPin } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

interface Suggestion {
  label: string
  lat: number
  lon: number
}

interface MapAddressSearchProps {
  onSelect: (label: string, lat: number, lon: number) => void
  onClear: () => void
}

export function MapAddressSearch({ onSelect, onClear }: MapAddressSearchProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Suggestion | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [highlightIdx, setHighlightIdx] = useState(-1)

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 3) { setSuggestions([]); setOpen(false); return }
    setLoading(true)
    try {
      const res = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=6`
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
      setHighlightIdx(-1)
      setOpen(items.length > 0)
    } catch {
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    setSelected(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 280)
  }

  const handleSelect = (s: Suggestion) => {
    setQuery(s.label)
    setSuggestions([])
    setOpen(false)
    setSelected(s)
    onSelect(s.label, s.lat, s.lon)
    inputRef.current?.blur()
  }

  const handleClear = () => {
    setQuery('')
    setSuggestions([])
    setOpen(false)
    setSelected(null)
    onClear()
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault()
      handleSelect(suggestions[highlightIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div
      ref={containerRef}
      className="absolute top-3 left-1/2 -translate-x-1/2 z-20 w-80 max-w-[calc(100%-5rem)]"
    >
      {/* Input */}
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher une adresse…"
          className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl bg-white shadow-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder:text-gray-400"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
          {loading && <Loader2 size={14} className="text-gray-400 animate-spin" />}
          {!loading && query && (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 transition-colors p-0.5 rounded"
              aria-label="Effacer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {open && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full mt-1.5 w-full bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
          >
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s) }}
                className={[
                  'w-full text-left px-3 py-2.5 text-sm transition-colors flex items-start gap-2',
                  'border-b border-gray-50 last:border-0',
                  i === highlightIdx ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700',
                ].join(' ')}
              >
                <MapPin size={13} className="mt-0.5 flex-shrink-0 text-gray-400" />
                <span className="leading-snug">{s.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected address card */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-1.5 w-full bg-white rounded-xl shadow-xl border border-indigo-100 overflow-hidden"
          >
            <div className="px-3 py-2.5 flex items-start gap-2">
              <div className="mt-0.5 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                <MapPin size={11} className="text-white" />
              </div>
              <p className="text-xs text-gray-700 leading-snug flex-1 min-w-0">{selected.label}</p>
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mt-0.5"
                aria-label="Supprimer le point"
              >
                <X size={14} />
              </button>
            </div>
            <div className="border-t border-gray-100 px-3 py-2 flex items-center gap-2">
              <Link
                href={`/analyser?lat=${selected.lat}&lon=${selected.lon}&adresse=${encodeURIComponent(selected.label)}`}
                className="flex-1 text-center text-xs font-medium bg-indigo-600 text-white py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Analyser ce bien
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
