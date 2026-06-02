'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Home } from 'lucide-react'
import Link from 'next/link'

const STEPS = [
  { label: 'Géolocalisation du bien...', delay: 0 },
  { label: 'Récupération des transactions DVF...', delay: 2000 },
  { label: "Analyse du DPE (ADEME)...", delay: 4500 },
  { label: 'Génération du score ImmoTest...', delay: 7000 },
]

interface LoadingAnalyseProps {
  isFirstAnalysis?: boolean
}

export function LoadingAnalyse({ isFirstAnalysis = true }: LoadingAnalyseProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timers = STEPS.map(({ delay }, i) => setTimeout(() => setCurrentStep(i), delay))
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      setProgress(Math.min((elapsed / 10000) * 100, 98))
    }, 100)
    return () => {
      timers.forEach(clearTimeout)
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <motion.div
            className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200"
            animate={{
              scale: [1, 1.08, 1],
              rotate: [0, 6, -6, 0],
            }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          >
            <Home size={28} className="text-white" strokeWidth={1.5} />
          </motion.div>
          <h2 className="font-semibold text-lg">Analyse en cours</h2>
          <p className="text-sm text-muted-foreground mt-1">Cela prend environ 10 secondes</p>
        </div>

        <div className="space-y-2">
          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: i <= currentStep ? 1 : 0.3 }}
              className="flex items-center gap-2 text-sm"
            >
              {i < currentStep ? (
                <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px]">
                  ✓
                </span>
              ) : i === currentStep ? (
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="w-4 h-4 rounded-full bg-indigo-500"
                />
              ) : (
                <span className="w-4 h-4 rounded-full bg-muted" />
              )}
              {step.label}
            </motion.div>
          ))}
        </div>

        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-indigo-500"
            animate={{ width: `${progress}%` }}
            transition={{ ease: 'linear' }}
          />
        </div>

        {!isFirstAnalysis && (
          <p className="text-center text-xs text-muted-foreground">
            <Link href="/biens" className="text-indigo-600 hover:underline">
              Continuer à naviguer
            </Link>
            {' '}— vous serez notifié dès que votre analyse est prête.
          </p>
        )}
      </div>
    </div>
  )
}
