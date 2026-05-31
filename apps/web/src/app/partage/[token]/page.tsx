'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import axios from 'axios'
import { ArrowRight, Eye } from 'lucide-react'
import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { VerdictCard } from '@/components/immosafe/VerdictCard'
import { PrixComparison } from '@/components/immosafe/PrixComparison'
import { DPEBadge } from '@/components/immosafe/DPEBadge'
import { NegociationBlock } from '@/components/immosafe/NegociationBlock'
import { PointVigilanceItem } from '@/components/immosafe/PointVigilanceItem'
import type { AnalyseResult } from '@immosafe/shared-types'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011'

const NIVEAU_ORDER = { CRITIQUE: 0, ATTENTION: 1, INFO: 2 }

interface SharedBien {
  id: string
  titre: string | null
  prix: number
  surface: number
  typeBien: string
  ville: string
  codePostal: string
  scoreImmoSafe: number | null
  analyse: AnalyseResult | null
  createdAt: string
}

interface PartageResponse {
  bien: SharedBien
  expiresAt: string
  views: number
}

async function fetchPartage(token: string): Promise<PartageResponse> {
  const { data } = await axios.get(`${BASE_URL}/api/partage/${token}`)
  return data
}

export default function PartagePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)

  const { data, isLoading, error } = useQuery<PartageResponse>({
    queryKey: ['partage', token],
    queryFn: () => fetchPartage(token),
    retry: false,
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    const status = (error as { response?: { status?: number } } | null)?.response?.status
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center space-y-4">
        <p className="text-4xl">🔗</p>
        <h1 className="text-xl font-bold">Lien invalide ou expiré</h1>
        <p className="text-sm text-muted-foreground">
          {status === 404
            ? 'Ce lien de partage n\'existe plus ou a expiré.'
            : 'Une erreur est survenue lors du chargement.'}
        </p>
        <Button asChild className="bg-indigo-600 hover:bg-indigo-700 mt-2">
          <Link href="/">Découvrir ImmoSafe</Link>
        </Button>
      </div>
    )
  }

  const { bien, expiresAt, views } = data
  const analyse = bien.analyse

  if (!analyse) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Analyse indisponible.</p>
      </div>
    )
  }

  const sortedVigilance = [...analyse.pointsVigilance].sort(
    (a, b) => NIVEAU_ORDER[a.niveau] - NIVEAU_ORDER[b.niveau]
  )

  const expiresLabel = new Date(expiresAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span className="font-medium text-foreground">ImmoSafe</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Eye size={12} />
              {views} vue{views !== 1 ? 's' : ''}
            </span>
            <span>Expire le {expiresLabel}</span>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <VerdictCard
            score={bien.scoreImmoSafe ?? analyse.scoreImmoSafe}
            syntheseTexte={analyse.syntheseTexte}
            ville={bien.ville}
            prix={bien.prix}
            typeBien={bien.typeBien}
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <PrixComparison prixAnalyse={analyse.prixAnalyse} />
        </motion.div>

        {analyse.dpeAnalyse && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <DPEBadge dpeAnalyse={analyse.dpeAnalyse} />
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <NegociationBlock negociation={analyse.negociation} />
        </motion.div>

        {sortedVigilance.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <h3 className="font-semibold text-sm mb-3">Points de vigilance</h3>
            <div className="space-y-2">
              {sortedVigilance.map((p, i) => (
                <PointVigilanceItem key={i} niveau={p.niveau} titre={p.titre} explication={p.explication} />
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/40 dark:to-indigo-900/30 border border-indigo-200 dark:border-indigo-800 p-6 text-center space-y-3 pb-8"
        >
          <p className="text-lg font-bold">Analysez vos propres biens</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            ImmoSafe analyse les prix du marché, le DPE et vous donne les arguments de négociation — gratuitement.
          </p>
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
            <Link href="/register">
              Créer mon compte gratuit
              <ArrowRight size={14} className="ml-2" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
