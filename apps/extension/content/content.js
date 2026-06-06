// Scrapers loaded before this file (see manifest.json content_scripts order)

const LISTING_URL_PATTERNS = {
  leboncoin: /\/ad\//,
  logicimmo: /\/detail-vente/,
  bienici: /\/annonce\//,
  meilleursagents: /\/annonces\//,
  orpi: /\/annonce\//,
  century21: /\/annonces\//,
  stephaneplaza: /\/annonce\//,
  laforet: /\/annonces\//,
  era: /\/annonces\//,
  guyhoquet: /\/biens\//,
  iadfrance: /\/annonces\//,
  hosman: /\/vente\//,
  proprioo: /\/annonces\//,
  liberkeys: /\/annonces\//,
  imop: /\/annonces\//,
}

function detectSite() {
  const h = window.location.hostname
  if (h.includes('leboncoin')) return 'leboncoin'
  if (h.includes('seloger')) return 'seloger'
  if (h.includes('pap.fr')) return 'pap'
  if (h.includes('logic-immo')) return 'logicimmo'
  if (h.includes('bienici')) return 'bienici'
  if (h.includes('meilleursagents')) return 'meilleursagents'
  if (h.includes('orpi')) return 'orpi'
  if (h.includes('century21')) return 'century21'
  if (h.includes('stephaneplaza')) return 'stephaneplaza'
  if (h.includes('laforet')) return 'laforet'
  if (h.includes('era.fr')) return 'era'
  if (h.includes('guy-hoquet')) return 'guyhoquet'
  if (h.includes('iadfrance')) return 'iadfrance'
  if (h.includes('hosman')) return 'hosman'
  if (h.includes('proprioo')) return 'proprioo'
  if (h.includes('liberkeys')) return 'liberkeys'
  if (h.includes('imop.fr')) return 'imop'
  return 'generic'
}

function extractData() {
  const site = detectSite()
  switch (site) {
    case 'leboncoin': return extractLeBonCoin()
    case 'seloger': return extractSeLoger()
    case 'pap': return extractPAP()
    case 'logicimmo': return extractLogicImmo()
    case 'bienici': return extractBienici()
    case 'meilleursagents': return extractMeilleursAgents()
    case 'orpi': return extractOrpi()
    case 'century21': return extractCentury21()
    case 'stephaneplaza': return extractStephanePlaza()
    case 'laforet': return extractLaforet()
    case 'era': return extractEra()
    case 'guyhoquet': return extractGuyHoquet()
    case 'iadfrance': return extractIadFrance()
    case 'hosman': return extractHosman()
    case 'proprioo': return extractProrioo()
    case 'liberkeys': return extractLiberkeys()
    case 'imop': return extractImop()
    default: return extractGeneric()
  }
}

function injectFloatingButton(data) {
  if (document.getElementById('immotest-btn')) return

  const btn = document.createElement('div')
  btn.id = 'immotest-btn'
  btn.innerHTML = `
    <div id="immotest-btn-inner">
      <div id="immotest-btn-logo">IT</div>
      <div id="immotest-btn-text">
        <div id="immotest-btn-title">Analyser avec ImmoTest</div>
        ${data?.prix ? `<div id="immotest-btn-sub">${new Intl.NumberFormat('fr-FR').format(data.prix)} €${data?.surface ? ' · ' + data.surface + ' m²' : ''}</div>` : ''}
      </div>
      <div id="immotest-btn-arrow">→</div>
    </div>
  `

  btn.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 999999;
    cursor: pointer;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    filter: drop-shadow(0 4px 16px rgba(79,70,229,0.4));
  `

  btn.querySelector('#immotest-btn-inner').style.cssText = `
    display: flex;
    align-items: center;
    gap: 12px;
    background: #4f46e5;
    color: white;
    padding: 14px 20px;
    border-radius: 16px;
    border: 2px solid rgba(255,255,255,0.2);
  `

  btn.querySelector('#immotest-btn-logo').style.cssText = `
    width: 38px;
    height: 38px;
    background: rgba(255,255,255,0.2);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 15px;
    flex-shrink: 0;
  `

  btn.querySelector('#immotest-btn-text').style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 2px;
  `

  btn.querySelector('#immotest-btn-title').style.cssText = `
    font-weight: 700;
    font-size: 15px;
    white-space: nowrap;
  `

  const sub = btn.querySelector('#immotest-btn-sub')
  if (sub) sub.style.cssText = `font-size: 13px; opacity: 0.85;`

  btn.querySelector('#immotest-btn-arrow').style.cssText = `
    font-size: 18px;
    opacity: 0.8;
    flex-shrink: 0;
  `

  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'translateY(-2px) scale(1.02)'
  })
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'translateY(0) scale(1)'
  })

  btn.addEventListener('click', () => {
    const params = new URLSearchParams()
    if (data) {
      Object.entries(data).forEach(([key, val]) => {
        if (val !== null && val !== undefined) {
          params.set(key, Array.isArray(val) ? JSON.stringify(val) : String(val))
        }
      })
    }
    params.set('source', 'extension')
    params.set('urlSource', window.location.href)
    window.open(`https://immotest.fr/analyser?${params.toString()}`, '_blank')
  })

  document.body.appendChild(btn)

  // Spring bounce entrance
  btn.style.opacity = '0'
  btn.style.transform = 'translateY(100px) scale(0.5)'
  setTimeout(() => {
    btn.style.transition = 'opacity 0.5s ease, transform 0.6s cubic-bezier(0.34, 1.8, 0.64, 1)'
    btn.style.opacity = '1'
    btn.style.transform = 'translateY(0) scale(1)'

    setTimeout(() => {
      btn.style.transition = 'transform 0.3s cubic-bezier(0.34, 2.0, 0.64, 1)'
      btn.style.transform = 'translateY(-8px) scale(1.05)'
      setTimeout(() => {
        btn.style.transition = 'transform 0.25s cubic-bezier(0.34, 1.5, 0.64, 1)'
        btn.style.transform = 'translateY(0) scale(1)'
      }, 300)
    }, 600)
  }, 50)
}

function isListingPage(site) {
  const path = window.location.pathname
  if (site === 'seloger') return /\/annonces\/|\/detail\/|\d{5,}/.test(path)
  if (site === 'pap') return /\/vente\/|\/annonce\/|\/annonces\//.test(path)
  const pattern = LISTING_URL_PATTERNS[site]
  return pattern ? pattern.test(path) : true
}

function tryInject() {
  document.getElementById('immotest-btn')?.remove()

  const site = detectSite()

  // For generic (unknown sites), only show if immo listing is detected
  if (site === 'generic') {
    const data = extractGeneric()
    if (!data) return
    const hasSignals = (data.prix && data.surface) ||
      /appartement|maison|villa|studio|immobil/i.test(data.snapshotTitre || document.title)
    if (!hasSignals) return
    injectFloatingButton(data)
    return
  }

  if (!isListingPage(site)) return

  const data = extractData()
  console.log('[ImmoTest] annonce:', site, data)
  injectFloatingButton(data || { urlSource: window.location.href })
}

setTimeout(tryInject, 200)

// Message listener for popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractData') {
    const data = extractData()
    sendResponse({ data, site: detectSite() })
  }

  if (request.action === 'isOnListingPage') {
    const site = detectSite()
    if (site === 'generic') {
      const data = extractGeneric()
      const isListing = !!(data?.prix || data?.surface)
      sendResponse({ isListing, site })
    } else {
      sendResponse({ isListing: isListingPage(site), site })
    }
  }

  return true
})
