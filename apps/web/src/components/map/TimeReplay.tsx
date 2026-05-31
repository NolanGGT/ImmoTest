'use client'

import { Pause, Play, SkipBack } from 'lucide-react'

const YEARS = [2019, 2020, 2021, 2022, 2023, 2024] as const

interface TimeReplayProps {
  year: number
  onYearChange: (year: number) => void
  isPlaying: boolean
  onTogglePlay: () => void
}

export function TimeReplay({ year, onYearChange, isPlaying, onTogglePlay }: TimeReplayProps) {
  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-2.5 flex items-center gap-3 min-w-[260px]">
      <button
        type="button"
        onClick={() => { onYearChange(2019) }}
        className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-500"
        title="Retour à 2019"
      >
        <SkipBack size={13} />
      </button>

      <button
        type="button"
        onClick={onTogglePlay}
        className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors flex-shrink-0"
      >
        {isPlaying ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">2019</span>
          <span className="text-sm font-bold text-indigo-600">{year}</span>
          <span className="text-xs text-gray-400">2024</span>
        </div>
        <input
          type="range"
          min={2019}
          max={2024}
          step={1}
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="w-full h-1.5 accent-indigo-600 cursor-pointer"
        />
        <div className="flex justify-between">
          {YEARS.map((y) => (
            <div
              key={y}
              className={`w-1 h-1 rounded-full ${y <= year ? 'bg-indigo-500' : 'bg-gray-200'}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
