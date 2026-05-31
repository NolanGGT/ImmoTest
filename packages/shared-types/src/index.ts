export interface AnalyseContext {
  bien: {
    prix: number
    surface: number
    typeBien: 'APPARTEMENT' | 'MAISON' | 'STUDIO'
    nbPieces?: number
    ville: string
    codePostal: string
    adresse?: string
    dpe?: string
    charges?: number
    anneeConstruction?: number
    description?: string
    joursEnLigne?: number
    historiqueAnnonce?: Array<{ date: string; prix: number }>
  }
  marche: {
    prixM2MoyenQuartier: number
    prixM2Min: number
    prixM2Max: number
    nbTransactions: number
    evolutionPrix1an?: number
    transactionsRecentes: Array<{
      prix: number
      surface: number
      date: string
    }>
  }
}

export interface AnalyseResult {
  scoreImmoSafe: number

  prixAnalyse: {
    prixM2Bien: number
    prixM2Marche: number
    ecartPourcentage: number
    phraseVerdict: string
  }

  dpeAnalyse?: {
    classe: string
    surcoutMensuelEstime: number
    interdictionLocation2028: boolean
    phraseImpact: string
  }

  negociation: {
    margeEstimee: number
    prixCibleMin: number
    prixCibleMax: number
    phraseActionnable: string
    argumentsNegociation: string[]
  }

  pointsVigilance: Array<{
    niveau: 'INFO' | 'ATTENTION' | 'CRITIQUE'
    titre: string
    explication: string
  }>

  questionsVendeur: Array<{
    question: string
    pourquoi: string
  }>

  syntheseTexte: string
}

export interface BienFormulaire {
  prix: number
  surface: number
  typeBien: 'APPARTEMENT' | 'MAISON' | 'STUDIO'
  nbPieces?: number
  ville: string
  codePostal: string
  adresse?: string
  dpe?: string
  charges?: number
  anneeConstruction?: number
  urlSource?: string
}

export interface ScrapingResult {
  success: boolean
  partial: boolean
  source: 'seloger' | 'leboncoin' | 'pap' | 'unknown'
  data: {
    prix?: number
    surface?: number
    typeBien?: 'APPARTEMENT' | 'MAISON' | 'STUDIO'
    nbPieces?: number
    ville?: string
    codePostal?: string
    adresse?: string
    dpe?: string
    charges?: number
    anneeConstruction?: number
    titre?: string
    joursEnLigne?: number
  }
  error?: string
}
