importScripts('/sw/shared.js', '/sw/app-shell.js', '/sw/tile-cache.js')

const swScope = self.__PASTORE_SW__
const shared = swScope.shared

self.__PWA_PRECACHE_MANIFEST = shared.DEFAULT_PRECACHE_MANIFEST

try {
  importScripts('/pwa-precache-manifest.js')
} catch {
  self.__PWA_PRECACHE_MANIFEST = shared.DEFAULT_PRECACHE_MANIFEST
}

const appShell = swScope.createAppShell(
  self.__PWA_PRECACHE_MANIFEST ?? shared.DEFAULT_PRECACHE_MANIFEST
)
const tileCache = swScope.createTileCacheController()

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      await appShell.precacheAppShell()
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
            if (cacheName === tileCache.cacheName) return false
            return cacheName !== appShell.cacheName
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

  tileCache.handleMessage(data, event)
})

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(appShell.handleNavigationRequest(event.request))
    return
  }

  if (event.request.method !== 'GET') return

  const requestUrl = new URL(event.request.url)

  if (tileCache.isCacheableTileRequest(requestUrl)) {
    event.respondWith(tileCache.handleTileRequest(event.request))
    return
  }

  if (requestUrl.origin !== self.location.origin) {
    return
  }

  if (appShell.isAppDataRequest(event.request, requestUrl)) {
    event.respondWith(appShell.handleAppDataRequest(event.request))
    return
  }

  if (appShell.isCacheableSameOriginAsset(requestUrl)) {
    event.respondWith(appShell.handleAppAssetRequest(event.request))
  }
})
