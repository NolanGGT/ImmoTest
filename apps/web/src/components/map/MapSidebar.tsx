'use client'

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Loader2, X, Search, MapPin, Crosshair } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { LAYERS, LAYER_GROUPS, MAP_STYLES, type LayerType } from '@/lib/map'
import { formatPrix, getScoreConfig } from '@/lib/score'
import type { BienMapData } from './ImmoSafeMap'
import type { PersonalPoint } from '@/lib/mapUtils'

const COLORS = [
  '#7c3aed',
  '#4f46e5',
  '#0891b2',
  '#16a34a',
  '#dc2626',
  '#d97706',
]

interface AddPointFormProps {
  onAdd: (data: { label: string; latitude: number; longitude: number; color: string }) => void
  isLoading: boolean
  onActivatePlacingMode: () => void
  isPlacingMode: boolean
  placedCoords: { lat: number; lon: number } | null
  onClearPlacedCoords: () => void
}

interface AddrSuggestion {
  label: string
  lat: number
  lon: number
}

function AddPointForm({
  onAdd,
  isLoading,
  onActivatePlacingMode,
  isPlacingMode,
  placedCoords,
  onClearPlacedCoords,
}: AddPointFormProps) {
  const [label, setLabel] = useState('')
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [color, setColor] = useState('#7c3aed')
  const [addrQuery, setAddrQuery] = useState('')
  const [suggestions, setSuggestions] = useState<AddrSuggestion[]>([])
  const [addrLoading, setAddrLoading] = useState(false)
  const [addrOpen, setAddrOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync map-placed coords into pending coords
  useEffect(() => {
    if (placedCoords) {
      setPendingCoords(placedCoords)
    }
  }, [placedCoords])

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 3) { setSuggestions([]); setAddrOpen(false); return }
    setAddrLoading(true)
    try {
      const res = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5`
      )
      const data = await res.json() as {
        features?: { properties: { label: string }; geometry: { coordinates: [number, number] } }[]
      }
      const items: AddrSuggestion[] = (data.features ?? []).map((f) => ({
        label: f.properties.label,
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
      }))
      setSuggestions(items)
      setAddrOpen(items.length > 0)
    } catch {
      setSuggestions([])
    } finally {
      setAddrLoading(false)
    }
  }, [])

  const handleAddrChange = (value: string) => {
    setAddrQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300)
  }

  const handleSelectAddr = (s: AddrSuggestion) => {
    setAddrQuery('')
    setSuggestions([])
    setAddrOpen(false)
    setPendingCoords({ lat: s.lat, lon: s.lon })
  }

  const handleCancel = () => {
    setPendingCoords(null)
    setLabel('')
    setAddrQuery('')
    setSuggestions([])
    onClearPlacedCoords()
  }

  const handleSubmit = () => {
    if (!pendingCoords || !label.trim()) return
    onAdd({
      label: label.trim().slice(0, 50),
      latitude: pendingCoords.lat,
      longitude: pendingCoords.lon,
      color,
    })
    setPendingCoords(null)
    setLabel('')
    setColor('#7c3aed')
    onClearPlacedCoords()
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAddrOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (isPlacingMode) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-violet-600 font-medium">Cliquez sur la carte pour placer votre point</p>
        <button
          type="button"
          onClick={onActivatePlacingMode}
          className="w-full text-xs py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Annuler
        </button>
      </div>
    )
  }

  if (pendingCoords) {
    return (
      <div className="space-y-2">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value.slice(0, 50))}
          placeholder="Nom de ce point…"
          maxLength={50}
          className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
        />
        <div className="flex gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={[
                'w-5 h-5 rounded-full border-2 transition-transform',
                color === c ? 'border-foreground/80 scale-110' : 'border-transparent',
              ].join(' ')}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 text-xs py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!label.trim() || isLoading}
            className="flex-1 text-xs py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Ajouter'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2" ref={containerRef}>
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
        <input
          type="text"
          value={addrQuery}
          onChange={(e) => handleAddrChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setAddrOpen(true)}
          placeholder="Rechercher une adresse…"
          className="w-full pl-8 pr-7 py-2 text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {addrLoading && <Loader2 size={12} className="animate-spin text-gray-400 dark:text-gray-500" />}
          {!addrLoading && addrQuery && (
            <button type="button" onClick={() => { setAddrQuery(''); setSuggestions([]) }}>
              <X size={12} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
            </button>
          )}
        </div>
        {addrOpen && suggestions.length > 0 && (
          <div className="absolute top-full mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelectAddr(s) }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-violet-50 dark:hover:bg-violet-950/30 hover:text-violet-700 dark:hover:text-violet-300 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0 flex items-start gap-1.5"
              >
                <MapPin size={11} className="mt-0.5 flex-shrink-0 text-muted-foreground/60" />
                <span className="leading-snug">{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        <span>ou</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      <button
        type="button"
        onClick={onActivatePlacingMode}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-violet-300 hover:text-violet-600"
      >
        <Crosshair size={13} />
        Pointer sur la carte
      </button>
    </div>
  )
}

interface MapSidebarProps {
  biens: BienMapData[]
  selectedBienIds: Set<string>
  onToggleBien: (id: string) => void
  onSelectAllBiens: () => void
  onDeselectAllBiens: () => void
  filterStatut: string | null
  onFilterStatut: (statut: string | null) => void

  personalPoints: PersonalPoint[]
  canAdd: boolean
  onAddPoint: (data: { label: string; latitude: number; longitude: number; color: string }) => void
  isAddingPoint: boolean
  onUpdatePointRadius: (id: string, radiusKm: number) => void
  onDeletePoint: (id: string) => void
  isPlacingMode: boolean
  onActivatePlacingMode: () => void
  placedCoords: { lat: number; lon: number } | null
  onClearPlacedCoords: () => void

  activeLayers: Set<LayerType>
  loadingLayer: LayerType | null
  onToggleLayer: (layer: LayerType) => void

  heatmapActive: boolean
  onToggleHeatmap: () => void

  currentStyle: string
  onChangeStyle: (style: string) => void
  showNativePOI: boolean
  onToggleNativePOI: (show: boolean) => void
}

const STATUT_OPTIONS: { value: string | null; label: string }[] = [
  { value: null, label: 'Tous' },
  { value: 'EN_COURS', label: '🔍 En cours' },
  { value: 'VISITE_PLANIFIEE', label: '📅 Visite' },
  { value: 'OFFRE_FAITE', label: '✍️ Offre' },
  { value: 'ABANDONNE', label: '❌ Abandonné' },
]

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={[
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
        'focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-indigo-600' : 'bg-muted',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}

function SidebarSection({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string
  icon: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {icon} {title}
        </span>
        <ChevronDown
          size={14}
          className={`text-gray-400 dark:text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function LayerGroup({
  label,
  icon,
  layerIds,
  activeLayers,
  loadingLayer,
  onToggleLayer,
}: {
  label: string
  icon: string
  layerIds: LayerType[]
  activeLayers: Set<LayerType>
  loadingLayer: LayerType | null
  onToggleLayer: (layer: LayerType) => void
}) {
  const [open, setOpen] = useState(false)
  const layers = LAYERS.filter((l) => layerIds.includes(l.id))
  const activeCount = layerIds.filter((id) => activeLayers.has(id)).length

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
          {activeCount > 0 && (
            <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none">
              {activeCount}
            </span>
          )}
        </div>
        <ChevronDown
          size={12}
          className={`text-gray-400 dark:text-gray-500 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-t border-gray-100 dark:border-gray-700"
          >
            <div className="px-3 py-2 space-y-0.5">
              {layers.map((layer) => {
                const isActive = activeLayers.has(layer.id)
                return (
                  <div key={layer.id} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm flex-shrink-0">{layer.emoji}</span>
                      <span
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0 transition-opacity"
                        style={{ backgroundColor: layer.color, opacity: isActive ? 1 : 0.3 }}
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{layer.label}</span>
                      {loadingLayer === layer.id && (
                        <Loader2 size={11} className="animate-spin text-gray-400 dark:text-gray-500 flex-shrink-0" />
                      )}
                    </div>
                    <Toggle
                      checked={isActive}
                      onChange={() => onToggleLayer(layer.id)}
                      disabled={loadingLayer !== null && loadingLayer !== layer.id}
                    />
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function MapSidebar({
  biens,
  selectedBienIds,
  onToggleBien,
  onSelectAllBiens,
  onDeselectAllBiens,
  filterStatut,
  onFilterStatut,
  personalPoints,
  canAdd,
  onAddPoint,
  isAddingPoint,
  onUpdatePointRadius,
  onDeletePoint,
  isPlacingMode,
  onActivatePlacingMode,
  placedCoords,
  onClearPlacedCoords,
  activeLayers,
  loadingLayer,
  onToggleLayer,
  heatmapActive,
  onToggleHeatmap,
  currentStyle,
  onChangeStyle,
  showNativePOI,
  onToggleNativePOI,
}: MapSidebarProps) {
  const allSelected = biens.length > 0 && selectedBienIds.size >= biens.length

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">

      {/* ── Mes biens ── */}
      <SidebarSection title="Mes biens" icon="📍">
        <div className="flex gap-1 overflow-x-auto pb-1 mb-2 scrollbar-hide">
          {STATUT_OPTIONS.map(({ value, label }) => (
            <button
              key={value ?? 'all'}
              type="button"
              onClick={() => onFilterStatut(value)}
              className={[
                'flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium transition-colors',
                filterStatut === value
                  ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {biens.length > 0 && (
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer select-none">
              <Checkbox
                checked={allSelected}
                onChange={(e) => e.target.checked ? onSelectAllBiens() : onDeselectAllBiens()}
              />
              Tout sélectionner
            </label>
            <span className="text-xs text-gray-400 dark:text-gray-500">{selectedBienIds.size}/{biens.length}</span>
          </div>
        )}

        {biens.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">Aucun bien</p>
        ) : (
          <div className="space-y-0.5 max-h-52 overflow-y-auto">
            {biens.map((bien) => {
              const cfg = getScoreConfig(bien.scoreImmoSafe)
              return (
                <label
                  key={bien.id}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer select-none"
                >
                  <Checkbox
                    checked={selectedBienIds.has(bien.id)}
                    onChange={() => onToggleBien(bien.id)}
                  />
                  <span
                    className={[
                      'w-2 h-2 rounded-full flex-shrink-0',
                      bien.scoreImmoSafe >= 70
                        ? 'bg-green-500'
                        : bien.scoreImmoSafe >= 40
                        ? 'bg-orange-500'
                        : 'bg-red-500',
                    ].join(' ')}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{bien.ville}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{formatPrix(bien.prix)}</p>
                  </div>
                  <span className={`text-xs font-bold flex-shrink-0 ${cfg.color}`}>
                    {bien.scoreImmoSafe}
                  </span>
                </label>
              )
            })}
          </div>
        )}
      </SidebarSection>

      {/* ── Mes points ── */}
      <SidebarSection title="Mes points" icon="📌" defaultOpen={true}>
        {personalPoints.length > 0 && (
          <div className="space-y-2 mb-3">
            {personalPoints.map((point) => (
              <div key={point.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2">
                <div className="flex items-center gap-2 group">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: point.color }}
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300 flex-1 truncate font-medium">{point.label}</span>
                  <button
                    type="button"
                    onClick={() => onDeletePoint(point.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 transition"
                  >
                    <X size={12} />
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 w-14 shrink-0">
                    {point.radiusKm > 0 ? `${point.radiusKm} km` : 'Aucune zone'}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    step={1}
                    value={point.radiusKm}
                    onChange={(e) => onUpdatePointRadius(point.id, Number(e.target.value))}
                    className="flex-1 h-1 accent-violet-600 dark:accent-violet-400 cursor-pointer"
                    style={{ accentColor: point.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{personalPoints.length}/10 points</p>

        {canAdd ? (
          <AddPointForm
            onAdd={onAddPoint}
            isLoading={isAddingPoint}
            onActivatePlacingMode={onActivatePlacingMode}
            isPlacingMode={isPlacingMode}
            placedCoords={placedCoords}
            onClearPlacedCoords={onClearPlacedCoords}
          />
        ) : (
          <p className="text-xs text-orange-500">
            Limite atteinte (10/10). Supprimez un point pour en ajouter.
          </p>
        )}
      </SidebarSection>

      {/* ── Calques ── */}
      <SidebarSection title="Calques" icon="🗺️">
        <div className="space-y-1.5">
          {LAYER_GROUPS.map((group) => (
            <LayerGroup
              key={group.label}
              label={group.label}
              icon={group.icon}
              layerIds={group.layers}
              activeLayers={activeLayers}
              loadingLayer={loadingLayer}
              onToggleLayer={onToggleLayer}
            />
          ))}

          <div className="flex items-center justify-between py-1 border-t border-gray-100 dark:border-gray-700 mt-1 pt-2">
            <div className="flex items-center gap-2">
              <span>🏪</span>
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">Labels Mapbox</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Commerces & lieux</p>
              </div>
            </div>
            <Toggle checked={showNativePOI} onChange={() => onToggleNativePOI(!showNativePOI)} />
          </div>
        </div>
      </SidebarSection>

      {/* ── Carte des prix ── */}
      <SidebarSection title="Carte des prix" icon="💶" defaultOpen={false}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Prix au m² Paris</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">Par arrondissement, 2019–2024</p>
            </div>
            <Toggle checked={heatmapActive} onChange={onToggleHeatmap} />
          </div>
          {heatmapActive && (
            <div className="mt-1">
              <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 mb-1">
                <span>7 000 €</span>
                <span>17 000 € /m²</span>
              </div>
              <div className="h-2 rounded-full" style={{
                background: 'linear-gradient(to right, #ffffb2, #fecc5c, #fd8d3c, #f03b20, #bd0026, #800026)'
              }} />
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 text-center">
                Utilisez le curseur temporel sur la carte
              </p>
            </div>
          )}
        </div>
      </SidebarSection>

      {/* ── Style ── */}
      <SidebarSection title="Style" icon="🎨">
        <div className="space-y-1.5">
          {[['streets', 'satellite'], ['light', 'dark']].map((row, i) => (
            <div key={i} className="grid grid-cols-2 gap-1.5">
              {row.map((styleId) => {
                const style = MAP_STYLES.find((s) => s.id === styleId)!
                return (
                  <button
                    key={styleId}
                    type="button"
                    onClick={() => onChangeStyle(styleId)}
                    className={[
                      'py-1.5 rounded-lg text-xs font-medium transition border',
                      currentStyle === styleId
                        ? 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-400 text-indigo-700 dark:text-indigo-300'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500',
                    ].join(' ')}
                  >
                    {style.label}{currentStyle === styleId && ' ✓'}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </SidebarSection>

    </div>
  )
}
