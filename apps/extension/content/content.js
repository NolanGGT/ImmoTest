// Scrapers are loaded before this file via manifest.json content_scripts order:
// leboncoin.js → seloger.js → pap.js → content.js

function detectSite() {
  const hostname = window.location.hostname
  if (hostname.includes('leboncoin')) return 'leboncoin'
  if (hostname.includes('seloger')) return 'seloger'
  if (hostname.includes('pap.fr')) return 'pap'
  if (hostname.includes('logic-immo')) return 'logicimmo'
  if (hostname.includes('bienici')) return 'bienici'
  return null
}

function extractData() {
  const site = detectSite()
  if (!site) return null

  switch (site) {
    case 'leboncoin': return extractLeBonCoin()
    case 'seloger': return extractSeLoger()
    case 'pap': return extractPAP()
    default: return null
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
    gap: 10px;
    background: #4f46e5;
    color: white;
    padding: 12px 16px;
    border-radius: 14px;
    border: 2px solid rgba(255,255,255,0.2);
  `

  btn.querySelector('#immotest-btn-logo').style.cssText = `
    width: 32px;
    height: 32px;
    background: rgba(255,255,255,0.2);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 13px;
    flex-shrink: 0;
  `

  btn.querySelector('#immotest-btn-text').style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 2px;
  `

  btn.querySelector('#immotest-btn-title').style.cssText = `
    font-weight: 700;
    font-size: 14px;
    white-space: nowrap;
  `

  const sub = btn.querySelector('#immotest-btn-sub')
  if (sub) sub.style.cssText = `font-size: 12px; opacity: 0.8;`

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

  // Slide-in animation
  btn.style.opacity = '0'
  btn.style.transform = 'translateY(20px)'
  setTimeout(() => {
    btn.style.transition = 'opacity 0.3s ease, transform 0.3s ease'
    btn.style.opacity = '1'
    btn.style.transform = 'translateY(0)'
  }, 500)
}

// Inject floating button on listing pages
const site = detectSite()
if (site) {
  setTimeout(() => {
    const data = extractData()
    if (data) injectFloatingButton(data)
  }, 1500)
}

// Message listener for popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractData') {
    const data = extractData()
    sendResponse({ data, site: detectSite() })
  }

  if (request.action === 'isOnListingPage') {
    const site = detectSite()
    const url = window.location.pathname

    const isListing =
      (site === 'leboncoin' && url.includes('/ad/')) ||
      (site === 'seloger' && (url.includes('/annonces/') || /\/\d+/.test(url))) ||
      site === 'pap' ||
      document.querySelector('[class*="price"]') !== null

    sendResponse({ isListing: !!isListing, site })
  }

  return true
})
