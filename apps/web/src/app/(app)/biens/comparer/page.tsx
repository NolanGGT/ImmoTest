'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ScoreGauge } from '@/components/immosafe/ScoreGauge'
import { SimulateurCredit } from '@/components/immosafe/SimulateurCredit'
import { formatPrix, formatPrixM2 } from '@/lib/score'
import { useComparer, type BienComplet } from '@/hooks/useComparer'
import type { AnalyseResult } from '@immosafe/shared-types'

// ─── Highlight logic ──────────────────────────────────────────────────────

type Highlight = 'best' | 'worst' | 'neutral'

function getHighlights(values: (number | null)[], higherIsBetter: boolean): Highlight[] {
  const valid = values.filter((v): v is number => v !== null)
  if (valid.length < 2) return values.map(() => 'neutral')
  const best = higherIsBetter ? Math.max(...valid) : Math.min(...valid)
  const worst = higherIsBetter ? Math.min(...valid) : Math.max(...valid)
  return values.map((v) => {
    if (v === null) return 'neutral'
    if (v === best) return 'best'
    if (v === worst) return 'worst'
    return 'neutral'
  })
}

function cellClass(h: Highlight): string {
  if (h === 'best') return 'bg-green-50 text-green-700'
  if (h === 'worst') return 'bg-red-50 text-red-700'
  return ''
}

function cellPrefix(h: Highlight): string {
  if (h === 'best') return '✓ '
  if (h === 'worst') return '⚠️ '
  return ''
}

// ─── DPE helpers ─────────────────────────────────────────────────────────

const DPE_SCORE: Record<string, number> = { A: 7, B: 6, C: 5, D: 4, E: 3, F: 2, G: 1 }

const DPE_COLORS: Record<string, string> = {
  A: 'bg-green-100 text-green-800',
  B: 'bg-lime-100 text-lime-800',
  C: 'bg-yellow-100 text-yellow-800',
  D: 'bg-orange-100 text-orange-700',
  E: 'bg-orange-200 text-orange-800',
  F: 'bg-red-100 text-red-700',
  G: 'bg-red-200 text-red-800',
}

// ─── Statut display ───────────────────────────────────────────────────────

const STATUT_LABELS: Record<string, string> = {
  EN_COURS: 'En cours',
  VISITE_PLANIFIEE: 'Visite planifiée',
  OFFRE_FAITE: 'Offre faite',
  ABANDONNE: 'Abandonné',
}

// ─── Synthèse ─────────────────────────────────────────────────────────────

function generateSynthese(biens: BienComplet[]): string {
  const parts: string[] = []

  const bestScore = biens.reduce((best, b) =>
    (b.scoreImmoSafe ?? 0) > (best.scoreImmoSafe ?? 0) ? b : best
  )
  if (bestScore.scoreImmoSafe != null) {
    parts.push(`${bestScore.ville} a le meilleur score ImmoSafe (${bestScore.scoreImmoSafe}/100)`)
  }

  const withPrixM2 = biens.filter((b) => b.prixM2Bien != null)
  if (withPrixM2.length >= 2) {
    const bestPrixM2 = withPrixM2.reduce((best, b) =>
      (b.prixM2Bien ?? Infinity) < (best.prixM2Bien ?? Infinity) ? b : best
    )
    parts.push(
      `${bestPrixM2.ville} a le prix au m² le plus bas (${Math.round(bestPrixM2.prixM2Bien!).toLocaleString('fr-FR')} €/m²)`
    )
  }

  const biggestSurface = biens.reduce((best, b) => (b.surface > best.surface ? b : best))
  parts.push(`${biggestSurface.ville} est le plus spacieux (${biggestSurface.surface} m²)`)

  return parts.join('. ') + '.'
}

// ─── Default mensualité for compact (apport=0, taux=3.5%, 20ans) ─────────

function calcMensualiteDefault(montant: number): number {
  const tm = 3.5 / 100 / 12
  const n = 20 * 12
  return montant * (tm * Math.pow(1 + tm, n)) / (Math.pow(1 + tm, n) - 1)
}

// ─── Table rows ───────────────────────────────────────────────────────────

const ROW_H = 'border-b border-border last:border-0'
const LABEL_CELL = 'px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap bg-muted/30 border-r border-border'
const DATA_CELL_BASE = 'px-3 py-3 text-sm text-center align-middle border-r border-border last:border-0'

// ─── Main page ────────────────────────────────────────────────────────────

export default function ComparerPage() {
  const searchParams = useSearchParams()
  const idsParam = searchParams.get('ids') ?? ''
  const ids = idsParam.split(',').map((id) => id.trim()).filter(Boolean)

  const { data: biens, isLoading, error } = useComparer(ids)

  if (ids.length < 2 || ids.length > 4) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground mb-3">Sélectionnez entre 2 et 4 biens à comparer.</p>
        <Link href="/biens" className="text-indigo-600 hover:underline text-sm">Retour à mes biens</Link>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (error || !biens) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground mb-3">Impossible de charger la comparaison.</p>
        <Link href="/biens" className="text-indigo-600 hover:underline text-sm">Retour à mes biens</Link>
      </div>
    )
  }

  const synthese = generateSynthese(biens)

  // Collect values for highlighting
  const scores = biens.map((b) => b.scoreImmoSafe)
  const prix = biens.map((b) => b.prix)
  const prixM2 = biens.map((b) => b.prixM2Bien ?? null)
  const surfaces = biens.map((b) => b.surface)
  const dpeNums = biens.map((b) => (b.dpe ? (DPE_SCORE[b.dpe] ?? null) : null))
  const charges = biens.map((b) => b.charges ?? null)
  const marges = biens.map((b) => {
    const a = b.analyse as AnalyseResult | null
    return a?.negociation?.margeEstimee ?? null
  })
  const mensualites = biens.map((b) => Math.round(calcMensualiteDefault(b.prix)))

  const hl = {
    scores: getHighlights(scores, true),
    prix: getHighlights(prix, false),
    prixM2: getHighlights(prixM2, false),
    surfaces: getHighlights(surfaces, true),
    dpe: getHighlights(dpeNums, true),
    charges: getHighlights(charges, false),
    marges: getHighlights(marges, true),
    mensualites: getHighlights(mensualites, false),
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/biens" className="p-1.5 rounded-md hover:bg-accent transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-xl font-bold tracking-tight">
            Comparaison de {biens.length} biens
          </h1>
        </div>
        <Link href="/biens?compareMode=true">
          <Button variant="outline" size="sm">Modifier la sélection</Button>
        </Link>
      </div>

      {/* Synthèse */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
        <p className="text-sm font-medium text-indigo-900 mb-1">Synthèse de la comparaison</p>
        <p className="text-sm text-indigo-700">{synthese}</p>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[560px] text-sm border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground w-32 border-r border-border">
                Critère
              </th>
              {biens.map((b) => (
                <th key={b.id} className="px-3 py-3 text-center border-r border-border last:border-0">
                  <p className="font-semibold text-sm truncate max-w-[140px] mx-auto">{b.ville}</p>
                  <p className="text-xs text-muted-foreground font-normal">{b.typeBien.charAt(0) + b.typeBien.slice(1).toLowerCase()} · {b.surface} m²</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Score */}
            <tr className={ROW_H}>
              <td className={LABEL_CELL}>Score ImmoSafe</td>
              {biens.map((b, i) => (
                <td key={b.id} className={`${DATA_CELL_BASE} ${cellClass(hl.scores[i])}`}>
                  {b.scoreImmoSafe != null ? (
                    <div className="flex justify-center">
                      <ScoreGauge score={b.scoreImmoSafe} size="sm" animate={false} />
                    </div>
                  ) : '—'}
                </td>
              ))}
            </tr>

            {/* Prix */}
            <tr className={ROW_H}>
              <td className={LABEL_CELL}>Prix</td>
              {biens.map((b, i) => (
                <td key={b.id} className={`${DATA_CELL_BASE} ${cellClass(hl.prix[i])}`}>
                  <span className="font-medium">{cellPrefix(hl.prix[i])}{formatPrix(b.prix)}</span>
                </td>
              ))}
            </tr>

            {/* Prix m² */}
            <tr className={ROW_H}>
              <td className={LABEL_CELL}>Prix au m²</td>
              {biens.map((b, i) => (
                <td key={b.id} className={`${DATA_CELL_BASE} ${cellClass(hl.prixM2[i])}`}>
                  {b.prixM2Bien != null
                    ? <span>{cellPrefix(hl.prixM2[i])}{formatPrixM2(Math.round(b.prixM2Bien))}</span>
                    : '—'}
                </td>
              ))}
            </tr>

            {/* Surface */}
            <tr className={ROW_H}>
              <td className={LABEL_CELL}>Surface</td>
              {biens.map((b, i) => (
                <td key={b.id} className={`${DATA_CELL_BASE} ${cellClass(hl.surfaces[i])}`}>
                  {cellPrefix(hl.surfaces[i])}{b.surface} m²
                </td>
              ))}
            </tr>

            {/* DPE */}
            <tr className={ROW_H}>
              <td className={LABEL_CELL}>DPE</td>
              {biens.map((b, i) => (
                <td key={b.id} className={`${DATA_CELL_BASE}`}>
                  {b.dpe ? (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${DPE_COLORS[b.dpe] ?? 'bg-gray-100 text-gray-700'}`}>
                      {cellPrefix(hl.dpe[i])}{b.dpe}
                    </span>
                  ) : '—'}
                </td>
              ))}
            </tr>

            {/* Charges */}
            <tr className={ROW_H}>
              <td className={LABEL_CELL}>Charges</td>
              {biens.map((b, i) => (
                <td key={b.id} className={`${DATA_CELL_BASE} ${cellClass(hl.charges[i])}`}>
                  {b.charges != null ? `${cellPrefix(hl.charges[i])}${b.charges.toLocaleString('fr-FR')} €/mois` : '—'}
                </td>
              ))}
            </tr>

            {/* Négociation */}
            <tr className={ROW_H}>
              <td className={LABEL_CELL}>Marge négo.</td>
              {biens.map((b, i) => {
                const a = b.analyse as AnalyseResult | null
                const marge = a?.negociation?.margeEstimee
                return (
                  <td key={b.id} className={`${DATA_CELL_BASE} ${cellClass(hl.marges[i])}`}>
                    {marge != null ? `${cellPrefix(hl.marges[i])}${marge}%` : '—'}
                  </td>
                )
              })}
            </tr>

            {/* Statut */}
            <tr className={ROW_H}>
              <td className={LABEL_CELL}>Statut</td>
              {biens.map((b) => (
                <td key={b.id} className={DATA_CELL_BASE}>
                  <span className="text-xs text-muted-foreground">
                    {STATUT_LABELS[b.statut] ?? b.statut}
                  </span>
                </td>
              ))}
            </tr>

            {/* Crédit */}
            <tr className={ROW_H}>
              <td className={LABEL_CELL}>Mensualité estimée</td>
              {biens.map((b, i) => (
                <td key={b.id} className={`${DATA_CELL_BASE} ${cellClass(hl.mensualites[i])}`}>
                  <SimulateurCredit
                    prixBien={b.prix}
                    surface={b.surface}
                    dpe={b.dpe ?? undefined}
                    anneeConstruction={b.anneeConstruction ?? undefined}
                    compact
                  />
                </td>
              ))}
            </tr>

            {/* Actions */}
            <tr>
              <td className={LABEL_CELL}>Analyse</td>
              {biens.map((b) => (
                <td key={b.id} className={`${DATA_CELL_BASE}`}>
                  <Link href={`/biens/${b.id}`}>
                    <Button size="sm" variant="outline" className="text-xs w-full">
                      Voir →
                    </Button>
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
