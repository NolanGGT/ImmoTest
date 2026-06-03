chrome.runtime.onInstalled.addListener(() => {
  console.log('[ImmoTest] Extension installée')
})

const LISTING_SITES = [
  'leboncoin.fr',
  'seloger.com',
  'pap.fr',
  'logic-immo.com',
  'bienici.com',
]

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return

  const isListingSite = LISTING_SITES.some(site => tab.url.includes(site))

  if (isListingSite) {
    chrome.action.setBadgeText({ text: '✓', tabId })
    chrome.action.setBadgeBackgroundColor({ color: '#4f46e5', tabId })
  } else {
    chrome.action.setBadgeText({ text: '', tabId })
  }
})
