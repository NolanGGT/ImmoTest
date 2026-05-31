'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatPrix } from '@/lib/score'

interface Negociation {
  margeEstimee: number
  prixCibleMin: number
  prixCibleMax: number
  phraseActionnable: string
  argumentsNegociation: string[]
}

interface Props {
  negociation: Negociation
}

export function NegociationBlock({ negociation }: Props) {
  const [showArgs, setShowArgs] = useState(false)
  const { margeEstimee, prixCibleMin, prixCibleMax, phraseActionnable, argumentsNegociation } = negociation

  return (
    <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 p-5">
      <h3 className="font-semibold text-sm text-indigo-900 dark:text-indigo-200 mb-3">Marge de négociation</h3>
      <p className="text-sm text-indigo-800 dark:text-indigo-300">
        <span className="font-bold">{phraseActionnable}</span>
      </p>
      <div className="mt-3 flex items-center gap-4">
        <div className="text-center">
          <p className="text-xs text-indigo-500 dark:text-indigo-400 uppercase tracking-wide">Marge estimée</p>
          <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">{margeEstimee} %</p>
        </div>
        <div className="h-8 w-px bg-indigo-200 dark:bg-indigo-800/50" />
        <div className="text-center">
          <p className="text-xs text-indigo-500 dark:text-indigo-400 uppercase tracking-wide">Prix cible</p>
          <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
            {formatPrix(prixCibleMin)} – {formatPrix(prixCibleMax)}
          </p>
        </div>
      </div>
      <button
        onClick={() => setShowArgs(!showArgs)}
        className="mt-4 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        {showArgs ? 'Masquer les arguments' : `Voir les ${argumentsNegociation.length} arguments`}
      </button>
      <AnimatePresence>
        {showArgs && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 space-y-1.5 overflow-hidden"
          >
            {argumentsNegociation.map((arg, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-indigo-800 dark:text-indigo-300">
                <span className="shrink-0 text-indigo-400 dark:text-indigo-500 mt-0.5">›</span>
                {arg}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
