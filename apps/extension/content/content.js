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

  return true // keep message channel open for async response
})
