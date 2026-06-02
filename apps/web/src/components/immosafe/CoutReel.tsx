'use client'

import { useState, useMemo } from 'react'
import { calculerCoutReel, estimerLoyer, formatEuros } from '@/lib/coutReel'
import { ChevronDown, TrendingDown, TrendingUp } from 'lucide-react'

interface Props {
  prix: number
  surface: number
  typeBien: string
  dpe?: string | null
  charges?: number | null
  anneeConstruction?: number | null
}

export function CoutReel({ prix, surface, typeBien, dpe, charges, anneeConstruction }: Props) {
  const [showDetails, setShowDetails] = useState(false)
  const [showHypotheses, setShowHypotheses] = useState(false)

  const [apport, setApport] = useState(0)
  const [tauxCredit, setTauxCredit] = useState(3.5)
  const [dureeAns, setDureeAns] = useState(20)
  const [haussePrixAnnuelle, setHaussePrixAnnuelle] = useState(1.5)
  const [loyerMensuel, setLoyerMensuel] = useState(() => estimerLoyer(prix, surface))
  const [chargesLocationMensuelles] = useState(80)
  const [taxeFonciereAnnuelle] = useState(0)
  const [travauxEstimes] = useState(0)

  const result = useMemo(
    () =>
      calculerCoutReel({
        prix, surface, typeBien, dpe, charges, anneeConstruction,
        apport, tauxCredit, dureeAns, haussePrixAnnuelle,
        loyerMensuel, chargesLocationMensuelles,
        taxeFonciereAnnuelle, travauxEstimes,
      }),
    [
      prix, surface, typeBien, dpe, charges, anneeConstruction,
      apport, tauxCredit, dureeAns, haussePrixAnnuelle,
      loyerMensuel, chargesLocationMensuelles,
      taxeFonciereAnnuelle, travauxEstimes,
    ]
  )

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            💶 Coût réel sur {dureeAns} ans
          </h3>
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${
              result.achatPlusRentable
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
            }`}
          >
            {result.achatPlusRentable ? (
              <><TrendingDown size={14} /> Acheter est rentable</>
            ) : (
              <><TrendingUp size={14} /> Location moins chère</>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Résumé — 2 colonnes */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3">
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2 uppercase tracking-wide">
              Achat
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {formatEuros(result.totalAchat)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">coût brut total</p>
            <div className="mt-2 pt-2 border-t border-indigo-100 dark:border-indigo-800">
              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                {formatEuros(result.coutNetAchat)}
              </p>
              <p className="text-xs text-gray-500">coût net après revente</p>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Location équiv.
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {formatEuros(result.totalLocation)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              loyers + charges sur {dureeAns} ans
            </p>
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {formatEuros(loyerMensuel)}/mois
              </p>
              <p className="text-xs text-gray-500">loyer de référence</p>
            </div>
          </div>
        </div>

        {/* Verdict */}
        <div
          className={`p-3 rounded-xl mb-4 text-sm ${
            result.achatPlusRentable
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
          }`}
        >
          {result.achatPlusRentable ? (
            <p className="text-green-700 dark:text-green-400">
              ✅ En achetant, vous économisez{' '}
              <strong>{formatEuros(result.economieVsLocation)}</strong> sur {dureeAns} ans par
              rapport à la location.
            </p>
          ) : (
            <p className="text-orange-700 dark:text-orange-400">
              ⚠️ La location serait moins chère de{' '}
              <strong>{formatEuros(-result.economieVsLocation)}</strong> sur {dureeAns} ans dans
              ces conditions.
            </p>
          )}
        </div>

        {/* Détail des postes */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-2 transition"
        >
          <ChevronDown
            size={14}
            className={`transition-transform ${showDetails ? 'rotate-180' : ''}`}
          />
          {showDetails ? 'Masquer' : 'Voir'} le détail des postes
        </button>

        {showDetails && (
          <div className="space-y-0 mb-4 text-sm">
            {[
              { label: 'Prix du bien',          value: result.prixBien },
              { label: 'Frais de notaire',       value: result.fraisNotaire },
              { label: 'Coût du crédit',         value: result.coutCredit },
              { label: 'Charges copropriété',    value: result.totalChargesCopro },
              { label: 'Taxe foncière estimée',  value: result.totalTaxeFonciere },
              { label: 'Travaux estimés',        value: result.totalTravaux },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-700"
              >
                <span className="text-gray-600 dark:text-gray-400">{label}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatEuros(value)}</span>
              </div>
            ))}
            <div className="flex justify-between items-center py-2 font-bold">
              <span className="text-gray-900 dark:text-gray-100">Total brut</span>
              <span className="text-indigo-600 dark:text-indigo-400">{formatEuros(result.totalAchat)}</span>
            </div>
            <div className="flex justify-between items-center py-1 text-xs text-gray-500">
              <span>Valeur de revente (+{haussePrixAnnuelle}%/an)</span>
              <span className="text-green-600">− {formatEuros(result.valeurReventeEstimee)}</span>
            </div>
            <div className="flex justify-between items-center py-2 font-bold border-t border-gray-200 dark:border-gray-600">
              <span className="text-gray-900 dark:text-gray-100">Coût net</span>
              <span className="text-indigo-600 dark:text-indigo-400">{formatEuros(result.coutNetAchat)}</span>
            </div>
          </div>
        )}

        {/* Ajuster les hypothèses */}
        <button
          onClick={() => setShowHypotheses(!showHypotheses)}
          className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition"
        >
          <ChevronDown
            size={14}
            className={`transition-transform ${showHypotheses ? 'rotate-180' : ''}`}
          />
          Ajuster les hypothèses
        </button>

        {showHypotheses && (
          <div className="mt-3 space-y-4">
            {([
              {
                label: 'Apport personnel',
                value: apport,
                setter: setApport,
                min: 0, max: Math.round(prix * 0.5), step: 5000,
                fmt: (v: number) => formatEuros(v),
              },
              {
                label: "Taux d'emprunt",
                value: tauxCredit,
                setter: setTauxCredit,
                min: 1, max: 8, step: 0.1,
                fmt: (v: number) => `${v.toFixed(1)} %`,
              },
              {
                label: 'Durée du crédit',
                value: dureeAns,
                setter: setDureeAns,
                min: 5, max: 30, step: 5,
                fmt: (v: number) => `${v} ans`,
              },
              {
                label: 'Hausse annuelle du bien',
                value: haussePrixAnnuelle,
                setter: setHaussePrixAnnuelle,
                min: -2, max: 5, step: 0.5,
                fmt: (v: number) => `${v.toFixed(1)} %/an`,
              },
              {
                label: 'Loyer mensuel équivalent',
                value: loyerMensuel,
                setter: setLoyerMensuel,
                min: 300, max: 5000, step: 50,
                fmt: (v: number) => `${v} €/mois`,
              },
            ] as const).map(({ label, value, setter, min, max, step, fmt }) => (
              <div key={label}>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-gray-600 dark:text-gray-400">{label}</label>
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                    {fmt(value)}
                  </span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={value}
                  onChange={(e) => setter(parseFloat(e.target.value) as never)}
                  className="w-full h-1.5 accent-indigo-600 cursor-pointer"
                />
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          Estimation indicative. Loyer calculé sur base de {formatEuros(loyerMensuel)}/mois avec
          hausse de 1%/an. Revente après {dureeAns} ans à +{haussePrixAnnuelle}%/an.
        </p>
      </div>
    </div>
  )
}
