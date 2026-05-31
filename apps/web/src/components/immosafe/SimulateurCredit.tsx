'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { formatPrix } from '@/lib/score'

interface Props {
  prixBien: number
  surface: number
  dpe?: string
  anneeConstruction?: number
  compact?: boolean
}

const DUREES = [10, 15, 20, 25]

function calcMensualite(montant: number, tauxAnnuel: number, dureeAns: number): number {
  if (montant <= 0) return 0
  const nbM = dureeAns * 12
  if (tauxAnnuel === 0) return montant / nbM
  const tm = tauxAnnuel / 100 / 12
  return montant * (tm * Math.pow(1 + tm, nbM)) / (Math.pow(1 + tm, nbM) - 1)
}

export function SimulateurCredit({ prixBien, anneeConstruction, compact = false }: Props) {
  const [apport, setApport] = useState(0)
  const [duree, setDuree] = useState(20)
  const [taux, setTaux] = useState(3.5)
  const [revenus, setRevenus] = useState(0)
  const [showDetails, setShowDetails] = useState(false)

  const isNeuf = anneeConstruction !== undefined && anneeConstruction > 2010
  const fraisNotaire = Math.round(prixBien * (isNeuf ? 0.025 : 0.075))
  const montantEmprunte = Math.max(0, prixBien - apport + fraisNotaire)
  const mensualite = calcMensualite(montantEmprunte, taux, duree)
  const nbMensualites = duree * 12
  const coutTotalCredit = Math.max(0, mensualite * nbMensualites - montantEmprunte)
  const coutTotalOperation = prixBien + fraisNotaire + coutTotalCredit

  const tauxEndettement = revenus > 0 ? (mensualite / revenus) * 100 : null
  const isViable = tauxEndettement !== null ? tauxEndettement <= 35 : null
  const isLimite = tauxEndettement !== null ? tauxEndettement > 35 && tauxEndettement <= 40 : null

  const apportRecommande10 = Math.round(prixBien * 0.1 / 1000) * 1000

  if (compact) {
    return (
      <div className="text-center">
        <p className="text-lg font-bold text-foreground">
          {Math.round(mensualite).toLocaleString('fr-FR')} €<span className="text-xs font-normal text-muted-foreground">/mois</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">taux {taux}% · {duree} ans</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <h3 className="text-sm font-semibold">Simulateur de crédit</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Inputs row */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Apport (€)</label>
            <input
              type="number"
              min={0}
              max={prixBien}
              step={1000}
              value={apport || ''}
              onChange={(e) => setApport(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="0"
              className="w-full h-8 px-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
              ~{apportRecommande10.toLocaleString('fr-FR')} € recommandés (10%)
            </p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Durée</label>
            <select
              value={duree}
              onChange={(e) => setDuree(parseInt(e.target.value))}
              className="w-full h-8 px-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              {DUREES.map((d) => (
                <option key={d} value={d}>{d} ans</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Taux (%)</label>
            <input
              type="number"
              min={0.1}
              max={15}
              step={0.1}
              value={taux}
              onChange={(e) => setTaux(Math.max(0.1, parseFloat(e.target.value) || 3.5))}
              className="w-full h-8 px-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>
        </div>

        {/* Revenus */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Revenus mensuels nets <span className="text-muted-foreground/60">(optionnel)</span>
          </label>
          <div className="relative max-w-[200px]">
            <input
              type="number"
              min={0}
              step={100}
              value={revenus || ''}
              onChange={(e) => setRevenus(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="3 000"
              className="w-full h-8 pl-2 pr-12 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">€/mois</span>
          </div>
        </div>

        {/* Result */}
        <div className="rounded-lg bg-muted/40 p-3 space-y-2">
          <p className="text-xs text-muted-foreground">Mensualité estimée</p>
          <p className="text-2xl font-bold text-foreground">
            {Math.round(mensualite).toLocaleString('fr-FR')} €
            <span className="text-sm font-normal text-muted-foreground ml-1">/mois</span>
          </p>

          {tauxEndettement !== null && (
            <div className={`flex items-center gap-2 text-sm font-medium ${
              isViable ? 'text-green-700' : isLimite ? 'text-amber-700' : 'text-red-700'
            }`}>
              <span>
                {isViable ? '✅' : isLimite ? '⚠️' : '🚨'}
                {' '}Taux d'endettement : {Math.round(tauxEndettement)}%
                {' '}—{' '}
                {isViable ? 'Viable' : isLimite ? 'Limite' : 'Trop élevé'}
              </span>
            </div>
          )}
        </div>

        {/* Details toggle */}
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {showDetails ? 'Masquer le détail' : 'Voir le détail'}
        </button>

        {showDetails && (
          <div className="rounded-lg border border-border text-sm overflow-hidden">
            <table className="w-full">
              <tbody>
                <DetailRow label="Prix du bien" value={formatPrix(prixBien)} />
                <DetailRow
                  label={`Frais de notaire (${isNeuf ? '2.5' : '7.5'}%)`}
                  value={`+ ${formatPrix(fraisNotaire)}`}
                  sub
                />
                {apport > 0 && (
                  <DetailRow label="Apport personnel" value={`− ${formatPrix(apport)}`} sub />
                )}
                <DetailRow label="Montant emprunté" value={formatPrix(montantEmprunte)} strong />
                <DetailRow label="Coût du crédit" value={`+ ${formatPrix(Math.round(coutTotalCredit))}`} sub />
                <DetailRow label="Coût total de l'opération" value={formatPrix(Math.round(coutTotalOperation))} strong />
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function DetailRow({
  label,
  value,
  sub,
  strong,
}: {
  label: string
  value: string
  sub?: boolean
  strong?: boolean
}) {
  return (
    <tr className={`border-b border-border last:border-0 ${strong ? 'bg-muted/30' : ''}`}>
      <td className={`px-3 py-2 text-left ${sub ? 'text-muted-foreground text-xs pl-5' : ''} ${strong ? 'font-medium' : ''}`}>
        {label}
      </td>
      <td className={`px-3 py-2 text-right tabular-nums ${strong ? 'font-semibold' : ''}`}>
        {value}
      </td>
    </tr>
  )
}
