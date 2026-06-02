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
  snapshotTitre?: string
  snapshotDescription?: string
  snapshotPhotos?: string[]
}

export interface ScoreQuartier {
  scoreGlobal: number
  niveau: 'EXCELLENT' | 'BON' | 'MOYEN' | 'FAIBLE'
  label: string
  revenuMedian: number | null
  revenuNiveau: string | null
  revenuVsNationale: number | null
  tauxCambriolages: number | null
  tauxVols: number | null
  securiteNiveau: string | null
  codeCommune: string | null
  nomCommune: string | null
  sourceDate: string
  dataDisponible: boolean
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
    snapshotTitre?: string
    snapshotDescription?: string
    snapshotPhotos?: string[]
  }
  error?: string
}
