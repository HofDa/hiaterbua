const TILE_CACHE_NAME = 'hirtenapp-map-tiles-v1'
const APP_CACHE_NAME = 'hiaterbua-app-shell-v1'
const OFFLINE_URL = '/offline.html'

let tileCachingEnabled = false

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_CACHE_NAME)
      await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }))
      await self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames
          .filter((cacheName) => {
            if (cacheName === TILE_CACHE_NAME) return false
            return cacheName !== APP_CACHE_NAME
          })
          .map((cacheName) => caches.delete(cacheName))
      )
      await self.clients.claim()
    })()
  )
})

self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || typeof data !== 'object') return

  if (data.type === 'SET_TILE_CACHING') {
    tileCachingEnabled = Boolean(data.enabled)

    if (!tileCachingEnabled) {
      event.waitUntil(caches.delete(TILE_CACHE_NAME))
    }
  }
})

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(event.request))
    return
  }

  if (!tileCachingEnabled) return
  if (event.request.method !== 'GET') return

  const requestUrl = new URL(event.request.url)
  if (!isCacheableTileRequest(requestUrl)) return

  event.respondWith(handleTileRequest(event.request))
})

function isCacheableTileRequest(url) {
  if (url.origin !== 'https://geoservices.buergernetz.bz.it') return false
  if (!url.pathname.includes('/mapproxy/ows')) return false

  const requestType = url.searchParams.get('REQUEST')
  const service = url.searchParams.get('SERVICE')

  return requestType === 'GetMap' && service === 'WMS'
}

async function handleTileRequest(request) {
  const cache = await caches.open(TILE_CACHE_NAME)
  const cachedResponse = await cache.match(request)

  if (cachedResponse) {
    void updateTileInBackground(cache, request)
    return cachedResponse
  }

  const networkResponse = await fetch(request)
  if (networkResponse.ok || networkResponse.type === 'opaque') {
    await cache.put(request, networkResponse.clone())
  }

  return networkResponse
}

async function handleNavigationRequest(request) {
  try {
    return await fetch(request)
  } catch {
    const cache = await caches.open(APP_CACHE_NAME)
    const offlineResponse = await cache.match(OFFLINE_URL)

    if (offlineResponse) {
      return offlineResponse
    }

    return new Response('Offline', {
      status: 503,
      statusText: 'Offline',
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  }
}

async function updateTileInBackground(cache, request) {
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok || networkResponse.type === 'opaque') {
      await cache.put(request, networkResponse.clone())
    }
  } catch {
    // Ignore background refresh failures and keep the cached tile.
  }
}
