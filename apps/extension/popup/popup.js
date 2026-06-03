const IMMOTEST_URL = 'https://immotest.fr'

function showState(stateId) {
  document.querySelectorAll('.state').forEach(el => el.classList.add('hidden'))
  document.getElementById(stateId)?.classList.remove('hidden')
}

function formatPrix(prix) {
  if (!prix) return '—'
  return new Intl.NumberFormat('fr-FR').format(prix) + ' €'
}

function buildImmoTestUrl(data) {
  const params = new URLSearchParams()

  if (data.urlSource)          params.set('urlSource', data.urlSource)
  if (data.prix)               params.set('prix', data.prix)
  if (data.surface)            params.set('surface', data.surface)
  if (data.nbPieces)           params.set('nbPieces', data.nbPieces)
  if (data.ville)              params.set('ville', data.ville)
  if (data.codePostal)         params.set('codePostal', data.codePostal)
  if (data.adresse)            params.set('adresse', data.adresse)
  if (data.typeBien)           params.set('typeBien', data.typeBien)
  if (data.dpe)                params.set('dpe', data.dpe)
  if (data.charges)            params.set('charges', data.charges)
  if (data.snapshotTitre)      params.set('snapshotTitre', data.snapshotTitre)
  if (data.snapshotDescription) params.set('snapshotDescription', data.snapshotDescription.slice(0, 500))
  if (data.snapshotPhotos?.length) {
    params.set('snapshotPhotos', JSON.stringify(data.snapshotPhotos))
  }

  params.set('source', 'extension')

  return `${IMMOTEST_URL}/analyser?${params.toString()}`
}

function openImmoTest(data) {
  const url = buildImmoTestUrl(data || {})
  chrome.tabs.create({ url })
  window.close()
}

document.addEventListener('DOMContentLoaded', async () => {
  showState('state-loading')

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    const listingResponse = await chrome.tabs.sendMessage(tab.id, {
      action: 'isOnListingPage',
    }).catch(() => null)

    if (!listingResponse?.isListing) {
      showState('state-not-listing')
      return
    }

    const dataResponse = await chrome.tabs.sendMessage(tab.id, {
      action: 'extractData',
    }).catch(() => null)

    const data = dataResponse?.data

    if (data?.prix) {
      document.getElementById('preview-type').textContent =
        data.typeBien === 'MAISON' ? 'Maison' :
        data.typeBien === 'STUDIO' ? 'Studio' : 'Appartement'
      document.getElementById('preview-prix').textContent = formatPrix(data.prix)
      document.getElementById('preview-details').textContent = [
        data.surface  ? `${data.surface} m²`    : null,
        data.nbPieces ? `${data.nbPieces} pièces` : null,
        data.dpe      ? `DPE ${data.dpe}`        : null,
      ].filter(Boolean).join(' · ') || '—'
      document.getElementById('preview-ville').textContent =
        [data.ville, data.codePostal].filter(Boolean).join(' ') || '—'

      showState('state-ready')

      document.getElementById('btn-analyze').addEventListener('click', () => {
        openImmoTest(data)
      })
    } else {
      showState('state-partial')

      document.getElementById('btn-analyze-partial').addEventListener('click', () => {
        openImmoTest(data || { urlSource: tab.url })
      })

      document.getElementById('btn-manual').addEventListener('click', () => {
        chrome.tabs.create({ url: `${IMMOTEST_URL}/analyser` })
        window.close()
      })
    }
  } catch (e) {
    console.error('[ImmoTest Extension]', e)
    showState('state-not-listing')
  }
})
