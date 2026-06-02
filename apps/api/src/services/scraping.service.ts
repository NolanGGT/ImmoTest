import axios from 'axios'
import * as cheerio from 'cheerio'
import { logger } from '../lib/logger'
import type { ScrapingResult } from '@immosafe/shared-types'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'

const HTTP_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  Referer: 'https://www.leboncoin.fr/',
}

const BLOCKED_PATTERNS = ['captcha', 'challenge', 'cf-browser-verification']

function isBlocked(html: string): boolean {
  const lower = html.toLowerCase()
  return BLOCKED_PATTERNS.some((p) => lower.includes(p))
}

// ─── Source detection ─────────────────────────────────────────────────────

export type ScrapingSource = 'seloger' | 'leboncoin' | 'pap' | 'unknown'

export function detectSource(url: string): ScrapingSource {
  if (url.includes('seloger.com')) return 'seloger'
  if (url.includes('leboncoin.fr')) return 'leboncoin'
  if (url.includes('pap.fr')) return 'pap'
  return 'unknown'
}

// ─── Main function ────────────────────────────────────────────────────────

export async function scrapeAnnonce(url: string): Promise<ScrapingResult> {
  const source = detectSource(url)

  if (source === 'unknown') {
    return { success: false, partial: false, source, data: {}, error: 'unsupported' }
  }

  try {
    const response = await axios.get<string>(url, {
      headers: HTTP_HEADERS,
      timeout: 8000,
      maxRedirects: 3,
      validateStatus: (status) => status < 500,
    })

    if (response.status === 403 || (source === 'leboncoin' && isBlocked(response.data as string))) {
      logger.warn({ url, status: response.status, source }, 'Scraping: bloqué')
      return { success: false, partial: false, source, data: {}, error: 'blocked' }
    }

    if (response.status >= 400) {
      logger.warn({ url, status: response.status }, 'Scraping: page inaccessible')
      return { success: false, partial: false, source, data: {}, error: `http_${response.status}` }
    }

    const $ = cheerio.load(response.data)

    const result =
      tryNextData($, source) ??
      tryJsonLd($, source) ??
      tryMetaAndDom($, source)

    if (!result) {
      return { success: false, partial: false, source, data: {}, error: 'no_data' }
    }

    logger.info(
      { source, method: result.method, hasPrix: !!result.data.prix, hasSurface: !!result.data.surface },
      'Scraping terminé'
    )

    const { method: _method, ...scrapingResult } = result
    return scrapingResult
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string }
    const isTimeout = err.code === 'ECONNABORTED' || (err.message ?? '').includes('timeout')
    logger.warn({ url, source, error: err.message }, 'Scraping échoué')
    return {
      success: false,
      partial: false,
      source,
      data: {},
      error: isTimeout ? 'timeout' : 'network_error',
    }
  }
}

// ─── Strategy 1: __NEXT_DATA__ ────────────────────────────────────────────

function tryNextData(
  $: cheerio.CheerioAPI,
  source: ScrapingSource
): (ScrapingResult & { method: string }) | null {
  const raw = $('#__NEXT_DATA__').text()
  if (!raw) return null

  try {
    const json = JSON.parse(raw) as Record<string, unknown>
    const props = (json?.props as Record<string, unknown>)?.pageProps as Record<string, unknown>
    if (!props) return null

    if (source === 'seloger') {
      const listing =
        (props.listing ??
          props.classified ??
          (props.initialProps as Record<string, unknown>)?.listing ??
          props.ad) as Record<string, unknown> | undefined

      if (!listing) return null

      const prix =
        (listing.price as number) ??
        ((listing.prices as Record<string, unknown>)?.displayedPrice as number) ??
        null
      const surface = (listing.surface as number) ?? (listing.surfaceArea as number) ?? null
      const ville =
        (listing.city as string) ??
        ((listing.location as Record<string, unknown>)?.city as string) ??
        null
      const codePostal =
        (listing.zipCode as string) ??
        ((listing.location as Record<string, unknown>)?.postalCode as string) ??
        null
      const dpeRaw =
        (listing.energyValue as string) ??
        (listing.dpe as string) ??
        ((listing.energyRating as Record<string, unknown>)?.class as string) ??
        null
      const dpe = dpeRaw ? dpeRaw.toUpperCase() : null
      const nbPieces =
        (listing.roomsQuantity as number) ?? (listing.rooms as number) ?? null
      const charges = (listing.charges as number) ?? (listing.monthlyCharges as number) ?? null
      const anneeConstruction = (listing.constructionYear as number) ?? null
      const typeBien = parseTypeBien(
        ((listing.propertyType as string) ?? (listing.realtyType as string) ?? '').toLowerCase()
      )

      const snapshotTitre = ((listing.title ?? listing.heading) as string | undefined) ?? null
      const snapshotDescription = ((listing.description as string) || '').slice(0, 2000) || null
      const rawPhotos = (listing.photos ?? listing.images ?? []) as unknown[]
      const snapshotPhotos = rawPhotos
        .slice(0, 5)
        .map((p: unknown) => (p as Record<string, string>).url ?? (p as Record<string, string>).src ?? (typeof p === 'string' ? p : ''))
        .filter((url) => typeof url === 'string' && url.startsWith('http'))

      return buildResult(
        { prix, surface, ville, codePostal, dpe, nbPieces, charges, anneeConstruction, typeBien, snapshotTitre, snapshotDescription, snapshotPhotos },
        source,
        'next-data-seloger'
      )
    }

    if (source === 'leboncoin') {
      const ad =
        (props.ad ??
          props.adDetail ??
          (props.data as Record<string, unknown>)?.ad ??
          props.classified) as Record<string, unknown> | undefined

      if (!ad) return null

      const attrs = (ad.attributes as Array<Record<string, unknown>>) ?? []
      const getAttr = (key: string): string | null => {
        const found = attrs.find((a) => a.key === key)
        return (found?.value as string) ?? (found?.value_label as string) ?? null
      }

      const surfaceRaw = getAttr('square') ?? getAttr('surface') ?? ''
      const surface = parseFloat(surfaceRaw.replace(/[^\d.]/g, '')) || null
      const typeBien = parseTypeBien(
        ((ad.category_name as string) ?? getAttr('real_estate_type') ?? '').toLowerCase()
      )
      const dpeRaw = getAttr('energy_rate') ?? getAttr('dpe') ?? null
      const dpe = dpeRaw ? dpeRaw.toUpperCase() : null
      const nbPieces = parseInt(getAttr('rooms') ?? '') || null
      const anneeConstruction = parseInt(getAttr('construction_year') ?? '') || null
      const location = ad.location as Record<string, unknown> | undefined

      const snapshotTitre = ((ad.subject ?? ad.title) as string | undefined) ?? null
      const snapshotDescription = ((ad.body as string) || '').slice(0, 2000) || null
      const adImages = ad.images as Record<string, string[]> | undefined
      const snapshotPhotos = (adImages?.urls_large ?? adImages?.urls ?? [])
        .slice(0, 5)
        .filter((url) => typeof url === 'string' && url.startsWith('http'))

      return buildResult(
        {
          prix: ((ad.price as number[]) ?? [])[0] ?? null,
          surface,
          ville: (location?.city as string) ?? null,
          codePostal: (location?.zipcode as string) ?? null,
          adresse: (location?.address as string) ?? null,
          dpe,
          nbPieces,
          typeBien,
          anneeConstruction,
          snapshotTitre,
          snapshotDescription,
          snapshotPhotos,
        },
        source,
        'next-data-leboncoin'
      )
    }
  } catch (e) {
    logger.debug({ source, error: String(e) }, '__NEXT_DATA__ parse error')
  }

  return null
}

// ─── Strategy 2: JSON-LD ──────────────────────────────────────────────────

function tryJsonLd(
  $: cheerio.CheerioAPI,
  source: ScrapingSource
): (ScrapingResult & { method: string }) | null {
  const scripts = $('script[type="application/ld+json"]')

  for (let i = 0; i < scripts.length; i++) {
    try {
      const json = JSON.parse($(scripts[i]).text() ?? '') as Record<string, unknown>

      const listing =
        json['@type'] === 'RealEstateListing'
          ? json
          : json['@type'] === 'Product'
            ? json
            : Array.isArray(json['@graph'])
              ? (json['@graph'] as Array<Record<string, unknown>>).find(
                  (g) => g['@type'] === 'RealEstateListing' || g.price || g.offers
                )
              : null

      if (!listing) continue

      const offers = listing.offers as Record<string, unknown> | undefined
      const prix =
        (listing.price as number) ??
        (offers?.price as number) ??
        (offers?.lowPrice as number) ??
        null

      const floorSize = listing.floorSize as Record<string, unknown> | undefined
      const surface = (floorSize?.value as number) ?? null

      if (!prix && !surface) continue

      const address = listing.address as Record<string, unknown> | undefined

      return buildResult(
        {
          prix: prix ? parseInt(String(prix).replace(/[^\d]/g, '')) || null : null,
          surface: surface ? parseFloat(String(surface)) || null : null,
          ville: (address?.addressLocality as string) ?? null,
          codePostal: (address?.postalCode as string) ?? null,
          adresse: (address?.streetAddress as string) ?? null,
        },
        source,
        'json-ld'
      )
    } catch {}
  }

  return null
}

// ─── Strategy 3: meta + DOM fallback ─────────────────────────────────────

function tryMetaAndDom(
  $: cheerio.CheerioAPI,
  source: ScrapingSource
): (ScrapingResult & { method: string }) | null {
  const ogTitle = $('meta[property="og:title"]').attr('content') ?? ''
  const ogDescription = $('meta[property="og:description"]').attr('content') ?? ''
  const pageTitle = $('title').text() ?? ''

  const prix = extractPrixFromDom($)
  const surface = extractSurfaceFromText($('body').text() + ' ' + ogDescription)
  const ville = extractVilleFromDom($)
  const dpe = extractDpeFromText($('body').text().slice(0, 5000))
  const typeBien = parseTypeBien(ogTitle + ' ' + pageTitle)

  if (!prix && !surface) return null

  const snapshotTitre = pageTitle || ogTitle || null
  const descText = $('[class*="description"]').first().text().trim()
  const snapshotDescription = (descText || ogDescription).slice(0, 2000) || null
  const snapshotPhotos = $('[class*="photo"] img, [class*="gallery"] img')
    .toArray()
    .slice(0, 5)
    .map((img) => $(img).attr('src') ?? '')
    .filter((src) => src.startsWith('http'))

  return buildResult({ prix, surface, ville, dpe, typeBien, snapshotTitre, snapshotDescription, snapshotPhotos }, source, 'dom-fallback')
}

// ─── DOM helpers ──────────────────────────────────────────────────────────

function extractPrixFromDom($: cheerio.CheerioAPI): number | null {
  const priceSelectors = [
    '[data-testid="price"]',
    '[class*="price__"]',
    '[class*="Price"]',
    '.price',
    '.prix',
    '[itemprop="price"]',
    '[class*="bien-prix"]',
    'span[class*="amount"]',
  ]
  for (const selector of priceSelectors) {
    const text = $(selector).first().text().replace(/[^\d]/g, '')
    const n = parseInt(text)
    if (n > 10000 && n < 100_000_000) return n
  }
  const match = $('body').text().slice(0, 3000).match(/(\d[\d\s]{4,8}\d)\s*€/)
  if (match) {
    const n = parseInt(match[1].replace(/\s/g, ''))
    if (n > 50000 && n < 10_000_000) return n
  }
  return null
}

function extractSurfaceFromText(text: string): number | null {
  const patterns = [
    /(\d+[,.]?\d*)\s*m[²2]/i,
    /surface\s*[:\s]+(\d+[,.]?\d*)/i,
    /(\d+[,.]?\d*)\s*m\s*carr/i,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const n = parseFloat(match[1].replace(',', '.'))
      if (n > 5 && n < 2000) return n
    }
  }
  return null
}

function extractVilleFromDom($: cheerio.CheerioAPI): string | null {
  const selectors = [
    '[data-testid="city"]',
    '[class*="city"]',
    '[class*="ville"]',
    '[class*="location"]',
    '[itemprop="addressLocality"]',
  ]
  for (const selector of selectors) {
    const text = $(selector).first().text().trim()
    if (text.length >= 2 && text.length <= 50) return text
  }
  return null
}

function extractDpeFromText(text: string): string | null {
  const patterns = [
    /DPE\s*[:\s]+([A-G])\b/i,
    /classe\s+[éenergie]+\s*[:\s]+([A-G])\b/i,
    /étiquette\s+[éenergie]+\s*[:\s]+([A-G])\b/i,
    /\bclasse\s+([A-G])\b/,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return match[1].toUpperCase()
  }
  return null
}

function parseTypeBien(text: string): 'APPARTEMENT' | 'MAISON' | 'STUDIO' | null {
  const t = text.toLowerCase()
  if (t.includes('studio')) return 'STUDIO'
  if (t.includes('appartement') || t.includes('appart')) return 'APPARTEMENT'
  if (t.includes('maison') || t.includes('villa') || t.includes('pavillon')) return 'MAISON'
  return null
}

// ─── Result builder ───────────────────────────────────────────────────────

type RawData = {
  prix?: number | null
  surface?: number | null
  typeBien?: 'APPARTEMENT' | 'MAISON' | 'STUDIO' | null
  nbPieces?: number | null
  ville?: string | null
  codePostal?: string | null
  adresse?: string | null
  dpe?: string | null
  charges?: number | null
  anneeConstruction?: number | null
  snapshotTitre?: string | null
  snapshotDescription?: string | null
  snapshotPhotos?: string[]
}

function buildResult(
  raw: RawData,
  source: ScrapingSource,
  method: string
): ScrapingResult & { method: string } {
  const data = Object.fromEntries(
    Object.entries(raw).filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0))
  ) as ScrapingResult['data']

  const hasMinimum = !!(data.prix && data.surface)
  const hasPartial = !!(data.prix || data.surface || data.ville)

  return { success: hasMinimum, partial: !hasMinimum && hasPartial, source, data, method }
}
