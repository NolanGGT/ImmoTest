'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const ITEMS = [
  { color: '#22c55e', label: 'Score ≥ 70 : Bon plan' },
  { color: '#f97316', label: 'Score 40–69 : Correct' },
  { color: '#ef4444', label: 'Score < 40 : À éviter' },
]

export function ScoreLegend() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 backdrop-blur-sm rounded-xl shadow-sm p-2.5 max-w-44">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center justify-between w-full gap-2 text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium md:cursor-default"
      >
        <span>Légende scores</span>
        <span className="md:hidden">
          {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </span>
      </button>

      <div className={`space-y-1 mt-1.5 ${collapsed ? 'hidden md:block' : ''}`}>
        {ITEMS.map(({ color, label }) => (
          <div key={color} className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
