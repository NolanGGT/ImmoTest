'use client'

import dynamic from 'next/dynamic'
import type { BienMapData } from './ImmoSafeMap'

interface MapWrapperProps {
  biens: BienMapData[]
}

const DynamicMap = dynamic<MapWrapperProps>(
  () => import('./ImmoSafeMap').then((mod) => mod.ImmoSafeMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
        <span className="text-gray-400 text-sm">Chargement de la carte...</span>
      </div>
    ),
  }
)

export function MapWrapper({ biens }: MapWrapperProps) {
  return <DynamicMap biens={biens} />
}
