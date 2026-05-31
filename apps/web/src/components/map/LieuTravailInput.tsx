'use client'

import { useState, useRef, useEffect } from 'react'
import { Briefcase, X, Loader2 } from 'lucide-react'

interface LieuTravail {
  lat: number
  lon: number
  label: string
}

interface Suggestion {
  label: string
  lat: number
  lon: number
}

interface LieuTravailInputProps {
  onConfirm: (lieu: LieuTravail) => void
  onClear: () => void
  currentLieu?: { label: string } | null
}

export function LieuTravailInput({ onConfirm, onClear, currentLieu }: LieuTravailInputProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`
        )
        const data = await res.json()
        const results: Suggestion[] = (data.features ?? []).map(
          (f: { properties: { label: string }; geometry: { coordinates: [number, number] } }) => ({
            label: f.properties.label,
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
          })
        )
        setSuggestions(results)
        setIsOpen(results.length > 0)
      } catch {
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (s: Suggestion) => {
    onConfirm({ lat: s.lat, lon: s.lon, label: s.label })
    setQuery(s.label)
    setSuggestions([])
    setIsOpen(false)
  }

  if (currentLieu) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium">
        <Briefcase size={13} />
        <span className="max-w-40 truncate">{currentLieu.label}</span>
        <button
          onClick={onClear}
          className="ml-1 p-0.5 rounded hover:bg-indigo-700 transition-colors"
          aria-label="Supprimer le lieu de travail"
        >
          <X size={12} />
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
        {isLoading ? (
          <Loader2 size={13} className="text-gray-400 animate-spin flex-shrink-0" />
        ) : (
          <Briefcase size={13} className="text-gray-400 flex-shrink-0" />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder="Lieu de travail..."
          className="text-sm outline-none bg-transparent w-40 placeholder:text-gray-400"
        />
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full right-0 mt-1 w-72 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(s)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
