'use client'

import Link from 'next/link'
import { Map } from 'lucide-react'

export function EmptyMapState() {
  return (
    <div className="w-full h-full min-h-64 rounded-xl bg-gray-100 flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-4">
        <Map size={28} className="text-gray-400" />
      </div>
      <h3 className="font-semibold text-gray-700 mb-1">Aucun bien à afficher</h3>
      <p className="text-sm text-gray-500 max-w-xs mb-4">
        Analysez un bien avec une adresse précise pour le voir sur la carte.
      </p>
      <Link
        href="/analyser"
        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
      >
        Analyser un bien
      </Link>
    </div>
  )
}
