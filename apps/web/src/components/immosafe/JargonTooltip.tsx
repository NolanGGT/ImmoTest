'use client'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getJargonDef } from '@/lib/jargon'
import { cn } from '@/lib/utils'

interface Props {
  term: string
  children?: React.ReactNode
  className?: string
}

export function JargonTooltip({ term, children, className }: Props) {
  const def = getJargonDef(term)
  if (!def) return <span className={className}>{children ?? term}</span>

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'cursor-help border-b border-dotted border-muted-foreground/50 hover:border-foreground/50 transition-colors',
            className
          )}
        >
          {children ?? term}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-left">{def}</TooltipContent>
    </Tooltip>
  )
}
