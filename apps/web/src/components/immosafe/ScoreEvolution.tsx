'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface ScoreEvolutionProps {
  historiqueScores: number[]
  currentScore: number
}

function ScoreDot({ score, isCurrent }: { score: number; isCurrent?: boolean }) {
  const color =
    score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-amber-400' : 'bg-red-500'

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`rounded-full flex items-center justify-center text-white font-bold ${
          isCurrent ? 'w-10 h-10 text-sm ring-2 ring-offset-2 ring-indigo-500' : 'w-8 h-8 text-xs'
        } ${color}`}
      >
        {score}
      </div>
    </div>
  )
}

export function ScoreEvolution({ historiqueScores, currentScore }: ScoreEvolutionProps) {
  if (historiqueScores.length === 0) return null

  const allScores = [...historiqueScores, currentScore]
  const lastOld = historiqueScores[historiqueScores.length - 1]
  const delta = currentScore - lastOld

  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus
  const trendColor = delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-500' : 'text-muted-foreground'

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Évolution du score</h3>
        <div className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
          <TrendIcon size={15} />
          {delta !== 0 ? `${delta > 0 ? '+' : ''}${delta} pts` : 'Stable'}
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {allScores.map((score, i) => {
          const isCurrent = i === allScores.length - 1
          const isLast = i === allScores.length - 2

          return (
            <div key={i} className="flex items-center gap-2 shrink-0">
              <ScoreDot score={score} isCurrent={isCurrent} />
              {!isCurrent && (
                <div className={`h-px w-6 ${isLast ? 'bg-indigo-400' : 'bg-muted-foreground/30'}`} />
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        {historiqueScores.length} analyse{historiqueScores.length > 1 ? 's' : ''} précédente{historiqueScores.length > 1 ? 's' : ''}
      </p>
    </div>
  )
}
