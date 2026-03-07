const TILE_CACHE_NAME = 'hirtenapp-map-tiles-v1'
const APP_CACHE_NAME = 'hiaterbua-app-shell-v1'
const OFFLINE_URL = '/offline.html'
const DB_NAME = 'hirtenapp-tile-db'
const MAP_TILE_STORE = 'mapTiles'

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
      event.waitUntil(Promise.all([caches.delete(TILE_CACHE_NAME), clearTileStore()]))
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

  const storedTile = await getStoredTile(request.url)
  if (storedTile) {
    void updateTileInBackground(cache, request)
    return responseFromStoredTile(storedTile)
  }

  const networkResponse = await fetch(request)
  if (networkResponse.ok || networkResponse.type === 'opaque') {
    await cache.put(request, networkResponse.clone())
    await putStoredTile(request, networkResponse.clone())
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
      await putStoredTile(request, networkResponse.clone())
    }
  } catch {
    // Ignore background refresh failures and keep the cached tile.
  }
}

function openTileDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME)

    request.onupgradeneeded = () => {
      const database = request.result
      ensureTileStore(database)
    }

    request.onsuccess = () => {
      const database = request.result

      if (database.objectStoreNames.contains(MAP_TILE_STORE)) {
        resolve(database)
        return
      }

      const nextVersion = database.version + 1
      database.close()

      const upgradeRequest = indexedDB.open(DB_NAME, nextVersion)

      upgradeRequest.onupgradeneeded = () => {
        const upgradeDatabase = upgradeRequest.result
        ensureTileStore(upgradeDatabase)
      }

      upgradeRequest.onsuccess = () => resolve(upgradeRequest.result)
      upgradeRequest.onerror = () => reject(upgradeRequest.error)
    }
    request.onerror = () => reject(request.error)
  })
}

function ensureTileStore(database) {
  if (!database.objectStoreNames.contains(MAP_TILE_STORE)) {
    database.createObjectStore(MAP_TILE_STORE, { keyPath: 'url' })
  }
}

async function getStoredTile(url) {
  const database = await openTileDb()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(MAP_TILE_STORE, 'readonly')
    const store = transaction.objectStore(MAP_TILE_STORE)
    const request = store.get(url)

    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => database.close()
    transaction.onabort = () => database.close()
  })
}

async function clearTileStore() {
  const database = await openTileDb()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(MAP_TILE_STORE, 'readwrite')
    const store = transaction.objectStore(MAP_TILE_STORE)
    const request = store.clear()

    request.onsuccess = () => resolve(true)
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => database.close()
    transaction.onabort = () => database.close()
  })
}

async function putStoredTile(request, response) {
  if (response.type === 'opaque') return

  const database = await openTileDb()

  return new Promise(async (resolve, reject) => {
    try {
      const blob = await response.blob()
      const transaction = database.transaction(MAP_TILE_STORE, 'readwrite')
      const store = transaction.objectStore(MAP_TILE_STORE)
      const writeRequest = store.put({
        url: request.url,
        blob,
        contentType: response.headers.get('content-type') ?? '',
        status: response.status,
        updatedAt: new Date().toISOString(),
      })

      writeRequest.onsuccess = () => resolve(true)
      writeRequest.onerror = () => reject(writeRequest.error)
      transaction.oncomplete = () => database.close()
      transaction.onabort = () => database.close()
    } catch (error) {
      database.close()
      reject(error)
    }
  })
}

function responseFromStoredTile(tileRecord) {
  return new Response(tileRecord.blob, {
    status: tileRecord.status || 200,
    headers: {
      'Content-Type': tileRecord.contentType || 'application/octet-stream',
    },
  })
}
