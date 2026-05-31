import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib'
import { createClient } from '@supabase/supabase-js'
import type { Bien } from '@prisma/client'
import type { AnalyseResult } from '@immosafe/shared-types'

// ─── Layout constants ────────────────────────────────────────────────────────

const PAGE_WIDTH = 595
const PAGE_HEIGHT = 842
const MARGIN = 48
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

// ─── Color palette ───────────────────────────────────────────────────────────

const COLORS = {
  indigo:  [79, 70, 229],
  green:   [34, 197, 94],
  orange:  [249, 115, 22],
  red:     [239, 68, 68],
  gray900: [17, 24, 39],
  gray600: [75, 85, 99],
  gray400: [156, 163, 175],
  gray200: [229, 231, 235],
  gray50:  [249, 250, 251],
  white:   [255, 255, 255],
} as const

type Color = (typeof COLORS)[keyof typeof COLORS]

function c(color: Color) {
  return rgb(color[0] / 255, color[1] / 255, color[2] / 255)
}

// ─── Text sanitizer ───────────────────────────────────────────────────────────
// Helvetica (StandardFonts) only supports Latin-1 — strip all non-ASCII

function s(text: string): string {
  if (!text) return ''
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics (é→e, à→a…)
    .replace(/’/g, "'")         // right single quote
    .replace(/[‘“”]/g, '"')
    .replace(/[–—]/g, '-') // en/em dash
    .replace(/·/g, '-')         // middle dot
    .replace(/²/g, '2')         // superscript 2
    .replace(/€/g, 'EUR')       // €
    .replace(/[^\x00-\x7F]/g, '?')  // any remaining non-ASCII
}

// ─── Number formatters ───────────────────────────────────────────────────────

function fmtPrix(p: number): string {
  return Math.round(p)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' EUR'
}

function fmtPrixM2(p: number): string {
  return Math.round(p)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' EUR/m2'
}

function fmtDate(): string {
  const d = new Date()
  return [
    d.getDate().toString().padStart(2, '0'),
    (d.getMonth() + 1).toString().padStart(2, '0'),
    d.getFullYear(),
  ].join('/')
}

// ─── Drawing helpers ─────────────────────────────────────────────────────────

function drawRect(
  page: PDFPage,
  x: number, y: number, w: number, h: number,
  color: Color, opacity = 1
) {
  page.drawRectangle({ x, y, width: w, height: h, color: c(color), opacity })
}

function drawDivider(page: PDFPage, y: number) {
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.5,
    color: c(COLORS.gray200),
  })
}

function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  font: PDFFont,
  color: Color = COLORS.gray900,
  lineHeight = 1.5
): number {
  const words = s(text).split(' ')
  let line = ''
  let currentY = y

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word
    const width = font.widthOfTextAtSize(testLine, fontSize)
    if (width > maxWidth && line) {
      page.drawText(line, { x, y: currentY, size: fontSize, font, color: c(color) })
      line = word
      currentY -= fontSize * lineHeight
    } else {
      line = testLine
    }
  }
  if (line) {
    page.drawText(line, { x, y: currentY, size: fontSize, font, color: c(color) })
    currentY -= fontSize * lineHeight
  }
  return currentY
}

function scoreColor(score: number): Color {
  if (score >= 70) return COLORS.green
  if (score >= 40) return COLORS.orange
  return COLORS.red
}

function scoreLabel(score: number): string {
  if (score >= 70) return 'Bon plan'
  if (score >= 40) return 'Correct'
  return 'A eviter'
}

function vigilanceColor(niveau: string): Color {
  if (niveau === 'CRITIQUE') return COLORS.red
  if (niveau === 'ATTENTION') return COLORS.orange
  return COLORS.indigo
}

// ─── Main PDF generation ─────────────────────────────────────────────────────

export async function generateRapportPDF(
  bien: Bien,
  analyse: AnalyseResult
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()

  const fontBold    = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica)
  const fontItalic  = await doc.embedFont(StandardFonts.HelveticaOblique)

  const dateStr = fmtDate()
  const titreBien = s(
    bien.titre ||
    `${bien.typeBien === 'APPARTEMENT' ? 'Appartement' :
       bien.typeBien === 'MAISON' ? 'Maison' : 'Studio'} · ${bien.ville}`
  )

  // ─── PAGE 1 ──────────────────────────────────────────────────────────────

  const page1 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = PAGE_HEIGHT

  // Header indigo
  drawRect(page1, 0, y - 80, PAGE_WIDTH, 80, COLORS.indigo)
  page1.drawText('ImmoSafe', {
    x: MARGIN, y: y - 48, size: 24, font: fontBold, color: c(COLORS.white),
  })
  page1.drawText("Rapport d'analyse immobiliere", {
    x: MARGIN, y: y - 66, size: 10, font: fontRegular, color: c(COLORS.indigo),
    opacity: 0.7,
  })
  const dw = fontRegular.widthOfTextAtSize(dateStr, 9)
  page1.drawText(dateStr, {
    x: PAGE_WIDTH - MARGIN - dw, y: y - 55, size: 9, font: fontRegular, color: c(COLORS.white),
    opacity: 0.7,
  })
  y -= 100

  // Section 1 — Identite du bien
  page1.drawText(titreBien, {
    x: MARGIN, y, size: 16, font: fontBold, color: c(COLORS.gray900),
  })
  y -= 20

  if (bien.adresse) {
    page1.drawText(s(`${bien.adresse}${bien.codePostal ? ' - ' + bien.codePostal : ''}`), {
      x: MARGIN, y, size: 10, font: fontRegular, color: c(COLORS.gray600),
    })
    y -= 16
  }

  y -= 6
  const metrics: { label: string; value: string }[] = [
    { label: 'Prix', value: fmtPrix(bien.prix) },
    { label: 'Surface', value: `${bien.surface} m2` },
    { label: 'Prix/m2', value: fmtPrixM2(bien.prix / bien.surface) },
    ...(bien.dpe ? [{ label: 'DPE', value: `Classe ${bien.dpe}` }] : [
      ...(bien.nbPieces ? [{ label: 'Pieces', value: `${bien.nbPieces} pieces` }] : []),
    ]),
  ].slice(0, 4)

  const mw = CONTENT_WIDTH / metrics.length
  metrics.forEach((m, i) => {
    const mx = MARGIN + i * mw
    drawRect(page1, mx + 2, y - 36, mw - 6, 42, COLORS.gray50)
    page1.drawText(m.value, {
      x: mx + 8, y: y - 12, size: 11, font: fontBold, color: c(COLORS.gray900),
    })
    page1.drawText(m.label, {
      x: mx + 8, y: y - 26, size: 8, font: fontRegular, color: c(COLORS.gray600),
    })
  })
  y -= 54

  drawDivider(page1, y)
  y -= 20

  // Section 2 — Score ImmoSafe
  page1.drawText('Score ImmoSafe', {
    x: MARGIN, y, size: 13, font: fontBold, color: c(COLORS.gray900),
  })
  y -= 18

  const sc = scoreColor(analyse.scoreImmoSafe)
  drawRect(page1, MARGIN, y - 52, 72, 58, sc, 0.12)
  page1.drawText(String(analyse.scoreImmoSafe), {
    x: MARGIN + 6, y: y - 22, size: 34, font: fontBold, color: c(sc),
  })
  page1.drawText('/100', {
    x: MARGIN + 8, y: y - 38, size: 10, font: fontRegular, color: c(COLORS.gray600),
  })
  page1.drawText(scoreLabel(analyse.scoreImmoSafe), {
    x: MARGIN + 6, y: y - 50, size: 9, font: fontBold, color: c(sc),
  })

  // Score bar
  const barX = MARGIN + 82
  const barW = CONTENT_WIDTH - 90
  drawRect(page1, barX, y - 14, barW, 10, COLORS.gray200)
  drawRect(page1, barX, y - 14, Math.round(barW * analyse.scoreImmoSafe / 100), 10, sc)

  const afterSynth = drawWrappedText(
    page1, analyse.syntheseTexte,
    barX, y - 30, barW, 9, fontItalic, COLORS.gray600
  )
  y = Math.min(y - 62, afterSynth - 8)

  drawDivider(page1, y)
  y -= 20

  // Section 3 — Analyse du prix
  page1.drawText('Analyse du prix', {
    x: MARGIN, y, size: 13, font: fontBold, color: c(COLORS.gray900),
  })
  y -= 18

  const ecartColor = analyse.prixAnalyse.ecartPourcentage > 10 ? COLORS.red :
                     analyse.prixAnalyse.ecartPourcentage > 0  ? COLORS.orange : COLORS.green
  const ecartSign  = analyse.prixAnalyse.ecartPourcentage > 0 ? '+' : ''

  page1.drawText(`Ce bien : ${fmtPrixM2(analyse.prixAnalyse.prixM2Bien)}`, {
    x: MARGIN, y, size: 11, font: fontBold, color: c(COLORS.gray900),
  })
  page1.drawText(`Marche : ${fmtPrixM2(analyse.prixAnalyse.prixM2Marche)}`, {
    x: MARGIN + 180, y, size: 11, font: fontRegular, color: c(COLORS.gray600),
  })
  page1.drawText(`${ecartSign}${analyse.prixAnalyse.ecartPourcentage.toFixed(1)}%`, {
    x: MARGIN + 360, y, size: 11, font: fontBold, color: c(ecartColor),
  })
  y -= 16

  y = drawWrappedText(
    page1, analyse.prixAnalyse.phraseVerdict,
    MARGIN, y, CONTENT_WIDTH, 10, fontItalic, COLORS.gray600
  )
  y -= 12

  // Section 4 — DPE (optionnelle)
  if (analyse.dpeAnalyse) {
    drawDivider(page1, y)
    y -= 20

    page1.drawText('Diagnostic de performance energetique (DPE)', {
      x: MARGIN, y, size: 13, font: fontBold, color: c(COLORS.gray900),
    })
    y -= 18

    page1.drawText(`Classe ${analyse.dpeAnalyse.classe}`, {
      x: MARGIN, y, size: 14, font: fontBold, color: c(COLORS.orange),
    })
    page1.drawText(
      `Surcout estime : +${analyse.dpeAnalyse.surcoutMensuelEstime} EUR/mois`,
      { x: MARGIN + 90, y, size: 10, font: fontRegular, color: c(COLORS.gray600) }
    )
    y -= 16

    y = drawWrappedText(
      page1, analyse.dpeAnalyse.phraseImpact,
      MARGIN, y, CONTENT_WIDTH, 10, fontRegular, COLORS.gray600
    )

    if (analyse.dpeAnalyse.interdictionLocation2028) {
      y -= 6
      drawRect(page1, MARGIN, y - 18, CONTENT_WIDTH, 22, COLORS.red, 0.08)
      page1.drawText(
        'ATTENTION : Ce bien sera interdit a la location a partir de 2028 sans renovation.',
        { x: MARGIN + 6, y: y - 12, size: 9, font: fontBold, color: c(COLORS.red) }
      )
      y -= 28
    }
  }

  // ─── PAGE 2 ──────────────────────────────────────────────────────────────

  const page2 = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y2 = PAGE_HEIGHT

  // Header reduit
  drawRect(page2, 0, y2 - 40, PAGE_WIDTH, 40, COLORS.indigo)
  page2.drawText("ImmoSafe - Rapport d'analyse (suite)", {
    x: MARGIN, y: y2 - 26, size: 10, font: fontBold, color: c(COLORS.white),
  })
  const tw = fontRegular.widthOfTextAtSize(titreBien, 8)
  page2.drawText(titreBien, {
    x: PAGE_WIDTH - MARGIN - tw, y: y2 - 26, size: 8,
    font: fontRegular, color: c(COLORS.white), opacity: 0.7,
  })
  y2 -= 60

  // Section 5 — Negociation
  page2.drawText('Strategie de negociation', {
    x: MARGIN, y: y2, size: 13, font: fontBold, color: c(COLORS.gray900),
  })
  y2 -= 18

  drawRect(page2, MARGIN, y2 - 52, CONTENT_WIDTH, 58, COLORS.indigo, 0.07)
  page2.drawText(s(analyse.negociation.phraseActionnable), {
    x: MARGIN + 10, y: y2 - 14, size: 11, font: fontBold, color: c(COLORS.indigo),
  })
  const economie = bien.prix - analyse.negociation.prixCibleMin
  page2.drawText(`Economie potentielle : jusqu'a ${fmtPrix(economie)}`, {
    x: MARGIN + 10, y: y2 - 30, size: 9, font: fontRegular, color: c(COLORS.gray600),
  })
  page2.drawText(`Marge estimee : ${analyse.negociation.margeEstimee}%  |  Fourchette : ${fmtPrix(analyse.negociation.prixCibleMin)} - ${fmtPrix(analyse.negociation.prixCibleMax)}`, {
    x: MARGIN + 10, y: y2 - 44, size: 9, font: fontRegular, color: c(COLORS.gray600),
  })
  y2 -= 64

  page2.drawText('Arguments a utiliser :', {
    x: MARGIN, y: y2, size: 10, font: fontBold, color: c(COLORS.gray900),
  })
  y2 -= 14

  for (const arg of analyse.negociation.argumentsNegociation) {
    page2.drawText('-', {
      x: MARGIN, y: y2, size: 10, font: fontBold, color: c(COLORS.indigo),
    })
    y2 = drawWrappedText(
      page2, arg, MARGIN + 12, y2, CONTENT_WIDTH - 14, 10, fontRegular
    )
    y2 -= 4
  }

  drawDivider(page2, y2 - 8)
  y2 -= 28

  // Section 6 — Points de vigilance
  page2.drawText('Points de vigilance', {
    x: MARGIN, y: y2, size: 13, font: fontBold, color: c(COLORS.gray900),
  })
  y2 -= 18

  const sortedVigilance = [...analyse.pointsVigilance].sort((a, b) => {
    const o: Record<string, number> = { CRITIQUE: 0, ATTENTION: 1, INFO: 2 }
    return (o[a.niveau] ?? 2) - (o[b.niveau] ?? 2)
  })

  for (const point of sortedVigilance) {
    if (y2 < 120) break // guard against overflow into footer
    const vc = vigilanceColor(point.niveau)
    const vlabel = point.niveau === 'CRITIQUE' ? 'CRITIQUE' :
                   point.niveau === 'ATTENTION' ? 'ATTENTION' : 'INFO'

    drawRect(page2, MARGIN, y2 - 30, 3, 36, vc)
    drawRect(page2, MARGIN + 3, y2 - 30, CONTENT_WIDTH - 3, 36, vc, 0.05)

    page2.drawText(vlabel, {
      x: MARGIN + 10, y: y2 - 8, size: 8, font: fontBold, color: c(vc),
    })
    page2.drawText(s(point.titre), {
      x: MARGIN + 10, y: y2 - 18, size: 10, font: fontBold, color: c(COLORS.gray900),
    })
    y2 -= 36

    y2 = drawWrappedText(
      page2, point.explication,
      MARGIN + 10, y2, CONTENT_WIDTH - 10, 9, fontRegular, COLORS.gray600
    )
    y2 -= 10
  }

  drawDivider(page2, y2 - 4)
  y2 -= 20

  // Section 7 — Questions vendeur
  page2.drawText('Questions a poser au vendeur', {
    x: MARGIN, y: y2, size: 13, font: fontBold, color: c(COLORS.gray900),
  })
  y2 -= 18

  analyse.questionsVendeur.forEach((q, i) => {
    if (y2 < 100) return // guard
    page2.drawText(`${i + 1}.`, {
      x: MARGIN, y: y2, size: 10, font: fontBold, color: c(COLORS.indigo),
    })
    y2 = drawWrappedText(
      page2, q.question, MARGIN + 18, y2, CONTENT_WIDTH - 18, 10, fontBold
    )
    y2 = drawWrappedText(
      page2, q.pourquoi, MARGIN + 18, y2, CONTENT_WIDTH - 18, 9, fontItalic, COLORS.gray600
    )
    y2 -= 8
  })

  // ─── Footer (both pages) ─────────────────────────────────────────────────

  for (const page of [page1, page2]) {
    drawRect(page, 0, 0, PAGE_WIDTH, 38, COLORS.gray50)
    page.drawLine({
      start: { x: 0, y: 38 },
      end: { x: PAGE_WIDTH, y: 38 },
      thickness: 0.5,
      color: c(COLORS.gray200),
    })
    page.drawText(
      'Ce rapport est fourni a titre indicatif par ImmoSafe, base sur les donnees DVF officielles. ' +
      'Il ne constitue pas un conseil professionnel en immobilier.',
      { x: MARGIN, y: 22, size: 7, font: fontRegular, color: c(COLORS.gray600) }
    )
    page.drawText(
      `Genere le ${dateStr} - immosafe.fr`,
      { x: MARGIN, y: 10, size: 7, font: fontRegular, color: c(COLORS.gray600) }
    )
  }

  // ─── PDF metadata ────────────────────────────────────────────────────────

  doc.setTitle(`Rapport ImmoSafe - ${titreBien}`)
  doc.setAuthor('ImmoSafe')
  doc.setCreator('ImmoSafe - immosafe.fr')
  doc.setCreationDate(new Date())

  return doc.save()
}

// ─── Supabase Storage upload ─────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required for PDF upload')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function uploadRapportToStorage(
  pdfBytes: Uint8Array,
  bienId: string,
  userId: string
): Promise<string> {
  const supabase = getSupabase()
  const fileName = `${userId}/${bienId}_${Date.now()}.pdf`

  const { error } = await supabase.storage.from('rapports').upload(fileName, pdfBytes, {
    contentType: 'application/pdf',
    upsert: true,
  })
  if (error) throw new Error(`Upload PDF echoue: ${error.message}`)

  const { data, error: signError } = await supabase.storage
    .from('rapports')
    .createSignedUrl(fileName, 24 * 60 * 60)
  if (signError || !data) throw new Error('URL signee impossible')

  return data.signedUrl
}
