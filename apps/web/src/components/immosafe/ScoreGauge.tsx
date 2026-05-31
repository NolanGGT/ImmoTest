'use client'

import { motion } from 'framer-motion'
import { getScoreConfig } from '@/lib/score'
import { cn } from '@/lib/utils'

type Size = 'sm' | 'md' | 'lg'

const SIZES: Record<Size, { dim: number; r: number; sw: number; fontSize: string; labelSize: string }> = {
  sm:  { dim: 64,  r: 26, sw: 4,  fontSize: 'text-base font-bold',  labelSize: 'text-[9px]' },
  md:  { dim: 100, r: 40, sw: 6,  fontSize: 'text-2xl font-bold',   labelSize: 'text-xs' },
  lg:  { dim: 140, r: 58, sw: 8,  fontSize: 'text-4xl font-bold',   labelSize: 'text-sm' },
}

interface Props {
  score: number
  size?: Size
  className?: string
  animate?: boolean
}

export function ScoreGauge({ score, size = 'md', className, animate = true }: Props) {
  const { stroke, label, color } = getScoreConfig(score)
  const { dim, r, sw, fontSize, labelSize } = SIZES[size]
  const cx = dim / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (score / 100) * circumference

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="-rotate-90">
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="currentColor" strokeWidth={sw} className="text-muted/30" />
        <motion.circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={animate ? { strokeDashoffset: circumference } : { strokeDashoffset: offset }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn(fontSize, color)}>{score}</span>
        {size !== 'sm' && <span className={cn(labelSize, 'text-muted-foreground mt-0.5')}>{label}</span>}
      </div>
    </div>
  )
}
