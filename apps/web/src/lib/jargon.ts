export const JARGON: Record<string, string> = {
  DPE: "Diagnostic de Performance Énergétique — note de A (très économe) à G (très énergivore). Les biens F/G seront interdits à la location dès 2028.",
  DVF: "Demande de Valeur Foncière — base officielle du gouvernement recensant toutes les transactions immobilières réelles en France.",
  "prix/m²": "Prix au mètre carré — indicateur standard pour comparer des biens de tailles différentes dans un même secteur.",
  charges: "Charges de copropriété mensuelles payées en plus du remboursement de crédit. À vérifier : incluent-elles le chauffage collectif ?",
  "marge de négociation": "Écart estimé entre le prix affiché et le prix réellement acceptable par le vendeur, basé sur les données du marché local.",
  ADEME: "Agence de la transition écologique — publie les données des diagnostics DPE pour tous les logements en France.",
  "score ImmoSafe": "Note de 0 à 100 calculée par ImmoTest. Au-dessus de 70 : bon plan. Entre 40 et 70 : correct. En dessous de 40 : à éviter.",
  PTZ: "Prêt à Taux Zéro — aide de l'État pour les primo-accédants. Soumis à conditions de ressources et de zone géographique.",
  copropriété: "Régime juridique d'un immeuble divisé en lots. Chaque propriétaire possède son lot + une quote-part des parties communes.",
  DPE_F: "Classe F — logement très énergivore. Travaux de rénovation obligatoires avant 2028 pour pouvoir le louer.",
  DPE_G: "Classe G — logement extrêmement énergivore. Interdit à la location depuis janvier 2025 pour les nouvelles mises en location.",
}

export function getJargonDef(term: string): string | undefined {
  return JARGON[term] ?? JARGON[term.toLowerCase()]
}
