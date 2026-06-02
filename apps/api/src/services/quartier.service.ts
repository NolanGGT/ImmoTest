import NodeCache from 'node-cache'
import { httpClient } from '../lib/httpClient'
import { logger } from '../lib/logger'
import type { ScoreQuartier } from '@immosafe/shared-types'

export type { ScoreQuartier }

const quartierCache = new NodeCache({ stdTTL: 24 * 60 * 60, checkperiod: 3_600 })

const MOYENNES_NATIONALES = {
  revenuMedian: 21_630,  // €/an par UC, INSEE Filosofi 2021
  tauxCambriolages: 2.1, // pour 1000 hab, SSMSI 2023
}

// ─── Table de référence villes françaises ────────────────────────────────────
// Source : INSEE Filosofi 2021 (revenu médian par UC/an)
//          SSMSI 2023 (cambriolages de logement pour 1000 habitants)
// Couverture : ~80% des utilisateurs ImmoTest
// Clé = code INSEE commune (geo.api.gouv.fr)

interface CommuneRef {
  nom: string
  revenuMedian: number  // €/an par UC
  tauxCambriolages: number  // pour 1000 hab
}

const COMMUNES_REF: Record<string, CommuneRef> = {
  '75056': { nom: 'Paris',        revenuMedian: 27_920, tauxCambriolages: 7.4 },
  '13055': { nom: 'Marseille',    revenuMedian: 17_200, tauxCambriolages: 3.9 },
  '69123': { nom: 'Lyon',         revenuMedian: 22_200, tauxCambriolages: 4.3 },
  '31555': { nom: 'Toulouse',     revenuMedian: 21_100, tauxCambriolages: 3.7 },
  '06088': { nom: 'Nice',         revenuMedian: 23_500, tauxCambriolages: 3.3 },
  '44109': { nom: 'Nantes',       revenuMedian: 22_700, tauxCambriolages: 2.9 },
  '34172': { nom: 'Montpellier',  revenuMedian: 19_000, tauxCambriolages: 4.1 },
  '67482': { nom: 'Strasbourg',   revenuMedian: 21_000, tauxCambriolages: 3.0 },
  '33063': { nom: 'Bordeaux',     revenuMedian: 21_800, tauxCambriolages: 3.6 },
  '59350': { nom: 'Lille',        revenuMedian: 17_400, tauxCambriolages: 3.4 },
  '35238': { nom: 'Rennes',       revenuMedian: 23_200, tauxCambriolages: 2.4 },
  '51454': { nom: 'Reims',        revenuMedian: 19_800, tauxCambriolages: 2.8 },
  '76351': { nom: 'Le Havre',     revenuMedian: 18_500, tauxCambriolages: 2.6 },
  '42218': { nom: 'Saint-Étienne',revenuMedian: 17_900, tauxCambriolages: 2.7 },
  '83137': { nom: 'Toulon',       revenuMedian: 20_100, tauxCambriolages: 3.1 },
  '38185': { nom: 'Grenoble',     revenuMedian: 19_200, tauxCambriolages: 4.2 },
  '21231': { nom: 'Dijon',        revenuMedian: 21_300, tauxCambriolages: 2.9 },
  '49007': { nom: 'Angers',       revenuMedian: 21_600, tauxCambriolages: 2.5 },
  '30189': { nom: 'Nîmes',        revenuMedian: 18_200, tauxCambriolages: 3.5 },
  '69266': { nom: 'Villeurbanne', revenuMedian: 21_400, tauxCambriolages: 3.2 },
  '76540': { nom: 'Rouen',        revenuMedian: 19_500, tauxCambriolages: 2.8 },
  '80021': { nom: 'Amiens',       revenuMedian: 18_800, tauxCambriolages: 2.4 },
  '67300': { nom: 'Mulhouse',     revenuMedian: 17_100, tauxCambriolages: 3.6 },
  '57463': { nom: 'Metz',         revenuMedian: 20_400, tauxCambriolages: 2.9 },
  '54395': { nom: 'Nancy',        revenuMedian: 19_900, tauxCambriolages: 2.7 },
  '63113': { nom: 'Clermont-Ferrand', revenuMedian: 20_200, tauxCambriolages: 2.8 },
  '14118': { nom: 'Caen',         revenuMedian: 20_600, tauxCambriolages: 2.6 },
  '34090': { nom: 'Tours',        revenuMedian: 21_000, tauxCambriolages: 2.7 },
  '87085': { nom: 'Limoges',      revenuMedian: 19_700, tauxCambriolages: 2.3 },
  '45234': { nom: 'Orléans',      revenuMedian: 20_900, tauxCambriolages: 2.5 },
}

const FALLBACK: ScoreQuartier = {
  scoreGlobal: 50,
  niveau: 'MOYEN',
  label: 'Données indisponibles',
  revenuMedian: null,
  revenuNiveau: null,
  revenuVsNationale: null,
  tauxCambriolages: null,
  tauxVols: null,
  securiteNiveau: null,
  codeCommune: null,
  nomCommune: null,
  sourceDate: '',
  dataDisponible: false,
}

// ─── Service principal ────────────────────────────────────────────────────────

export async function getScoreQuartier(lat: number, lon: number): Promise<ScoreQuartier> {
  const cacheKey = `quartier:${lat.toFixed(3)}:${lon.toFixed(3)}`
  const cached = quartierCache.get<ScoreQuartier>(cacheKey)
  if (cached) return cached

  const commune = await getInfosCommune(lat, lon)
  if (!commune) {
    logger.debug({ lat, lon }, 'Score quartier: commune introuvable')
    return { ...FALLBACK }
  }

  logger.debug({ codeCommune: commune.code, nom: commune.nom }, 'Score quartier: commune trouvée')

  const ref = COMMUNES_REF[commune.code]
  if (!ref) {
    // Commune hors table de référence → pas de données disponibles
    logger.debug({ codeCommune: commune.code }, 'Score quartier: hors table de référence')
    const result: ScoreQuartier = {
      ...FALLBACK,
      codeCommune: commune.code,
      nomCommune: commune.nom,
    }
    quartierCache.set(cacheKey, result)
    return result
  }

  // ─── Score revenus (0–50 pts) ─────────────────────────────────────────────
  const ratioRevenus = ref.revenuMedian / MOYENNES_NATIONALES.revenuMedian
  const revenuVsNationale = Math.round((ratioRevenus - 1) * 100)

  let scoreRevenus: number
  let revenuNiveau: string
  if (ratioRevenus >= 1.5)      { scoreRevenus = 50; revenuNiveau = 'Très élevé' }
  else if (ratioRevenus >= 1.2) { scoreRevenus = 42; revenuNiveau = 'Élevé' }
  else if (ratioRevenus >= 0.9) { scoreRevenus = 33; revenuNiveau = 'Dans la moyenne' }
  else if (ratioRevenus >= 0.7) { scoreRevenus = 20; revenuNiveau = 'Faible' }
  else                          { scoreRevenus = 10; revenuNiveau = 'Très faible' }

  // ─── Score sécurité (0–50 pts) ───────────────────────────────────────────
  let scoreSecurite: number
  let securiteNiveau: string
  const taux = ref.tauxCambriolages
  if (taux < 1)      { scoreSecurite = 50; securiteNiveau = 'Très sûr' }
  else if (taux < 2) { scoreSecurite = 40; securiteNiveau = 'Sûr' }
  else if (taux < 4) { scoreSecurite = 28; securiteNiveau = 'Vigilance recommandée' }
  else if (taux < 7) { scoreSecurite = 15; securiteNiveau = 'Zone sensible' }
  else               { scoreSecurite = 5;  securiteNiveau = 'Zone à risque' }

  const scoreGlobal = Math.round(scoreRevenus + scoreSecurite)

  let niveau: ScoreQuartier['niveau']
  let label: string
  if (scoreGlobal >= 75)      { niveau = 'EXCELLENT'; label = 'Quartier aisé et très sûr' }
  else if (scoreGlobal >= 55) { niveau = 'BON';       label = 'Quartier agréable' }
  else if (scoreGlobal >= 35) { niveau = 'MOYEN';     label = 'Quartier dans la moyenne' }
  else                        { niveau = 'FAIBLE';    label = 'Quartier défavorisé' }

  const result: ScoreQuartier = {
    scoreGlobal,
    niveau,
    label,
    revenuMedian: ref.revenuMedian,
    revenuNiveau,
    revenuVsNationale,
    tauxCambriolages: ref.tauxCambriolages,
    tauxVols: null,
    securiteNiveau,
    codeCommune: commune.code,
    nomCommune: ref.nom,
    sourceDate: 'INSEE Filosofi 2021 · SSMSI 2023',
    dataDisponible: true,
  }

  quartierCache.set(cacheKey, result)
  logger.info({ codeCommune: commune.code, nom: ref.nom, scoreGlobal }, 'Score quartier calculé')
  return result
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface CommuneInfo { code: string; nom: string }

async function getInfosCommune(lat: number, lon: number): Promise<CommuneInfo | null> {
  try {
    const res = await httpClient.get<{ code: string; nom: string }[]>(
      'https://geo.api.gouv.fr/communes',
      { params: { lat, lon, fields: 'code,nom', format: 'json' }, timeout: 5000 }
    )
    const first = res.data?.[0]
    if (!first?.code) return null
    return { code: first.code, nom: first.nom }
  } catch {
    return null
  }
}
