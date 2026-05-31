'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileDown, Lock, RefreshCw, Share2, Loader2, GitCompare } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { VerdictCard } from '@/components/immosafe/VerdictCard'
import { PrixComparison } from '@/components/immosafe/PrixComparison'
import { DPEBadge } from '@/components/immosafe/DPEBadge'
import { NegociationBlock } from '@/components/immosafe/NegociationBlock'
import { SimulateurCredit } from '@/components/immosafe/SimulateurCredit'
import { PointVigilanceItem } from '@/components/immosafe/PointVigilanceItem'
import { QuestionCard } from '@/components/immosafe/QuestionCard'
import { ScoreEvolution } from '@/components/immosafe/ScoreEvolution'
import { ShareModal } from '@/components/immosafe/ShareModal'
import { StaticMap } from '@/components/map/StaticMap'
import { useBien } from '@/hooks/useBien'
import { useRelancerAnalyse } from '@/hooks/useRelancerAnalyse'
import { useAnalyseStore } from '@/stores/analyse.store'
import { useSubscription } from '@/hooks/useSubscription'
import { useAuthStore } from '@/stores/auth.store'
import { toast } from 'sonner'
import api from '@/lib/api'
import type { AnalyseResult } from '@immosafe/shared-types'

const NIVEAU_ORDER = { CRITIQUE: 0, ATTENTION: 1, INFO: 2 }

const STATUT_OPTIONS = [
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'VISITE_PLANIFIEE', label: 'Visite planifiée' },
  { value: 'OFFRE_FAITE', label: 'Offre faite' },
  { value: 'ABANDONNE', label: 'Abandonné' },
] as const

type BienStatut = typeof STATUT_OPTIONS[number]['value']

const STATUT_COLORS: Record<BienStatut, string> = {
  EN_COURS: 'bg-blue-100 text-blue-700 border-blue-300',
  VISITE_PLANIFIEE: 'bg-amber-100 text-amber-700 border-amber-300',
  OFFRE_FAITE: 'bg-purple-100 text-purple-700 border-purple-300',
  ABANDONNE: 'bg-red-100 text-red-600 border-red-300',
}

const RELANCE_COOLDOWN_MS = 24 * 60 * 60 * 1000

export default function BienDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: bien, isLoading, error } = useBien(id)
  const storeAnalyse = useAnalyseStore((s) => s.analyse)
  const storeBienId = useAnalyseStore((s) => s.bienId)
  const storeBienData = useAnalyseStore((s) => s.bienData)
  const clearStore = useAnalyseStore((s) => s.clear)
  const { isActive } = useSubscription()
  const accessToken = useAuthStore((s) => s.accessToken)

  const hasStore = storeBienId === id && storeAnalyse !== null && storeBienData !== null

  const ville = bien?.ville ?? storeBienData?.ville ?? ''
  const relancer = useRelancerAnalyse(id, ville)

  const [statutOptimistic, setStatutOptimistic] = useState<BienStatut | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  useEffect(() => {
    if (storeBienId === id && bien) clearStore()
  }, [id, storeBienId, bien, clearStore])

  useEffect(() => {
    if (bien?.statut) setStatutOptimistic(bien.statut as BienStatut)
  }, [bien?.statut])

  const analyse: AnalyseResult | null = hasStore
    ? storeAnalyse
    : (bien?.analyse as AnalyseResult | null)

  const displayBien = bien
    ? { ville: bien.ville, prix: bien.prix, typeBien: bien.typeBien, scoreImmoSafe: bien.scoreImmoSafe }
    : hasStore
    ? { ville: storeBienData!.ville, prix: storeBienData!.prix, typeBien: storeBienData!.typeBien, scoreImmoSafe: storeBienData!.scoreImmoSafe }
    : null

  const handleStatutChange = async (statut: BienStatut) => {
    setStatutOptimistic(statut)
    try {
      await api.patch(`/api/biens/${id}`, { statut })
    } catch {
      setStatutOptimistic(bien?.statut as BienStatut ?? 'EN_COURS')
    }
  }

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true)
    try {
      const { data } = await api.post<{ rapportId: string; fileUrl: string }>(`/api/rapports/generer/${id}`)
      window.open(data.fileUrl, '_blank')
    } catch {
      toast.error('Impossible de générer le rapport PDF. Réessayez dans un instant.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const canRelancer = bien
    ? Date.now() - new Date(bien.updatedAt).getTime() >= RELANCE_COOLDOWN_MS
    : false

  const historiqueScores = Array.isArray(bien?.historiqueScores)
    ? (bien.historiqueScores as number[])
    : []

  if (!hasStore && isLoading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
    )
  }

  if (!hasStore && !bien && !isLoading) {
    const status = (error as { response?: { status?: number } } | null)?.response?.status
    let msg = 'Erreur lors du chargement du bien.'
    if (status === 404) {
      msg = "Bien introuvable. Si vous venez de l'analyser, votre session a peut-être expiré."
    } else if (status === 401) {
      msg = 'Session expirée — reconnectez-vous.'
    }
    return (
      <div className="text-center py-20 space-y-1">
        <p className="text-muted-foreground">{msg}</p>
        {process.env.NODE_ENV === 'development' && error && (
          <p className="mt-1 text-xs font-mono text-destructive/70">
            status {status ?? '?'} · token présent : {String(!!accessToken)}
          </p>
        )}
        <Link href="/biens" className="text-indigo-600 hover:underline text-sm block mt-3">
          Retour à mes biens
        </Link>
      </div>
    )
  }

  if (!analyse || !displayBien) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Analyse indisponible pour ce bien.</p>
        <Link href="/biens" className="text-indigo-600 hover:underline text-sm mt-2 block">Retour à mes biens</Link>
      </div>
    )
  }

  const sortedVigilance = [...analyse.pointsVigilance].sort(
    (a, b) => NIVEAU_ORDER[a.niveau] - NIVEAU_ORDER[b.niveau]
  )

  const activeStatut = statutOptimistic ?? (bien?.statut as BienStatut ?? 'EN_COURS')

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/biens" className="p-1.5 rounded-md hover:bg-accent transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <span className="text-sm text-muted-foreground">{displayBien.ville}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShareOpen(true)}
          >
            <Share2 size={14} className="mr-1.5" />
            Partager
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!canRelancer || relancer.isPending}
            title={!canRelancer ? 'Relancement disponible 24h après la dernière analyse' : undefined}
            onClick={() => relancer.mutate()}
          >
            {relancer.isPending ? (
              <Loader2 size={14} className="mr-1.5 animate-spin" />
            ) : (
              <RefreshCw size={14} className="mr-1.5" />
            )}
            Mettre à jour
          </Button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <VerdictCard
          score={displayBien.scoreImmoSafe ?? analyse.scoreImmoSafe}
          syntheseTexte={analyse.syntheseTexte}
          ville={displayBien.ville}
          prix={displayBien.prix}
          typeBien={displayBien.typeBien}
        />
      </motion.div>

      {historiqueScores.length > 0 && bien?.scoreImmoSafe != null && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <ScoreEvolution
            historiqueScores={historiqueScores}
            currentScore={bien.scoreImmoSafe}
          />
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}>
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Statut du dossier</h3>
          <div className="flex flex-wrap gap-2">
            {STATUT_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleStatutChange(value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  activeStatut === value
                    ? STATUT_COLORS[value]
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
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

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
        <h3 className="font-semibold text-sm mb-3">Financement</h3>
        <SimulateurCredit
          prixBien={displayBien.prix}
          surface={bien?.surface ?? (hasStore ? storeBienData!.surface : 0)}
          dpe={bien?.dpe ?? undefined}
          anneeConstruction={bien?.anneeConstruction ?? undefined}
        />
      </motion.div>

      {bien?.latitude && bien?.longitude && bien?.scoreImmoSafe != null && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h3 className="font-semibold text-sm mb-3">Localisation</h3>
          <StaticMap
            lat={bien.latitude}
            lon={bien.longitude}
            score={bien.scoreImmoSafe}
            bienId={id}
            height={200}
          />
        </motion.div>
      )}

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

      {analyse.questionsVendeur.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 className="font-semibold text-sm mb-3">Questions à poser au vendeur</h3>
          <div className="space-y-2">
            {analyse.questionsVendeur.map((q, i) => (
              <QuestionCard key={i} index={i + 1} question={q.question} pourquoi={q.pourquoi} />
            ))}
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="pb-6 space-y-2">
        <Link href={`/biens?compareMode=true&preselect=${id}`} className="block">
          <Button variant="outline" className="w-full">
            <GitCompare size={14} className="mr-2" />
            Comparer avec d'autres biens
          </Button>
        </Link>
        <Button
          variant="outline"
          className="w-full"
          disabled={!isActive || isGeneratingPDF}
          title={!isActive ? "Disponible avec l'offre premium" : undefined}
          onClick={isActive ? handleDownloadPDF : undefined}
        >
          {isGeneratingPDF ? (
            <Loader2 size={15} className="mr-2 animate-spin" />
          ) : isActive ? (
            <FileDown size={15} className="mr-2" />
          ) : (
            <Lock size={15} className="mr-2" />
          )}
          {isGeneratingPDF ? 'Génération en cours…' : isActive ? 'Télécharger le rapport PDF' : 'Rapport PDF — offre premium'}
        </Button>
        {!isActive && (
          <p className="text-xs text-center text-muted-foreground mt-2">
            <Link href="/profil" className="text-indigo-600 hover:underline">Passer premium</Link> pour débloquer les rapports PDF
          </p>
        )}
      </motion.div>

      <ShareModal bienId={id} open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  )
}
