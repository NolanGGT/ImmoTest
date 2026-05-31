'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Props {
  index: number
  question: string
  pourquoi: string
}

export function QuestionCard({ index, question, pourquoi }: Props) {
  const [showPourquoi, setShowPourquoi] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(question)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center mt-0.5">
          {index}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{question}</p>
          <button
            onClick={() => setShowPourquoi(!showPourquoi)}
            className="mt-1.5 text-xs text-indigo-600 hover:underline"
          >
            {showPourquoi ? 'Masquer' : 'Pourquoi cette question ?'}
          </button>
          <AnimatePresence>
            {showPourquoi && (
              <motion.p
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="mt-1.5 text-xs text-muted-foreground overflow-hidden"
              >
                {pourquoi}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={copy}
          className={cn('shrink-0 p-1.5 rounded-md transition-colors', copied ? 'text-green-600' : 'text-muted-foreground hover:text-foreground hover:bg-accent')}
          title="Copier"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  )
}
