import { httpClient } from '../lib/httpClient'

export interface AdemeData {
  classe: string
  consommationEnergie: number
  dateEtablissement: string
}

export async function getDPE(query: string): Promise<AdemeData | null> {
  const response = await httpClient.get(
    'https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants/lines',
    {
      params: {
        q: query,
        size: 1,
        select:
          'classe_consommation_energie,etiquette_ges,consommation_energie,estimation_ges,date_etablissement_dpe',
      },
    }
  )

  const results = response.data?.results as Array<Record<string, unknown>> | undefined
  if (!results?.length) return null

  const dpe = results[0]
  const classe = dpe.classe_consommation_energie as string | undefined
  if (!classe) return null

  return {
    classe,
    consommationEnergie: Number(dpe.consommation_energie ?? 0),
    dateEtablissement: String(dpe.date_etablissement_dpe ?? ''),
  }
}
