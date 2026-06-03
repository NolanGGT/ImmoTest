function extractSeLoger() {
  console.log('[ImmoTest SeLoger] URL:', window.location.href)

  const nextData = document.getElementById('__NEXT_DATA__')
  console.log('[ImmoTest SeLoger] __NEXT_DATA__ présent:', !!nextData)

  if (nextData) {
    const json = JSON.parse(nextData.textContent)
    console.log('[ImmoTest SeLoger] pageProps keys:', Object.keys(json?.props?.pageProps || {}))
    console.log('[ImmoTest SeLoger] pageProps:', JSON.stringify(json?.props?.pageProps).slice(0, 500))
  }

  // Meta OG
  const metas = {}
  document.querySelectorAll('meta[property]').forEach(m => {
    metas[m.getAttribute('property')] = m.getAttribute('content')
  })
  console.log('[ImmoTest SeLoger] metas OG:', metas)

  return null
}
