import { z } from 'zod'

export const BienFormulaireSchema = z
  .object({
    prix: z.number().int().positive().max(10_000_000),
    surface: z.number().positive().max(1000),
    typeBien: z.enum(['APPARTEMENT', 'MAISON', 'STUDIO']),
    nbPieces: z.number().int().min(1).max(20).optional(),
    ville: z.string().min(2).max(100),
    codePostal: z.string().regex(/^[0-9]{5}$/, 'Code postal invalide (5 chiffres requis)'),
    adresse: z.string().max(200).optional(),
    dpe: z.preprocess(v => typeof v === 'string' ? v.toUpperCase() : v, z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G']).optional()),
    charges: z.number().int().min(0).max(10000).optional(),
    anneeConstruction: z.number().int().min(1800).max(2030).optional(),
    urlSource: z.string().max(500).optional(),
    snapshotTitre: z.string().max(500).optional(),
    snapshotDescription: z.string().max(2100).optional(),
    snapshotPhotos: z.array(z.string().max(500)).max(5).optional(),
  })
  .superRefine((data, ctx) => {
    const prixM2 = data.prix / data.surface
    if (prixM2 < 500) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Le prix semble incohérent (< 500 €/m²)', path: ['prix'] })
    }
    if (prixM2 > 30_000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Le prix semble incohérent (> 30 000 €/m²)', path: ['prix'] })
    }
    if (data.typeBien === 'MAISON' && data.surface < 20) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Une maison ne peut pas faire moins de 20 m²', path: ['surface'] })
    }
    if (data.anneeConstruction && data.anneeConstruction > new Date().getFullYear()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "L'année de construction ne peut pas être dans le futur", path: ['anneeConstruction'] })
    }
  })

export type BienFormulaireInput = z.infer<typeof BienFormulaireSchema>

export const VoteSchema = z.object({
  vote: z.enum(['LOVE', 'LIKE', 'DISLIKE']),
  comment: z.string().max(500).optional(),
})

export type VoteInput = z.infer<typeof VoteSchema>

export const UpdateBienSchema = z.object({
  isFavorite: z.boolean().optional(),
  statut: z.enum(['EN_COURS', 'VISITE_PLANIFIEE', 'OFFRE_FAITE', 'ABANDONNE'] as const).optional(),
})

export type UpdateBienInput = z.infer<typeof UpdateBienSchema>

const PointVigilanceSchema = z.object({
  niveau: z.enum(['INFO', 'ATTENTION', 'CRITIQUE']),
  titre: z.string().min(1),
  explication: z.string().min(1),
})

const QuestionVendeurSchema = z.object({
  question: z.string().min(1),
  pourquoi: z.string().min(1),
})

export const AnalyseResultSchema = z.object({
  scoreImmoSafe: z.number().int().min(0).max(100),

  prixAnalyse: z.object({
    prixM2Bien: z.number().positive(),
    prixM2Marche: z.number().positive(),
    ecartPourcentage: z.number(),
    phraseVerdict: z.string().min(1),
  }),

  dpeAnalyse: z
    .object({
      classe: z.string().min(1),
      surcoutMensuelEstime: z.number().min(0),
      interdictionLocation2028: z.boolean(),
      phraseImpact: z.string().min(1),
    })
    .optional(),

  negociation: z.object({
    margeEstimee: z.number().min(0).max(20),
    prixCibleMin: z.number().positive(),
    prixCibleMax: z.number().positive(),
    phraseActionnable: z.string().min(1),
    argumentsNegociation: z.array(z.string().min(1)).min(1),
  }),

  pointsVigilance: z.array(PointVigilanceSchema).min(2).max(6),
  questionsVendeur: z.array(QuestionVendeurSchema).min(3).max(7),
  syntheseTexte: z.string().min(50).max(800),
  adressePrecise: z.string().nullable().optional(),
})

export type AnalyseResultValidated = z.infer<typeof AnalyseResultSchema>
