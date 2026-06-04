'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

const themes = [
  { value: 'light', icon: Sun, label: 'Clair' },
  { value: 'dark', icon: Moon, label: 'Sombre' },
  { value: 'system', icon: Monitor, label: 'Système' },
] as const

interface ThemeToggleProps {
  showSystem?: boolean
  showLabels?: boolean
}

export function ThemeToggle({ showSystem = true, showLabels = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const visible = showSystem ? themes : themes.filter((t) => t.value !== 'system')

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
      {visible.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          title={label}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors',
            theme === value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Icon size={14} />
          {showLabels && <span className="text-xs">{label}</span>}
        </button>
      ))}
    </div>
  )
}
