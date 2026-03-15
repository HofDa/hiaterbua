(() => {
  const swScope = self.__PASTORE_SW__ || (self.__PASTORE_SW__ = {})
  const shared = swScope.shared

  function createTileCacheController() {
    let tileCachingEnabled = false
    let tileCacheUpdateTimeout = null

    function handleMessage(data, event) {
      if (data.type !== 'SET_TILE_CACHING') {
        return false
      }

      tileCachingEnabled = Boolean(data.enabled)

      if (data.clearStoredTiles) {
        event.waitUntil(
          Promise.all([caches.delete(shared.TILE_CACHE_NAME), clearTileStore()]).then(() => {
            scheduleTileCacheUpdatedMessage()
          })
        )
      }

      return true
    }

    function isCacheableTileRequest(url) {
      if (url.origin !== 'https://geoservices.buergernetz.bz.it') return false
      if (!url.pathname.includes('/mapproxy/ows')) return false

      const requestType = url.searchParams.get('REQUEST')
      const service = url.searchParams.get('SERVICE')

      return requestType === 'GetMap' && service === 'WMS'
    }

    async function handleTileRequest(request) {
      const cache = await caches.open(shared.TILE_CACHE_NAME)
      const cachedResponse = await cache.match(request)

      if (cachedResponse) {
        if (tileCachingEnabled) {
          void updateTileInBackground(cache, request)
        }
        return cachedResponse
      }

      const storedTile = await getStoredTile(request.url)
      if (storedTile) {
        if (tileCachingEnabled) {
          void updateTileInBackground(cache, request)
        }
        return responseFromStoredTile(storedTile)
      }

      const networkResponse = await fetch(request)
      if (tileCachingEnabled && (networkResponse.ok || networkResponse.type === 'opaque')) {
        await cache.put(request, networkResponse.clone())
        await putStoredTile(request, networkResponse.clone())
        scheduleTileCacheUpdatedMessage()
      }

      return networkResponse
    }

    async function updateTileInBackground(cache, request) {
      try {
        const networkResponse = await fetch(request)
        if (networkResponse.ok || networkResponse.type === 'opaque') {
          await cache.put(request, networkResponse.clone())
          await putStoredTile(request, networkResponse.clone())
          scheduleTileCacheUpdatedMessage()
        }
      } catch {
        // Ignore background refresh failures and keep the cached tile.
      }
    }

    function scheduleTileCacheUpdatedMessage() {
      if (tileCacheUpdateTimeout !== null) {
        return
      }

      tileCacheUpdateTimeout = setTimeout(async () => {
        tileCacheUpdateTimeout = null
        const clients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        })

        clients.forEach((client) => {
          client.postMessage({ type: 'TILE_CACHE_UPDATED' })
        })
      }, 500)
    }

    function openTileDb() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(shared.DB_NAME)

        request.onupgradeneeded = () => {
          const database = request.result
          ensureTileStore(database, request.transaction)
        }

        request.onsuccess = () => {
          const database = request.result

          if (hasRequiredTileStoreSchema(database)) {
            resolve(database)
            return
          }

          const nextVersion = database.version + 1
          database.close()

          const upgradeRequest = indexedDB.open(shared.DB_NAME, nextVersion)

          upgradeRequest.onupgradeneeded = () => {
            const upgradeDatabase = upgradeRequest.result
            ensureTileStore(upgradeDatabase, upgradeRequest.transaction)
          }

          upgradeRequest.onsuccess = () => resolve(upgradeRequest.result)
          upgradeRequest.onerror = () => reject(upgradeRequest.error)
        }
        request.onerror = () => reject(request.error)
      })
    }

    function ensureTileStore(database, transaction) {
      if (!database.objectStoreNames.contains(shared.MAP_TILE_STORE)) {
        const tileStore = database.createObjectStore(shared.MAP_TILE_STORE, { keyPath: 'url' })
        tileStore.createIndex(shared.TILE_DB_UPDATED_AT_INDEX, shared.TILE_DB_UPDATED_AT_INDEX, {
          unique: false,
        })
        return
      }

      const tileStore = transaction?.objectStore(shared.MAP_TILE_STORE) ?? null
      if (tileStore && !tileStore.indexNames.contains(shared.TILE_DB_UPDATED_AT_INDEX)) {
        tileStore.createIndex(shared.TILE_DB_UPDATED_AT_INDEX, shared.TILE_DB_UPDATED_AT_INDEX, {
          unique: false,
        })
      }
    }

    function hasRequiredTileStoreSchema(database) {
      if (!database.objectStoreNames.contains(shared.MAP_TILE_STORE)) {
        return false
      }

      try {
        const transaction = database.transaction(shared.MAP_TILE_STORE, 'readonly')
        const store = transaction.objectStore(shared.MAP_TILE_STORE)
        return store.indexNames.contains(shared.TILE_DB_UPDATED_AT_INDEX)
      } catch {
        return false
      }
    }

    async function getStoredTile(url) {
      const database = await openTileDb()

      return new Promise((resolve, reject) => {
        const transaction = database.transaction(shared.MAP_TILE_STORE, 'readonly')
        const store = transaction.objectStore(shared.MAP_TILE_STORE)
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
        const transaction = database.transaction(shared.MAP_TILE_STORE, 'readwrite')
        const store = transaction.objectStore(shared.MAP_TILE_STORE)
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
          const transaction = database.transaction(shared.MAP_TILE_STORE, 'readwrite')
          const store = transaction.objectStore(shared.MAP_TILE_STORE)
          const writeRequest = store.put({
            url: request.url,
            blob,
            contentType: response.headers.get('Content-Type') || 'image/png',
            status: response.status,
            statusText: response.statusText,
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

    function responseFromStoredTile(storedTile) {
      return new Response(storedTile.blob, {
        status: storedTile.status || 200,
        statusText: storedTile.statusText || 'OK',
        headers: {
          'Content-Type': storedTile.contentType || 'image/png',
        },
      })
    }

    return {
      cacheName: shared.TILE_CACHE_NAME,
      handleMessage,
      handleTileRequest,
      isCacheableTileRequest,
    }
  }

  swScope.createTileCacheController = createTileCacheController
})()
