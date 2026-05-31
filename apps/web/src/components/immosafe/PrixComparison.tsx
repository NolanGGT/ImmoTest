'use client'

import { motion } from 'framer-motion'
import { formatPrixM2, formatEcart } from '@/lib/score'
import { cn } from '@/lib/utils'

interface PrixAnalyse {
  prixM2Bien: number
  prixM2Marche: number
  ecartPourcentage: number
  phraseVerdict: string
}

interface Props {
  prixAnalyse: PrixAnalyse
}

export function PrixComparison({ prixAnalyse }: Props) {
  const { prixM2Bien, prixM2Marche, ecartPourcentage, phraseVerdict } = prixAnalyse
  const max = Math.max(prixM2Bien, prixM2Marche) * 1.1
  const bienPct = (prixM2Bien / max) * 100
  const marchePct = (prixM2Marche / max) * 100
  const overpriced = prixM2Bien > prixM2Marche

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-sm mb-0.5">Prix au m²</h3>
        <p className="text-xs text-muted-foreground">{phraseVerdict}</p>
      </div>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Ce bien</span>
            <span className={cn('font-semibold', overpriced ? 'text-red-600' : 'text-green-600')}>
              {formatPrixM2(prixM2Bien)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className={cn('h-full rounded-full', overpriced ? 'bg-red-400' : 'bg-green-400')}
              initial={{ width: 0 }}
              animate={{ width: `${bienPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Marché</span>
            <span className="font-semibold">{formatPrixM2(prixM2Marche)}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gray-400"
              initial={{ width: 0 }}
              animate={{ width: `${marchePct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            />
          </div>
        </div>
      </div>
      <p className={cn('text-sm font-medium', overpriced ? 'text-red-600' : 'text-green-600')}>
        {overpriced ? '↑' : '↓'} {formatEcart(Math.abs(ecartPourcentage))} par rapport au marché
      </p>
    </div>
  )
}
