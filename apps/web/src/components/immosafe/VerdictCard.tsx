'use client'

import { ScoreGauge } from './ScoreGauge'
import { getScoreConfig, formatPrix } from '@/lib/score'
import { cn } from '@/lib/utils'

interface Props {
  score: number
  syntheseTexte: string
  ville: string
  prix: number
  typeBien: string
}

export function VerdictCard({ score, syntheseTexte, ville, prix, typeBien }: Props) {
  const cfg = getScoreConfig(score)

  return (
    <div className={cn('rounded-2xl border-l-4 p-5 flex gap-5 items-start', cfg.bg, cfg.border)}>
      <ScoreGauge score={score} size="lg" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn('text-sm font-semibold uppercase tracking-wide', cfg.color)}>{cfg.emoji} {cfg.label}</span>
        </div>
        <p className="text-sm font-medium text-foreground/80 mb-2">{typeBien} · {ville} · {formatPrix(prix)}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{syntheseTexte}</p>
      </div>
    </div>
  )
}
