function extractBienici() {
  try {
    // 1. __NEXT_DATA__
    const nextDataEl = document.getElementById('__NEXT_DATA__')
    if (nextDataEl) {
      const json = JSON.parse(nextDataEl.textContent)
      const props = json?.props?.pageProps
      const l = props?.ad || props?.listing || props?.announcement || props?.bien
      if (l) {
        const prix = l.price?.value || l.price || l.salePrice
        const surface = l.surface || l.area || l.surfaceArea
        if (prix || surface) {
          const addr = l.address || l.location || {}
          return {
            source: 'bienici',
            urlSource: window.location.href,
            prix: prix ? parseInt(prix) : null,
            surface: surface ? parseInt(surface) : null,
            nbPieces: l.roomsQuantity || l.rooms ? parseInt(l.roomsQuantity ?? l.rooms) : null,
            ville: addr.city || addr.locality || null,
            codePostal: addr.postalCode || addr.zipCode || null,
            typeBien: /maison|villa|pavillon/i.test(l.propertyType || l.realty_type || '') ? 'MAISON' : 'APPARTEMENT',
            snapshotTitre: l.title || document.title,
            snapshotPhotos: (l.photos || []).slice(0, 5)
              .map(p => p?.url || p?.href || (typeof p === 'string' ? p : null))
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
            source: 'bienici',
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

    // 3. Meta OG
    const ogTitle = document.querySelector('meta[property="og:title"]')?.content || document.title
    const ogImage = document.querySelector('meta[property="og:image"]')?.content
    const pm = ogTitle.match(/(\d[\d\s]*)\s*€/)
    const sm = ogTitle.match(/(\d+)\s*m²/)
    const pcm = ogTitle.match(/(\d+)\s*p[iè]/i)
    const vm = ogTitle.match(/([A-ZÀ-Ÿa-zà-ÿ\s\-]+)\s*\((\d{5})\)/)
    const cpm = (ogTitle + ' ' + window.location.href).match(/\b(\d{5})\b/)

    return {
      source: 'bienici',
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
    console.error('[ImmoTest] BienIci:', e)
    return null
  }
}
