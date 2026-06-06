function extractLogicImmo() {
  try {
    // 1. __NEXT_DATA__
    const nextDataEl = document.getElementById('__NEXT_DATA__')
    if (nextDataEl) {
      const json = JSON.parse(nextDataEl.textContent)
      const props = json?.props?.pageProps
      const l = props?.listing || props?.adDetail || props?.classified || props?.annonce
      if (l) {
        const prix = l.price || l.salePrice || l.prix
        const surface = l.area || l.surface || l.surfaceArea
        if (prix || surface) {
          return {
            source: 'logic-immo',
            urlSource: window.location.href,
            prix: prix ? parseInt(prix) : null,
            surface: surface ? parseInt(surface) : null,
            nbPieces: l.rooms || l.nbRooms ? parseInt(l.rooms ?? l.nbRooms) : null,
            ville: l.city || l.cityName || l.location?.city || null,
            codePostal: l.postalCode || l.zipCode || l.location?.postalCode || null,
            typeBien: /maison|villa|pavillon/i.test(l.propertyType || l.type || '') ? 'MAISON' : 'APPARTEMENT',
            snapshotTitre: l.title || l.name || document.title,
            snapshotPhotos: (l.photos || l.images || []).slice(0, 5)
              .map(p => p?.url || p?.src || (typeof p === 'string' ? p : null))
              .filter(u => u?.startsWith('http')),
          }
        }
      }
    }

    // 2. JSON-LD
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const items = [].concat(JSON.parse(script.textContent))
        for (const item of items) {
          const prix = item?.offers?.price || item?.price
          if (!prix) continue
          return {
            source: 'logic-immo',
            urlSource: window.location.href,
            prix: parseInt(prix),
            surface: item?.floorSize?.value ? parseInt(item.floorSize.value) : null,
            nbPieces: item?.numberOfRooms ? parseInt(item.numberOfRooms) : null,
            ville: item?.address?.addressLocality || null,
            codePostal: item?.address?.postalCode || null,
            typeBien: /house|maison/i.test(item?.['@type'] || '') ? 'MAISON' : 'APPARTEMENT',
            snapshotTitre: item?.name || document.title,
            snapshotPhotos: item?.image ? [].concat(item.image).slice(0, 5) : [],
          }
        }
      } catch {}
    }

    // 3. Meta OG + DOM
    const ogTitle = document.querySelector('meta[property="og:title"]')?.content || document.title
    const ogImage = document.querySelector('meta[property="og:image"]')?.content
    const pm = ogTitle.match(/(\d[\d\s]*)\s*€/)
    const sm = ogTitle.match(/(\d+)\s*m²/)
    const pcm = ogTitle.match(/(\d+)\s*p[iè]/i)
    const vm = ogTitle.match(/([A-ZÀ-Ÿa-zà-ÿ\s\-]+)\s*\((\d{5})\)/)
    const cpm = (ogTitle + ' ' + window.location.href).match(/\b(\d{5})\b/)

    return {
      source: 'logic-immo',
      urlSource: window.location.href,
      prix: pm ? parseInt(pm[1].replace(/\s/g, '')) : null,
      surface: sm ? parseInt(sm[1]) : null,
      nbPieces: pcm ? parseInt(pcm[1]) : null,
      ville: vm?.[1]?.trim() || null,
      codePostal: vm?.[2] || cpm?.[1] || null,
      typeBien: /maison|villa|pavillon/i.test(ogTitle) ? 'MAISON' : 'APPARTEMENT',
      snapshotTitre: ogTitle,
      snapshotPhotos: ogImage ? [ogImage] : [],
    }
  } catch (e) {
    console.error('[ImmoTest] Logic-Immo:', e)
    return null
  }
}
