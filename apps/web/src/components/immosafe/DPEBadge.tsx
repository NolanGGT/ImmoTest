'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

const DPE_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: 'bg-[#009639]', text: 'text-white' },
  B: { bg: 'bg-[#55ab26]', text: 'text-white' },
  C: { bg: 'bg-[#c8d400]', text: 'text-black' },
  D: { bg: 'bg-[#ffcc00]', text: 'text-black' },
  E: { bg: 'bg-[#ff9a00]', text: 'text-white' },
  F: { bg: 'bg-[#ff5000]', text: 'text-white' },
  G: { bg: 'bg-[#ff0000]', text: 'text-white' },
}

interface DpeAnalyse {
  classe: string
  surcoutMensuelEstime: number
  interdictionLocation2028: boolean
  phraseImpact: string
}

interface Props {
  dpeAnalyse: DpeAnalyse
  className?: string
}

export function DPEBadge({ dpeAnalyse, className }: Props) {
  const [expanded, setExpanded] = useState(false)
  const { classe, phraseImpact, interdictionLocation2028, surcoutMensuelEstime } = dpeAnalyse
  const colors = DPE_COLORS[classe] ?? { bg: 'bg-gray-400', text: 'text-white' }
  const isWarning = classe === 'F' || classe === 'G'

  return (
    <div className={cn('rounded-xl border bg-card p-4', className)}>
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg', colors.bg, colors.text)}>
          {classe}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">DPE — Classe {classe}</p>
          <p className="text-xs text-muted-foreground truncate">{phraseImpact}</p>
        </div>
        {isWarning && <AlertTriangle size={16} className="text-orange-500 shrink-0" />}
        <svg
          className={cn('h-4 w-4 shrink-0 transition-transform text-muted-foreground', expanded && 'rotate-180')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t space-y-2 text-sm">
              <p className="text-muted-foreground">{phraseImpact}</p>
              {surcoutMensuelEstime > 0 && (
                <p>Surcoût énergétique estimé : <span className="font-semibold text-orange-600">+{surcoutMensuelEstime} €/mois</span></p>
              )}
              {interdictionLocation2028 && (
                <p className="text-red-600 font-medium flex items-center gap-1.5">
                  <AlertTriangle size={14} />
                  Interdit à la location dès 2028 sans rénovation
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
