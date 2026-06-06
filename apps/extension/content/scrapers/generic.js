function extractGeneric() {
  try {
    // 1. JSON-LD
    const jsonLd = document.querySelector('script[type="application/ld+json"]')
    if (jsonLd) {
      try {
        const data = JSON.parse(jsonLd.textContent)
        const items = Array.isArray(data) ? data : [data]
        for (const item of items) {
          const offer = item?.offers || item
          const prix = offer?.price || item?.price
          if (prix) {
            const surface = item?.floorSize?.value || item?.area
            const pieces = item?.numberOfRooms || item?.rooms
            const addr = item?.address || {}
            const typeName = (item?.['@type'] || item?.propertyType || '').toLowerCase()
            return {
              source: 'generic',
              urlSource: window.location.href,
              prix: parseInt(prix),
              surface: surface ? parseInt(surface) : null,
              nbPieces: pieces ? parseInt(pieces) : null,
              ville: addr.addressLocality || addr.city || null,
              codePostal: addr.postalCode || null,
              typeBien: /house|maison|villa/.test(typeName) ? 'MAISON' : 'APPARTEMENT',
              snapshotTitre: item?.name || document.title,
              snapshotPhotos: item?.image ? [].concat(item.image).slice(0, 5) : [],
            }
          }
        }
      } catch {}
    }

    // 2. Meta OG title parsing
    const ogTitle = document.querySelector('meta[property="og:title"]')?.content || ''
    const prix = ogTitle.match(/(\d[\d\s]*)\s*€/)?.[1]?.replace(/\s/g, '')
    const surface = ogTitle.match(/(\d+)\s*m²/)?.[1]
    const pieces = ogTitle.match(/(\d+)\s*p[iè]/i)?.[1]

    // 3. Détecter ville/CP depuis l'URL ou le titre
    const cpMatch = (ogTitle + window.location.href).match(/\b(\d{5})\b/)
    const villeMatch = ogTitle.match(/([A-ZÀ-Ÿa-zà-ÿ\s\-]+)\s*\((\d{5})\)/)

    // 4. Type de bien
    const isMaison = /maison|villa|pavillon/i.test(ogTitle)

    return {
      source: 'generic',
      urlSource: window.location.href,
      prix: prix ? parseInt(prix) : null,
      surface: surface ? parseInt(surface) : null,
      nbPieces: pieces ? parseInt(pieces) : null,
      ville: villeMatch?.[1]?.trim() || null,
      codePostal: villeMatch?.[2] || cpMatch?.[1] || null,
      typeBien: isMaison ? 'MAISON' : 'APPARTEMENT',
      snapshotTitre: ogTitle || document.title,
      snapshotPhotos: [document.querySelector('meta[property="og:image"]')?.content].filter(Boolean),
    }
  } catch (e) {
    console.error('[ImmoTest] Generic:', e)
    return null
  }
}
