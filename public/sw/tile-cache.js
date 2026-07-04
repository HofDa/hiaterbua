(() => {
  const swScope = self.__PASTORE_SW__ || (self.__PASTORE_SW__ = {})
  const shared = swScope.shared

  // Runtime caching during normal map browsing would otherwise grow the tile
  // store without bound. Trim at most once a minute so the scan never piles onto
  // every tile write.
  const EVICTION_THROTTLE_MS = 60_000

  function createTileCacheController() {
    let tileCachingEnabled = null
    let tileCacheUpdateTimeout = null
    let lastEvictionMs = 0

    function handleMessage(data, event) {
      if (data.type !== 'SET_TILE_CACHING') {
        return false
      }

      const nextTileCachingEnabled = Boolean(data.enabled)
      tileCachingEnabled = nextTileCachingEnabled
      const writePreference = setStoredTileCachingEnabled(nextTileCachingEnabled)

      if (data.clearStoredTiles) {
        event.waitUntil(
          Promise.allSettled([
            writePreference,
            caches.delete(shared.TILE_CACHE_NAME),
            clearTileStore(),
          ]).then(() => {
            scheduleTileCacheUpdatedMessage()
          })
        )
      } else {
        event.waitUntil(writePreference)
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

    async function openTileCacheBestEffort() {
      try {
        return await caches.open(shared.TILE_CACHE_NAME)
      } catch {
        return null
      }
    }

    async function handleTileRequest(request) {
      const cache = await openTileCacheBestEffort()
      const cachedResponse = cache ? await cache.match(request).catch(() => null) : null
      const shouldPersistTiles = await getTileCachingEnabled()

      if (cachedResponse) {
        if (shouldPersistTiles) {
          void updateTileInBackground(cache, request)
        }
        return cachedResponse
      }

      let storedTile = null
      try {
        storedTile = await getStoredTile(request.url)
      } catch {
        // If IndexedDB is temporarily unavailable, still try the network.
      }

      if (storedTile) {
        if (shouldPersistTiles) {
          void updateTileInBackground(cache, request)
        }
        return responseFromStoredTile(storedTile)
      }

      const networkResponse = await fetch(request)
      if (shouldPersistTiles && (networkResponse.ok || networkResponse.type === 'opaque')) {
        void persistTileBestEffort(cache, request, networkResponse)
      }

      return networkResponse
    }

    async function getTileCachingEnabled() {
      if (tileCachingEnabled !== null) {
        return tileCachingEnabled
      }

      try {
        tileCachingEnabled = await getStoredTileCachingEnabled()
      } catch {
        return false
      }

      return tileCachingEnabled
    }

    async function updateTileInBackground(cache, request) {
      try {
        const networkResponse = await fetch(request)
        if (networkResponse.ok || networkResponse.type === 'opaque') {
          await persistTileBestEffort(cache, request, networkResponse)
        }
      } catch {
        // Ignore background refresh failures and keep the cached tile.
      }
    }

    async function persistTileBestEffort(cache, request, response) {
      let didPersist = false
      const cacheResponse = response.clone()
      const storedResponse = response.clone()

      if (cache) {
        try {
          // Cache API keeps opaque cross-origin image responses available;
          // IndexedDB below is the countable/trimmable store for CORS tiles.
          await cache.put(request, cacheResponse)
          didPersist = true
        } catch {
          // Cache writes can fail under storage pressure. Keep serving the tile.
        }
      }

      try {
        await putStoredTile(request, storedResponse)
        didPersist = true
      } catch {
        // IndexedDB is a secondary offline store; failures must not break maps.
      }

      if (didPersist) {
        scheduleTileCacheUpdatedMessage()
        maybeEvictOldTiles()
      }
    }

    function maybeEvictOldTiles() {
      const now = Date.now()
      if (now - lastEvictionMs < EVICTION_THROTTLE_MS) return
      lastEvictionMs = now

      // Fire-and-forget: eviction must never block or break tile serving.
      void evictOldTilesBestEffort(shared.MAX_CACHED_TILES)
    }

    async function evictOldTilesBestEffort(cap) {
      let deletedStoredUrls = []
      let retainedStoredUrls = new Set()

      try {
        const storedTrim = await deleteOldestStoredTiles(cap)
        deletedStoredUrls = storedTrim.deletedUrls
        retainedStoredUrls = storedTrim.retainedUrls
      } catch {
        // If IndexedDB is unavailable, still trim the Cache API below.
      }

      try {
        const cache = await openTileCacheBestEffort()
        if (!cache) {
          if (deletedStoredUrls.length > 0) {
            scheduleTileCacheUpdatedMessage()
          }
          return
        }

        if (deletedStoredUrls.length > 0) {
          await Promise.allSettled(deletedStoredUrls.map((url) => cache.delete(url)))
        }

        const deletedCacheOnlyCount = await deleteCacheOnlyTilesPastLimit(
          cache,
          retainedStoredUrls,
          cap
        )

        if (deletedStoredUrls.length > 0 || deletedCacheOnlyCount > 0) {
          scheduleTileCacheUpdatedMessage()
        }
      } catch {
        // Best-effort: a failed trim just leaves the cache as-is until next time.
      }
    }

    async function deleteOldestStoredTiles(cap) {
      const database = await openTileDb()

      return new Promise((resolve, reject) => {
        const deletedUrls = []
        const retainedUrls = new Set()
        const transaction = database.transaction(shared.MAP_TILE_STORE, 'readwrite')
        const store = transaction.objectStore(shared.MAP_TILE_STORE)

        transaction.oncomplete = () => {
          database.close()
          resolve({ deletedUrls, retainedUrls })
        }
        transaction.onabort = () => {
          database.close()
          reject(transaction.error)
        }

        const countRequest = store.count()
        countRequest.onsuccess = () => {
          const overflow = Math.max(0, countRequest.result - cap)

          // Oldest-first: the updatedAt index iterates ascending by default.
          const cursorRequest = store.index(shared.TILE_DB_UPDATED_AT_INDEX).openCursor()
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result
            if (!cursor) return

            if (deletedUrls.length < overflow) {
              deletedUrls.push(cursor.value.url)
              cursor.delete()
            } else {
              retainedUrls.add(cursor.value.url)
            }
            cursor.continue()
          }
        }
      })
    }

    async function deleteCacheOnlyTilesPastLimit(cache, retainedStoredUrls, cap) {
      const cachedRequests = await cache.keys()
      const cacheOnlyRequests = cachedRequests.filter(
        (request) => !retainedStoredUrls.has(request.url)
      )
      const unionCount = retainedStoredUrls.size + cacheOnlyRequests.length
      const overflow = unionCount - cap
      if (overflow <= 0) return 0

      const requestsToDelete = cacheOnlyRequests.slice(0, overflow)
      await Promise.allSettled(requestsToDelete.map((request) => cache.delete(request)))
      return requestsToDelete.length
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
      }

      const tileStore = transaction?.objectStore(shared.MAP_TILE_STORE) ?? null
      if (tileStore && !tileStore.indexNames.contains(shared.TILE_DB_UPDATED_AT_INDEX)) {
        tileStore.createIndex(shared.TILE_DB_UPDATED_AT_INDEX, shared.TILE_DB_UPDATED_AT_INDEX, {
          unique: false,
        })
      }

      if (!database.objectStoreNames.contains(shared.TILE_CACHE_SETTINGS_STORE)) {
        database.createObjectStore(shared.TILE_CACHE_SETTINGS_STORE, { keyPath: 'key' })
      }
    }

    function hasRequiredTileStoreSchema(database) {
      if (!database.objectStoreNames.contains(shared.MAP_TILE_STORE)) {
        return false
      }

      if (!database.objectStoreNames.contains(shared.TILE_CACHE_SETTINGS_STORE)) {
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

    async function getStoredTileCachingEnabled() {
      const database = await openTileDb()

      return new Promise((resolve, reject) => {
        const transaction = database.transaction(shared.TILE_CACHE_SETTINGS_STORE, 'readonly')
        const store = transaction.objectStore(shared.TILE_CACHE_SETTINGS_STORE)
        const request = store.get(shared.TILE_CACHING_ENABLED_KEY)

        request.onsuccess = () => resolve(Boolean(request.result?.enabled))
        request.onerror = () => reject(request.error)
        transaction.oncomplete = () => database.close()
        transaction.onabort = () => database.close()
      })
    }

    async function setStoredTileCachingEnabled(enabled) {
      const database = await openTileDb()

      return new Promise((resolve, reject) => {
        const transaction = database.transaction(shared.TILE_CACHE_SETTINGS_STORE, 'readwrite')
        const store = transaction.objectStore(shared.TILE_CACHE_SETTINGS_STORE)
        const request = store.put({
          key: shared.TILE_CACHING_ENABLED_KEY,
          enabled,
          updatedAt: new Date().toISOString(),
        })

        request.onsuccess = () => resolve(true)
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
