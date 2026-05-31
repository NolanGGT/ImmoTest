'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { getMarkerColor } from '@/lib/map'

interface StaticMapProps {
  lat: number
  lon: number
  score: number
  bienId: string
  width?: number
  height?: number
}

export function StaticMap({ lat, lon, score, bienId, width = 600, height = 200 }: StaticMapProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) return null

  const color = getMarkerColor(score).replace('#', '')
  const markerUrl = `pin-s-home+${color}(${lon},${lat})`
  const imageUrl =
    `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${markerUrl}/${lon},${lat},14,0/${width}x${height}@2x?access_token=${token}`

  return (
    <div className="rounded-xl overflow-hidden border border-border relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="Localisation du bien"
        width={width}
        height={height}
        className="w-full object-cover"
        style={{ height }}
        loading="lazy"
      />
      <Link
        href="/carte"
        className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm text-xs font-medium text-gray-700 shadow-sm hover:bg-white transition-colors border border-gray-200"
      >
        <ExternalLink size={11} />
        Ouvrir dans la carte
      </Link>
    </div>
  )
}
