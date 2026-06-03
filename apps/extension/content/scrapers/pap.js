function extractPAP() {
  try {
    const jsonLd = document.querySelector('script[type="application/ld+json"]')
    if (jsonLd) {
      const data = JSON.parse(jsonLd.textContent)
      const offer = data?.offers || data

      return {
        source: 'pap',
        urlSource: window.location.href,
        prix: offer?.price ? parseInt(offer.price) : null,
        snapshotTitre: data?.name || document.title,
        snapshotDescription: (data?.description || '').slice(0, 2000),
        snapshotPhotos: data?.image ? [data.image].flat().slice(0, 5) : [],
        typeBien: data?.name?.toLowerCase().includes('maison') ? 'MAISON' : 'APPARTEMENT',
      }
    }

    const prixEl = document.querySelector('[class*="price"], [class*="prix"], h2')
    const prixRaw = prixEl?.textContent?.replace(/[^0-9]/g, '')

    return {
      source: 'pap',
      urlSource: window.location.href,
      prix: prixRaw ? parseInt(prixRaw) : null,
      snapshotTitre: document.title,
      typeBien: 'APPARTEMENT',
    }
  } catch (e) {
    console.error('[ImmoTest] Erreur extraction PAP:', e)
    return null
  }
}
