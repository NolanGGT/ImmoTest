chrome.runtime.onInstalled.addListener(() => {
  console.log('[ImmoTest] Extension installée')
})

chrome.notifications.onClicked.addListener((notificationId) => {
  const tabId = parseInt(notificationId.replace('listing-', ''))
  if (!isNaN(tabId)) {
    chrome.tabs.update(tabId, { active: true })
    chrome.windows.update(-1, { focused: true })
    chrome.notifications.clear(notificationId)
  }
})

const LISTING_SITES = [
  'leboncoin.fr/ad/',
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

    chrome.notifications.create(`listing-${tabId}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon48.png'),
      title: 'ImmoTest',
      message: 'Annonce détectée — cliquez pour analyser ce bien',
      priority: 1,
      silent: true,
    })
  } else {
    chrome.action.setBadgeText({ text: '', tabId })
    chrome.notifications.clear(`listing-${tabId}`)
  }
})
