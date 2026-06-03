function extractSeLoger() {
  try {
    // Method 1: __NEXT_DATA__ — recursive search for listing object
    const nextData = document.getElementById('__NEXT_DATA__')
    if (nextData) {
      const json = JSON.parse(nextData.textContent)

      const findListing = (obj, depth = 0) => {
        if (depth > 6 || !obj || typeof obj !== 'object') return null
        if (obj.price && obj.surface) return obj
        if (obj.listingDetail) return obj.listingDetail
        if (obj.classified) return obj.classified
        for (const key of Object.keys(obj)) {
          const result = findListing(obj[key], depth + 1)
          if (result) return result
        }
        return null
      }

      const listing = findListing(json?.props?.pageProps)
      if (listing?.price) {
        return {
          source: 'seloger',
          urlSource: window.location.href,
          prix: parseInt(listing.price),
          surface: listing.surface ? parseInt(listing.surface) : null,
          nbPieces: listing.roomsQuantity || listing.rooms || null,
          ville: listing.city || listing.zipCode?.city || null,
          codePostal: listing.postalCode || null,
          typeBien: listing.estateType?.toLowerCase().includes('maison') ? 'MAISON' : 'APPARTEMENT',
          dpe: listing.energyClassification || null,
          snapshotTitre: listing.title || document.title,
          snapshotDescription: (listing.description || '').slice(0, 2000),
          snapshotPhotos: (listing.photos || []).slice(0, 5)
            .map(p => p.url || p.fullUrl || p)
            .filter(s => typeof s === 'string' && s.startsWith('http')),
        }
      }
    }

    // Method 2: Open Graph meta tags
    const ogPrice = document.querySelector('meta[property="product:price:amount"]')?.content
    const ogTitle = document.querySelector('meta[property="og:title"]')?.content
    const ogImage = document.querySelector('meta[property="og:image"]')?.content
    const ogDesc = document.querySelector('meta[property="og:description"]')?.content

    // Method 3: DOM fallback
    const prixEl = document.querySelector('[data-testid="price"], [class*="Price"], h2[class*="price"]')
    const prixText = prixEl?.textContent?.replace(/[^0-9]/g, '')

    const surfaceEl = document.querySelector('[data-testid="surface"], [class*="surface"]')
    const surfaceText = surfaceEl?.textContent?.replace(/[^0-9]/g, '')

    if (ogPrice || prixText) {
      return {
        source: 'seloger',
        urlSource: window.location.href,
        prix: ogPrice ? parseInt(ogPrice) : (prixText ? parseInt(prixText) : null),
        surface: surfaceText ? parseInt(surfaceText) : null,
        typeBien: (ogTitle || document.title)?.toLowerCase().includes('maison') ? 'MAISON' : 'APPARTEMENT',
        snapshotTitre: ogTitle || document.title,
        snapshotDescription: (ogDesc || '').slice(0, 2000),
        snapshotPhotos: ogImage ? [ogImage] : [],
      }
    }

    return null
  } catch (e) {
    console.error('[ImmoTest] SeLoger:', e)
    return null
  }
}
