'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

type Niveau = 'INFO' | 'ATTENTION' | 'CRITIQUE'

const NIVEAU_CONFIG: Record<Niveau, { border: string; label: string; labelColor: string }> = {
  CRITIQUE:  { border: 'border-l-red-500',    label: 'CRITIQUE',  labelColor: 'text-red-600' },
  ATTENTION: { border: 'border-l-orange-400', label: 'ATTENTION', labelColor: 'text-orange-600' },
  INFO:      { border: 'border-l-blue-400',   label: 'INFO',      labelColor: 'text-blue-600' },
}

interface Props {
  niveau: Niveau
  titre: string
  explication: string
}

export function PointVigilanceItem({ niveau, titre, explication }: Props) {
  const [open, setOpen] = useState(niveau === 'CRITIQUE')
  const cfg = NIVEAU_CONFIG[niveau]

  return (
    <div
      className={cn('border-l-4 pl-3 py-2 cursor-pointer', cfg.border)}
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className={cn('text-[10px] font-semibold uppercase tracking-wide', cfg.labelColor)}>{cfg.label}</span>
          <p className="text-sm font-medium mt-0.5">{titre}</p>
        </div>
        <svg
          className={cn('h-4 w-4 shrink-0 mt-1 transition-transform text-muted-foreground', open && 'rotate-180')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      <AnimatePresence>
        {open && (
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="text-sm text-muted-foreground mt-1.5 overflow-hidden"
          >
            {explication}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
