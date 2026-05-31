'use client'

import { Loader2 } from 'lucide-react'
import { LAYERS, type LayerType } from '@/lib/map'

interface LayersPanelProps {
  activeLayers: Set<LayerType>
  loadingLayer: LayerType | null
  onToggle: (layer: LayerType) => void
}

export function LayersPanel({ activeLayers, loadingLayer, onToggle }: LayersPanelProps) {
  return (
    <div className="bg-white rounded-xl shadow-md p-3 max-w-48">
      <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-2">Calques</p>
      <div className="flex flex-col gap-1.5">
        {LAYERS.map((layer) => {
          const isActive = activeLayers.has(layer.id)
          const isLoading = loadingLayer === layer.id

          return (
            <button
              key={layer.id}
              onClick={() => !isLoading && onToggle(layer.id)}
              disabled={isLoading}
              className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'text-white shadow-sm'
                  : 'text-gray-600 bg-gray-50 hover:bg-gray-100'
              }`}
              style={isActive ? { backgroundColor: layer.color } : undefined}
            >
              <span className="flex items-center gap-1.5">
                {isLoading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <span>{layer.emoji}</span>
                )}
                {layer.label}
              </span>
              <span
                className={`w-7 h-3.5 rounded-full transition-colors flex-shrink-0 ${
                  isActive ? 'bg-white/40' : 'bg-gray-300'
                }`}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
