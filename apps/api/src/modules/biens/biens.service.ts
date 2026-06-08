import { prisma } from '../../lib/prisma'
import { type BienStatut } from '@prisma/client'
import { logger } from '../../lib/logger'
import { AppError, NotFoundError } from '../../lib/errors'
import * as dvfService from '../../services/dvf.service'
import * as ademeService from '../../services/ademe.service'
import * as claudeService from '../../services/claude.service'
import type { AnalyseContext } from '@immosafe/shared-types'
import type { BienFormulaireInput, AnalyseResultValidated } from './biens.schema'
import type { DvfData } from '../../services/dvf.service'
import type { AdemeData } from '../../services/ademe.service'

type TypeBien = 'APPARTEMENT' | 'MAISON' | 'STUDIO'
type SortOption = 'recent' | 'score' | 'prix_asc' | 'prix_desc'

const SORT_MAP: Record<SortOption, object> = {
  recent:    { createdAt: 'desc' },
  score:     { scoreImmoSafe: { sort: 'desc', nulls: 'last' } },
  prix_asc:  { prix: 'asc' },
  prix_desc: { prix: 'desc' },
}

function generateTitre(input: {
  typeBien: string
  adresse?: string | null
  ville: string
  codePostal?: string | null
  prix?: number | null
  surface?: number | null
}): string {
  const type =
    input.typeBien === 'APPARTEMENT' ? 'Appartement' :
    input.typeBien === 'MAISON' ? 'Maison' : 'Studio'

  const rue = input.adresse
    ? input.adresse.replace(/^\d+[a-zA-Z]?\s*(bis|ter|quater)?\s*/i, '').trim()
    : null

  const arrMatch = input.codePostal?.match(/^750(\d{2})$/)
  const arrondissement = arrMatch
    ? (() => { const n = parseInt(arrMatch[1]); return `Paris ${n}e${n === 1 ? 'r' : ''}` })()
    : null

  const lieu = arrondissement ?? input.ville

  if (rue && rue.length > 3) return `${type} · ${rue} · ${lieu}`

  if (input.prix && input.surface) {
    const prixM2 = Math.round(input.prix / input.surface)
    return `${type} · ${prixM2.toLocaleString('fr-FR')}€/m² · ${lieu}`
  }

  return `${type} · ${lieu}`
}

const PRIX_FALLBACK_M2: Record<TypeBien, number> = {
  APPARTEMENT: 3800,
  MAISON: 2600,
  STUDIO: 4200,
}

const RELANCE_COOLDOWN_MS = 24 * 60 * 60 * 1000

function buildAnalyseContext(
  input: BienFormulaireInput,
  dvfData: DvfData | null,
  ademeData: AdemeData | null
): AnalyseContext {
  let marche: AnalyseContext['marche']

  if (dvfData && dvfData.nbTransactions > 0) {
    marche = {
      prixM2MoyenQuartier: dvfData.prixM2MoyenQuartier,
      prixM2Min: dvfData.prixM2Min,
      prixM2Max: dvfData.prixM2Max,
      nbTransactions: dvfData.nbTransactions,
      transactionsRecentes: dvfData.transactionsRecentes,
    }
  } else {
    const fallback = PRIX_FALLBACK_M2[input.typeBien]
    marche = {
      prixM2MoyenQuartier: fallback,
      prixM2Min: Math.round(fallback * 0.8),
      prixM2Max: Math.round(fallback * 1.2),
      nbTransactions: 0,
      transactionsRecentes: [],
    }
  }

  return {
    bien: {
      prix: input.prix,
      surface: input.surface,
      typeBien: input.typeBien,
      nbPieces: input.nbPieces,
      ville: input.ville,
      codePostal: input.codePostal,
      adresse: input.adresse,
      dpe: input.dpe ?? ademeData?.classe,
      charges: input.charges,
      anneeConstruction: input.anneeConstruction,
    },
    marche,
  }
}

function ensureDataWarningPoint(
  analyse: AnalyseResultValidated,
  hasFallback: boolean
): AnalyseResultValidated {
  if (!hasFallback) return analyse

  const alreadyPresent = analyse.pointsVigilance.some(
    (p) =>
      p.titre.toLowerCase().includes('marché') ||
      p.titre.toLowerCase().includes('données') ||
      p.explication.toLowerCase().includes('national')
  )

  if (alreadyPresent) return analyse

  const injected = {
    niveau: 'INFO' as const,
    titre: 'Données de marché partielles',
    explication:
      "Aucune transaction récente n'a été trouvée dans ce secteur. L'évaluation de prix s'appuie sur des moyennes nationales — consultez un agent local pour affiner l'estimation.",
  }

  return {
    ...analyse,
    pointsVigilance: [injected, ...analyse.pointsVigilance].slice(0, 6),
  }
}

async function runAnalysisPipeline(input: BienFormulaireInput): Promise<{
  coords: { lat: number; lon: number } | null
  dvfData: DvfData | null
  ademeData: AdemeData | null
  analyse: AnalyseResultValidated
}> {
  let coords: { lat: number; lon: number } | null = null
  if (input.adresse && input.ville && input.codePostal) {
    coords = await dvfService.geocoder(input.adresse, input.ville, input.codePostal).catch(() => null)
  }
  if (!coords && input.ville && input.codePostal) {
    coords = await dvfService.geocoder('', input.ville, input.codePostal).catch(() => null)
  }
  if (!coords && input.ville) {
    coords = await dvfService.geocoder('', input.ville, '').catch(() => null)
  }
  if (!coords) {
    logger.warn({ ville: input.ville }, 'Géocoding échoué sur toutes les tentatives')
  }

  const [dvfData, ademeData] = await Promise.all([
    coords
      ? dvfService
          .getTransactions(coords.lat, coords.lon, input.surface, input.typeBien)
          .catch((err: Error) => {
            logger.warn({ err: err.message }, 'DVF indisponible')
            return null
          })
      : Promise.resolve(null),
    input.adresse
      ? ademeService
          .getDPE(`${input.adresse} ${input.ville}`)
          .catch((err: Error) => {
            logger.warn({ err: err.message }, 'ADEME indisponible')
            return null
          })
      : Promise.resolve(null),
  ])

  if (dvfData) {
    logger.info(
      { nbTransactions: dvfData.nbTransactions, prixM2Moyen: dvfData.prixM2MoyenQuartier },
      'DVF récupéré'
    )
  } else {
    logger.warn('DVF indisponible — fallback national utilisé')
  }

  if (ademeData) {
    logger.info({ classe: ademeData.classe }, 'ADEME récupéré')
  } else {
    logger.warn('ADEME indisponible')
  }

  const usedFallback = !dvfData
  const analyseContext = buildAnalyseContext(input, dvfData, ademeData)
  const dataNote = usedFallback
    ? 'IMPORTANT : Les données de marché locales sont indisponibles. Utilise les moyennes nationales fournies. Inclus OBLIGATOIREMENT un point de vigilance niveau INFO intitulé "Données de marché partielles".'
    : undefined

  const rawAnalyse = await claudeService.analyser(analyseContext, dataNote)
  const analyse = ensureDataWarningPoint(rawAnalyse, usedFallback)

  return { coords, dvfData, ademeData, analyse }
}

export async function analyserBien(
  input: BienFormulaireInput,
  userId?: string
): Promise<{ bienId: string; scoreImmoSafe: number; analyse: AnalyseResultValidated }> {
  const startTime = Date.now()
  logger.info({ ville: input.ville, typeBien: input.typeBien, prix: input.prix }, 'Analyse démarrée')

  const { coords, dvfData, ademeData, analyse } = await runAnalysisPipeline(input)

  const bien = await prisma.bien.create({
    data: {
      userId: userId ?? null,
      titre: generateTitre({ typeBien: input.typeBien, adresse: input.adresse, ville: input.ville, codePostal: input.codePostal, prix: input.prix, surface: input.surface }),
      prix: input.prix,
      surface: input.surface,
      typeBien: input.typeBien,
      nbPieces: input.nbPieces ?? null,
      ville: input.ville,
      codePostal: input.codePostal,
      adresse: input.adresse ?? null,
      latitude: coords?.lat ?? null,
      longitude: coords?.lon ?? null,
      dpe: input.dpe ?? ademeData?.classe ?? null,
      charges: input.charges ?? null,
      anneeConstruction: input.anneeConstruction ?? null,
      urlSource: input.urlSource ?? null,
      snapshotTitre: input.snapshotTitre ?? null,
      snapshotDescription: input.snapshotDescription ?? null,
      snapshotPhotos: input.snapshotPhotos ?? [],
      snapshotDate: input.snapshotTitre ? new Date() : null,
      prixM2Bien: input.prix / input.surface,
      prixM2Marche: dvfData?.prixM2MoyenQuartier ?? null,
      joursEnLigne: null,
      historiqueAnnonce: undefined,
      scoreImmoSafe: analyse.scoreImmoSafe,
      analyse: JSON.parse(JSON.stringify(analyse)),
    },
  })

  const durationTotaleMs = Date.now() - startTime
  logger.info({ bienId: bien.id, durationTotaleMs }, 'Bien sauvegardé')

  return { bienId: bien.id, scoreImmoSafe: analyse.scoreImmoSafe, analyse }
}

export async function relancerAnalyse(
  bienId: string,
  userId: string
): Promise<{ bienId: string; scoreImmoSafe: number; analyse: AnalyseResultValidated }> {
  const bien = await prisma.bien.findFirst({ where: { id: bienId, userId } })
  if (!bien) throw new NotFoundError('Bien introuvable')

  if (Date.now() - bien.updatedAt.getTime() < RELANCE_COOLDOWN_MS) {
    throw new AppError(429, 'TOO_EARLY', 'Relancement possible seulement 24h après la dernière analyse')
  }

  const input: BienFormulaireInput = {
    prix: bien.prix,
    surface: bien.surface,
    typeBien: bien.typeBien as BienFormulaireInput['typeBien'],
    nbPieces: bien.nbPieces ?? undefined,
    ville: bien.ville,
    codePostal: bien.codePostal,
    adresse: bien.adresse ?? undefined,
    dpe: bien.dpe as BienFormulaireInput['dpe'],
    charges: bien.charges ?? undefined,
    anneeConstruction: bien.anneeConstruction ?? undefined,
  }

  logger.info({ bienId, ville: bien.ville }, 'Relancement analyse')
  const { coords, dvfData, analyse } = await runAnalysisPipeline(input)

  const existingHistory = Array.isArray(bien.historiqueScores) ? (bien.historiqueScores as number[]) : []
  const newHistory = bien.scoreImmoSafe != null ? [...existingHistory, bien.scoreImmoSafe] : existingHistory

  await prisma.bien.update({
    where: { id: bienId },
    data: {
      titre: generateTitre({ typeBien: bien.typeBien, adresse: bien.adresse, ville: bien.ville, codePostal: bien.codePostal, prix: bien.prix, surface: bien.surface }),
      latitude: coords?.lat ?? bien.latitude,
      longitude: coords?.lon ?? bien.longitude,
      prixM2Marche: dvfData?.prixM2MoyenQuartier ?? bien.prixM2Marche,
      scoreImmoSafe: analyse.scoreImmoSafe,
      analyse: JSON.parse(JSON.stringify(analyse)),
      historiqueScores: newHistory,
    },
  })

  return { bienId, scoreImmoSafe: analyse.scoreImmoSafe, analyse }
}

export async function getBienById(id: string, userId: string) {
  // Try as owner first
  const bien = await prisma.bien.findFirst({ where: { id, userId } })
  if (bien) return bien

  // Check if user is an active guest for this bien's owner
  const bienOwner = await prisma.bien.findFirst({ where: { id }, select: { userId: true } })
  if (!bienOwner?.userId) return null

  const hasAccess = await prisma.sharedAccess.findFirst({
    where: { ownerId: bienOwner.userId, guestId: userId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (!hasAccess) return null

  return prisma.bien.findFirst({ where: { id } })
}

export async function getBiens(
  userId: string,
  opts: { search?: string; page?: number; limit?: number; sort?: string } = {}
): Promise<{
  biens: {
    id: string
    userId: string | null
    titre: string | null
    ville: string
    typeBien: string
    prix: number
    surface: number
    scoreImmoSafe: number | null
    isFavorite: boolean
    statut: string
    createdAt: Date
    latitude: number | null
    longitude: number | null
    annonceRetiree: boolean
    snapshotPhotos: string[]
    votes: Array<{ userId: string; vote: string; comment: string | null }>
  }[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}> {
  const page = Math.max(1, opts.page ?? 1)
  const limit = Math.min(50, Math.max(1, opts.limit ?? 12))
  const skip = (page - 1) * limit
  const orderBy = SORT_MAP[(opts.sort as SortOption) ?? 'score'] ?? SORT_MAP.score

  const where = {
    userId,
    ...(opts.search
      ? { ville: { contains: opts.search, mode: 'insensitive' as const } }
      : {}),
  }

  const [biens, total] = await Promise.all([
    prisma.bien.findMany({
      where,
      select: {
        id: true,
        userId: true,
        titre: true,
        ville: true,
        typeBien: true,
        prix: true,
        surface: true,
        scoreImmoSafe: true,
        isFavorite: true,
        statut: true,
        createdAt: true,
        latitude: true,
        longitude: true,
        annonceRetiree: true,
        snapshotPhotos: true,
        votes: { select: { userId: true, vote: true, comment: true } },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.bien.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)
  return {
    biens: biens.map((bien) => ({
      ...bien,
      snapshotPhotos: (bien.snapshotPhotos as string[] | null) ?? [],
    })),
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  }
}

export async function updateBien(id: string, userId: string, data: { isFavorite?: boolean; statut?: BienStatut }) {
  return prisma.bien.updateMany({
    where: { id, userId },
    data,
  })
}

export async function deleteBien(id: string, userId: string): Promise<void> {
  const bien = await prisma.bien.findFirst({ where: { id, userId } })
  if (!bien) throw new NotFoundError('Bien introuvable')

  await prisma.$transaction([
    prisma.rapport.deleteMany({ where: { bienId: id } }),
    prisma.sharedAnalyse.deleteMany({ where: { bienId: id } }),
    prisma.bienVote.deleteMany({ where: { bienId: id } }),
    prisma.priceCheck.deleteMany({ where: { bienId: id } }),
    prisma.bien.delete({ where: { id } }),
  ])
}
