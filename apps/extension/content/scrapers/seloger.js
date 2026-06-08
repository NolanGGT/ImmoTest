function extractSeLoger() {
  try {
    const ogTitle = document.querySelector('meta[property="og:title"]')?.content || ''
    const ogDescription = document.querySelector('meta[property="og:description"]')?.content || ''
    const ogImage = document.querySelector('meta[property="og:image"]')?.content

    if (!ogTitle) return null

    // Parse SeLoger og:title format:
    // "Maison à vendre T5/F5 108 m² 120000 € Montcy-Theux Nord Charleville-Mézières (08000)"

    const prixMatch = ogTitle.match(/(\d[\d\s]*)\s*€/)
    const prix = prixMatch ? parseInt(prixMatch[1].replace(/\s/g, '')) : null

    const surfaceMatch = ogTitle.match(/(\d+)\s*m²/)
    const surface = surfaceMatch ? parseInt(surfaceMatch[1]) : null

    const typeBien = ogTitle.toLowerCase().includes('maison') ? 'MAISON' : 'APPARTEMENT'

    const villeMatch = ogTitle.match(/([A-ZÀ-Ÿa-zà-ÿ\s\-]+)\s*\((\d{5})\)/)
    const ville = villeMatch ? villeMatch[1].trim() : null
    const codePostal = villeMatch ? villeMatch[2] : null

    const piecesMatch = ogTitle.match(/[TF](\d+)/)
    const nbPieces = piecesMatch ? parseInt(piecesMatch[1]) : null

    return {
      source: 'seloger',
      urlSource: window.location.href,
      prix,
      surface,
      nbPieces,
      ville,
      codePostal,
      typeBien,
      snapshotTitre: ogTitle,
      snapshotDescription: ogDescription.slice(0, 2000),
      snapshotPhotos: ogImage ? [ogImage] : [],
    }
  } catch (e) {
    console.error('[ImmoTest] SeLoger:', e)

    // Fallback meta OG
    const ogTitle = document.querySelector('meta[property="og:title"]')?.content
    const ogDesc = document.querySelector('meta[property="og:description"]')?.content

    const prixMatch = (ogTitle + ' ' + ogDesc)?.match(/(\d[\d\s]+)\s*€/)
    const prix = prixMatch ? parseInt(prixMatch[1].replace(/\s/g, '')) : null

    if (ogTitle || prix) {
      return {
        snapshotTitre: ogTitle,
        snapshotDescription: ogDesc,
        prix,
        urlSource: window.location.href
      }
    }

    return null
  }
}
