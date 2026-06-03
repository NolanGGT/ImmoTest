function extractLeBonCoin() {
  try {
    const nextData = document.getElementById('__NEXT_DATA__')
    if (!nextData) return null

    const json = JSON.parse(nextData.textContent)
    const props = json?.props?.pageProps
    const ad = props?.ad || props?.adView || props?.listing?.ad

    if (!ad) return null

    const prix = ad.price?.[0] || ad.price || null

    const surface = ad.attributes?.find(a =>
      a.key === 'square' || a.key === 'rooms_surface_area'
    )?.value_label?.replace(/[^0-9]/g, '') || null

    const pieces = ad.attributes?.find(a =>
      a.key === 'rooms' || a.key === 'rooms_count'
    )?.value_label?.replace(/[^0-9]/g, '') || null

    const ville = ad.location?.city || ad.location?.name || null
    const codePostal = ad.location?.zipcode || ad.location?.zip_code || null
    const adresse = ad.location?.address || null

    const categorie = ad.category?.name || ''
    let typeBien = 'APPARTEMENT'
    if (
      categorie.toLowerCase().includes('maison') ||
      categorie.toLowerCase().includes('villa') ||
      ad.attributes?.find(a =>
        a.key === 'real_estate_type' &&
        a.value_label?.toLowerCase().includes('maison')
      )
    ) {
      typeBien = 'MAISON'
    }

    const titre = ad.subject || ad.title || null
    const description = (ad.body || '').slice(0, 2000)
    const photos = (ad.images?.urls_large || ad.images?.urls || [])
      .slice(0, 5)
      .filter(url => url?.startsWith('http'))

    const dpe = ad.attributes?.find(a =>
      a.key === 'energy_rate'
    )?.value_label?.toUpperCase() || null

    const chargesRaw = ad.attributes?.find(a =>
      a.key === 'charges_included' || a.key === 'monthly_charges'
    )?.value_label?.replace(/[^0-9]/g, '') || null

    return {
      source: 'leboncoin',
      urlSource: window.location.href,
      prix: prix ? parseInt(prix) : null,
      surface: surface ? parseInt(surface) : null,
      nbPieces: pieces ? parseInt(pieces) : null,
      ville,
      codePostal,
      adresse,
      typeBien,
      dpe,
      charges: chargesRaw ? parseInt(chargesRaw) : null,
      snapshotTitre: titre,
      snapshotDescription: description,
      snapshotPhotos: photos,
    }
  } catch (e) {
    console.error('[ImmoTest] Erreur extraction LeBonCoin:', e)
    return null
  }
}
