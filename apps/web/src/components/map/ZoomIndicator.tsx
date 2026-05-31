'use client'

import { ZOOM_THRESHOLDS } from '@/lib/map'

interface ZoomIndicatorProps {
  zoom: number
}

export function ZoomIndicator({ zoom }: ZoomIndicatorProps) {
  const level =
    zoom >= ZOOM_THRESHOLDS.STREET_LEVEL
      ? { label: 'Rue', color: 'text-green-600' }
      : zoom >= ZOOM_THRESHOLDS.LABELS_APPEAR
      ? { label: 'Quartier', color: 'text-indigo-600' }
      : zoom >= ZOOM_THRESHOLDS.CLUSTERS_DISSOLVE
      ? { label: 'Ville', color: 'text-orange-500' }
      : { label: 'Région', color: 'text-gray-500' }

  return (
    <div className="absolute bottom-20 right-14 z-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 shadow-md flex items-center gap-1.5 select-none pointer-events-none">
      <span className={`text-[10px] font-semibold ${level.color}`}>{level.label}</span>
      <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">{zoom.toFixed(1)}</span>
    </div>
  )
}
