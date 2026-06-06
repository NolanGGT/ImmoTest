// Scrapers for neo-agencies: Hosman, Proprioo, Liberkeys, Imop

function _np_nd(siteName) {
  const el = document.getElementById('__NEXT_DATA__')
  if (!el) return null
  try {
    const json = JSON.parse(el.textContent)
    const props = json?.props?.pageProps
    const l = props?.listing || props?.property || props?.bien ||
              props?.annonce || props?.propertyDetail || props?.sale ||
              props?.data?.listing || props?.data?.property
    if (!l) return null
    const prix = l.price || l.prix || l.salePrice || l.sellingPrice
    const surface = l.area || l.surface || l.livingArea || l.surfaceArea
    if (!prix && !surface) return null
    return {
      source: siteName,
      urlSource: window.location.href,
      prix: prix ? parseInt(prix) : null,
      surface: surface ? parseInt(surface) : null,
      nbPieces: l.rooms || l.nbRooms ? parseInt(l.rooms ?? l.nbRooms) : null,
      ville: l.city || l.ville || l.address?.city || l.location?.city || null,
      codePostal: l.postalCode || l.zipCode || l.address?.postalCode || l.location?.postalCode || null,
      typeBien: /maison|villa|pavillon/i.test(l.propertyType || l.type || l.typeBien || '') ? 'MAISON' : 'APPARTEMENT',
      snapshotTitre: l.title || l.name || document.title,
      snapshotPhotos: (l.photos || l.images || []).slice(0, 5)
        .map(p => p?.url || p?.src || p?.href || (typeof p === 'string' ? p : null))
        .filter(u => u?.startsWith('http')),
    }
  } catch { return null }
}

function _np_jld(siteName) {
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const items = [].concat(JSON.parse(script.textContent))
      for (const item of items) {
        const prix = item?.offers?.price || item?.price
        if (!prix) continue
        return {
          source: siteName,
          urlSource: window.location.href,
          prix: parseInt(prix),
          surface: item?.floorSize?.value ? parseInt(item.floorSize.value) : null,
          nbPieces: item?.numberOfRooms ? parseInt(item.numberOfRooms) : null,
          ville: item?.address?.addressLocality || null,
          codePostal: item?.address?.postalCode || null,
          typeBien: /house|maison/i.test(item?.['@type'] || item?.propertyType || '') ? 'MAISON' : 'APPARTEMENT',
          snapshotTitre: item?.name || document.title,
          snapshotPhotos: item?.image ? [].concat(item.image).slice(0, 5) : [],
        }
      }
    } catch {}
  }
  return null
}

function _np_og(siteName) {
  const ogTitle = document.querySelector('meta[property="og:title"]')?.content || document.title
  const ogImage = document.querySelector('meta[property="og:image"]')?.content
  const pm = ogTitle.match(/(\d[\d\s]*)\s*€/)
  const sm = ogTitle.match(/(\d+)\s*m²/)
  const pcm = ogTitle.match(/(\d+)\s*p[iè]/i)
  const vm = ogTitle.match(/([A-ZÀ-Ÿa-zà-ÿ\s\-]+)\s*\((\d{5})\)/)
  const cpm = (ogTitle + ' ' + window.location.href).match(/\b(\d{5})\b/)
  return {
    source: siteName,
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
}

function _np_extract(name) {
  try {
    return _np_nd(name) || _np_jld(name) || _np_og(name)
  } catch (e) {
    console.error(`[ImmoTest] ${name}:`, e)
    return null
  }
}

function extractHosman() { return _np_extract('hosman') }
function extractProrioo() { return _np_extract('proprioo') }
function extractLiberkeys() { return _np_extract('liberkeys') }
function extractImop() { return _np_extract('imop') }
