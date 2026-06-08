import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import { logger } from '../lib/logger'
import { AppError } from '../lib/errors'
import { AnalyseResultSchema, type AnalyseResultValidated } from '../modules/biens/biens.schema'
import type { AnalyseContext } from '@immosafe/shared-types'

const MODEL = 'claude-haiku-4-5'
let systemPromptCache: string | null = null

function loadSystemPrompt(): string {
  if (systemPromptCache) return systemPromptCache
  const promptPath = path.join(__dirname, '../../prompts', 'analyse-bien.txt')
  systemPromptCache = fs.readFileSync(promptPath, 'utf-8')
  return systemPromptCache
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof Anthropic.APIError) {
    return (err.status ?? 0) === 408 || (err.status ?? 0) === 529 || (err.status ?? 0) >= 500
  }
  return false
}

// Forced tool use — Claude must return structured JSON matching AnalyseResult,
// which eliminates the possibility of markdown-wrapped responses.
const ANALYSE_BIEN_TOOL: Anthropic.Tool = {
  name: 'analyse_bien',
  description: "Retourne l'analyse structurée d'un bien immobilier pour un acheteur primo-accédant",
  input_schema: {
    type: 'object',
    required: ['scoreImmoSafe', 'prixAnalyse', 'negociation', 'pointsVigilance', 'questionsVendeur', 'syntheseTexte'],
    properties: {
      scoreImmoSafe: { type: 'integer', minimum: 0, maximum: 100 },
      prixAnalyse: {
        type: 'object',
        required: ['prixM2Bien', 'prixM2Marche', 'ecartPourcentage', 'phraseVerdict'],
        properties: {
          prixM2Bien: { type: 'number' },
          prixM2Marche: { type: 'number' },
          ecartPourcentage: { type: 'number' },
          phraseVerdict: { type: 'string' },
        },
      },
      dpeAnalyse: {
        type: 'object',
        required: ['classe', 'surcoutMensuelEstime', 'interdictionLocation2028', 'phraseImpact'],
        properties: {
          classe: { type: 'string', enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] },
          surcoutMensuelEstime: { type: 'number' },
          interdictionLocation2028: { type: 'boolean' },
          phraseImpact: { type: 'string' },
        },
      },
      negociation: {
        type: 'object',
        required: ['margeEstimee', 'prixCibleMin', 'prixCibleMax', 'phraseActionnable', 'argumentsNegociation'],
        properties: {
          margeEstimee: { type: 'number', minimum: 0, maximum: 20 },
          prixCibleMin: { type: 'number' },
          prixCibleMax: { type: 'number' },
          phraseActionnable: { type: 'string' },
          argumentsNegociation: { type: 'array', items: { type: 'string' } },
        },
      },
      pointsVigilance: {
        type: 'array',
        minItems: 2,
        maxItems: 6,
        items: {
          type: 'object',
          required: ['niveau', 'titre', 'explication'],
          properties: {
            niveau: { type: 'string', enum: ['INFO', 'ATTENTION', 'CRITIQUE'] },
            titre: { type: 'string' },
            explication: { type: 'string' },
          },
        },
      },
      questionsVendeur: {
        type: 'array',
        minItems: 3,
        maxItems: 7,
        items: {
          type: 'object',
          required: ['question', 'pourquoi'],
          properties: {
            question: { type: 'string' },
            pourquoi: { type: 'string' },
          },
        },
      },
      syntheseTexte: { type: 'string' },
      adressePrecise: {
        type: 'string',
        description: "Adresse précise extraite du titre ou de la description (numéro + rue, résidence, quartier), ou omis si introuvable",
      },
    },
  },
}

async function callClaudeWithTool(
  client: Anthropic,
  systemPrompt: string,
  userMessage: string
): Promise<unknown> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
    tools: [ANALYSE_BIEN_TOOL],
    tool_choice: { type: 'tool', name: 'analyse_bien' },
  })

  const toolBlock = response.content.find((b) => b.type === 'tool_use')
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new AppError(500, 'AI_PARSE_ERROR', "Le modèle n'a pas retourné de réponse structurée")
  }
  return toolBlock.input
}

export async function analyser(
  context: AnalyseContext,
  dataNote?: string
): Promise<AnalyseResultValidated> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: 30_000,
  })

  const systemPrompt = loadSystemPrompt()
  const noteSection = dataNote ? `\n${dataNote}\n` : ''
  const userMessage = `Analyse ce bien immobilier. Si le titre ou la description mentionne une adresse précise (numéro + rue, nom de résidence, référence à un quartier spécifique ou une rue), extrais-la et retourne-la dans le champ "adressePrecise". Exemples : "rue de la Paix", "résidence Les Lilas", "angle boulevard Victor Hugo". Si aucune adresse précise n'est trouvée, omets ce champ.

IMPORTANT: dpeAnalyse doit être un objet JSON, pas une string. questionsVendeur doit être un tableau JSON [], pas une string. Retourne uniquement du JSON valide, sans markdown ni backticks.${noteSection}\n\n${JSON.stringify(context, null, 2)}`

  logger.info({ contextSize: userMessage.length, model: MODEL }, 'Claude appelé')

  const startTime = Date.now()
  let parsed: unknown

  try {
    parsed = await callClaudeWithTool(client, systemPrompt, userMessage)
  } catch (err) {
    if (err instanceof AppError) throw err
    if (isRetryableError(err)) {
      logger.warn({ attempt: 1 }, 'Claude API retry après erreur')
      try {
        parsed = await callClaudeWithTool(client, systemPrompt, userMessage)
      } catch (retryErr) {
        logger.error({ err: retryErr }, 'Claude API échec après retry')
        throw new AppError(500, 'AI_SERVICE_ERROR', "Le service d'analyse est temporairement indisponible")
      }
    } else {
      logger.error({ err }, 'Claude API erreur non-retryable')
      throw new AppError(500, 'AI_SERVICE_ERROR', "Le service d'analyse est temporairement indisponible")
    }
  }

  const durationMs = Date.now() - startTime

  const result = AnalyseResultSchema.safeParse(parsed)
  if (!result.success) {
    logger.error({ errors: result.error.flatten() }, 'Réponse Claude invalide (Zod)')
    throw new AppError(500, 'AI_VALIDATION_ERROR', "Erreur lors de la validation de l'analyse")
  }

  logger.info({ scoreImmoSafe: result.data.scoreImmoSafe, durationMs }, 'Claude répondu')
  return result.data
}
