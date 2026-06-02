export interface CoutReelInputs {
  prix: number
  surface: number
  typeBien: string
  dpe?: string | null
  charges?: number | null
  anneeConstruction?: number | null

  apport: number
  tauxCredit: number
  dureeAns: number
  haussePrixAnnuelle: number
  loyerMensuel: number
  chargesLocationMensuelles: number
  taxeFonciereAnnuelle: number
  travauxEstimes: number
}

export interface CoutReelResult {
  prixBien: number
  fraisNotaire: number
  coutCredit: number
  totalChargesCopro: number
  totalTaxeFonciere: number
  totalTravaux: number
  totalAchat: number

  valeurReventeEstimee: number
  coutNetAchat: number

  totalLoyers: number
  totalChargesLocation: number
  totalLocation: number

  economieVsLocation: number
  achatPlusRentable: boolean

  mensualiteCredit: number
  coutMensuelTotal: number

  dureeAns: number
  tauxCredit: number
}

export function calculerCoutReel(inputs: CoutReelInputs): CoutReelResult {
  const {
    prix, surface, dpe, charges, anneeConstruction,
    apport, tauxCredit, dureeAns,
    haussePrixAnnuelle, loyerMensuel, chargesLocationMensuelles,
    taxeFonciereAnnuelle, travauxEstimes,
  } = inputs

  // ─── Frais de notaire ─────────────────────────────────────────────────────
  const tauxNotaire = (anneeConstruction && anneeConstruction > 2010) ? 0.025 : 0.075
  const fraisNotaire = Math.round(prix * tauxNotaire)

  // ─── Crédit ───────────────────────────────────────────────────────────────
  const montantEmprunte = Math.max(0, prix - apport + fraisNotaire)
  const tauxMensuel = tauxCredit / 100 / 12
  const nbMensualites = dureeAns * 12

  const mensualiteCredit = montantEmprunte > 0 && tauxMensuel > 0
    ? Math.round(
        montantEmprunte *
        (tauxMensuel * Math.pow(1 + tauxMensuel, nbMensualites)) /
        (Math.pow(1 + tauxMensuel, nbMensualites) - 1)
      )
    : Math.round(montantEmprunte / nbMensualites)

  const totalRembourse = mensualiteCredit * nbMensualites
  const coutCredit = Math.max(0, totalRembourse - montantEmprunte)

  // ─── Charges copropriété ──────────────────────────────────────────────────
  const chargesMensuelles = charges || Math.round(surface * 3.5)
  const totalChargesCopro = chargesMensuelles * 12 * dureeAns

  // ─── Taxe foncière ────────────────────────────────────────────────────────
  const taxeFonciere = taxeFonciereAnnuelle || Math.round(loyerMensuel * 1.2)
  const totalTaxeFonciere = taxeFonciere * dureeAns

  // ─── Travaux ──────────────────────────────────────────────────────────────
  let travauxFinal = travauxEstimes
  if (!travauxFinal) {
    if (dpe === 'F' || dpe === 'G')                           travauxFinal = Math.round(surface * 400)
    else if (dpe === 'E')                                     travauxFinal = Math.round(surface * 200)
    else if (anneeConstruction && anneeConstruction < 1970)   travauxFinal = Math.round(surface * 100)
    else                                                       travauxFinal = Math.round(surface * 50)
  }

  // ─── Total achat ──────────────────────────────────────────────────────────
  const totalAchat = prix + fraisNotaire + coutCredit + totalChargesCopro + totalTaxeFonciere + travauxFinal

  // ─── Valeur de revente ────────────────────────────────────────────────────
  const valeurReventeEstimee = Math.round(prix * Math.pow(1 + haussePrixAnnuelle / 100, dureeAns))
  const coutNetAchat = Math.max(0, totalAchat - valeurReventeEstimee)

  // ─── Coût location ────────────────────────────────────────────────────────
  let totalLoyers = 0
  let loyerCourant = loyerMensuel
  for (let annee = 0; annee < dureeAns; annee++) {
    totalLoyers += loyerCourant * 12
    loyerCourant = loyerCourant * 1.01
  }
  totalLoyers = Math.round(totalLoyers)

  const totalChargesLocation = chargesLocationMensuelles * 12 * dureeAns
  const totalLocation = totalLoyers + totalChargesLocation

  // ─── Comparaison ──────────────────────────────────────────────────────────
  const economieVsLocation = totalLocation - coutNetAchat
  const achatPlusRentable = economieVsLocation > 0

  // ─── Coût mensuel total propriétaire ─────────────────────────────────────
  const coutMensuelTotal = mensualiteCredit + chargesMensuelles + Math.round(taxeFonciere / 12)

  return {
    prixBien: prix,
    fraisNotaire,
    coutCredit,
    totalChargesCopro,
    totalTaxeFonciere,
    totalTravaux: travauxFinal,
    totalAchat,
    valeurReventeEstimee,
    coutNetAchat,
    totalLoyers,
    totalChargesLocation,
    totalLocation,
    economieVsLocation,
    achatPlusRentable,
    mensualiteCredit,
    coutMensuelTotal,
    dureeAns,
    tauxCredit,
  }
}

export function estimerLoyer(prix: number, _surface: number): number {
  return Math.round((prix * 0.04) / 12)
}

export function formatEuros(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n)
}
