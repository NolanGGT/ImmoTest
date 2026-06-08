'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ConfirmationBienProps {
  prix: number
  surface: number
  typeBien: string
  ville: string
  codePostal?: string
  adresse?: string
  nbPieces?: number
  dpe?: string
  charges?: number
  anneeConstruction?: number
  onConfirm: () => void
  onModify: () => void
  isPending?: boolean
}

export function ConfirmationBien({
  prix,
  surface,
  typeBien,
  ville,
  codePostal,
  adresse,
  nbPieces,
  dpe,
  charges,
  anneeConstruction,
  onConfirm,
  onModify,
  isPending,
}: ConfirmationBienProps) {
  const prixM2 = Math.round(prix / surface)
  const isPrixSuspect = prixM2 < 1000 || prixM2 > 20000

  const fields = [
    { label: 'Prix', value: `${prix.toLocaleString('fr-FR')} €` },
    { label: 'Surface', value: `${surface} m²` },
    { label: 'Prix/m²', value: `${prixM2.toLocaleString('fr-FR')} €/m²` },
    { label: 'Type', value: typeBien.charAt(0) + typeBien.slice(1).toLowerCase() },
    { label: 'Localisation', value: codePostal ? `${ville} (${codePostal})` : ville },
    adresse ? { label: 'Adresse', value: adresse } : null,
    nbPieces ? { label: 'Pièces', value: String(nbPieces) } : null,
    dpe ? { label: 'DPE', value: dpe } : null,
    charges ? { label: 'Charges', value: `${charges} €/mois` } : null,
    anneeConstruction ? { label: 'Année construction', value: String(anneeConstruction) } : null,
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Confirmer l'analyse</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vérifiez les informations avant de lancer l'analyse.
        </p>
      </div>

      {isPrixSuspect && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            Le prix au m² ({prixM2.toLocaleString('fr-FR')} €/m²) semble{' '}
            {prixM2 < 1000 ? 'très bas' : 'très élevé'}. Vérifiez avant de continuer.
          </span>
        </div>
      )}

      <div className="rounded-xl border divide-y overflow-hidden">
        {fields.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
          </div>
        ))}
      </div>

      {(() => {
        const adresseFloue = !adresse || !/\d/.test(adresse)
        return (
          <p className={`text-xs flex items-center gap-1 mt-1 ${adresseFloue ? 'text-red-600' : 'text-amber-600'}`}>
            <span>⚠️</span>
            <span>Adresse approximative — les sites immobiliers masquent l&apos;adresse exacte. Précision au quartier près.</span>
          </p>
        )
      })()}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onModify} disabled={isPending}>
          Modifier
        </Button>
        <Button
          className="flex-1 bg-indigo-600 hover:bg-indigo-700"
          onClick={onConfirm}
          disabled={isPending}
        >
          {isPending ? 'En cours...' : "Lancer l'analyse"}
        </Button>
      </div>
    </div>
  )
}
