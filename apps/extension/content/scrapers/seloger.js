function extractSeLoger() {
  try {
    const nextData = document.getElementById('__NEXT_DATA__')
    let listing = null

    if (nextData) {
      const json = JSON.parse(nextData.textContent)
      listing =
        json?.props?.pageProps?.listing ||
        json?.props?.pageProps?.classified ||
        json?.props?.pageProps?.ad
    }

    if (!listing) {
      const price = document.querySelector('meta[property="product:price:amount"]')
        ?.getAttribute('content')
      const title = document.querySelector('meta[property="og:title"]')
        ?.getAttribute('content')
      const description = document.querySelector('meta[property="og:description"]')
        ?.getAttribute('content')
      const image = document.querySelector('meta[property="og:image"]')
        ?.getAttribute('content')

      if (price) {
        return {
          source: 'seloger',
          urlSource: window.location.href,
          prix: parseInt(price),
          snapshotTitre: title,
          snapshotDescription: description,
          snapshotPhotos: image ? [image] : [],
          typeBien: title?.toLowerCase().includes('maison') ? 'MAISON' : 'APPARTEMENT',
        }
      }
      return null
    }

    const prix = listing.price || listing.pricing?.price || null
    const surface = listing.livingArea || listing.surface || null
    const pieces = listing.roomsQuantity || listing.rooms || null
    const ville = listing.city || listing.location?.city || null
    const codePostal = listing.postalCode || listing.location?.postalCode || null

    return {
      source: 'seloger',
      urlSource: window.location.href,
      prix: prix ? parseInt(prix) : null,
      surface: surface ? parseInt(surface) : null,
      nbPieces: pieces ? parseInt(pieces) : null,
      ville,
      codePostal,
      typeBien: listing.estateType?.includes('Maison') ? 'MAISON' : 'APPARTEMENT',
      dpe: listing.energyClassification || null,
      snapshotTitre: listing.title || null,
      snapshotDescription: (listing.description || '').slice(0, 2000),
      snapshotPhotos: (listing.photos || []).slice(0, 5).map(p => p.url || p).filter(Boolean),
    }
  } catch (e) {
    console.error('[ImmoTest] Erreur extraction SeLoger:', e)
    return null
  }
}
