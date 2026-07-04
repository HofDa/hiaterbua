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

    async function handleTileRequest(request) {
      const shouldPersistTiles = await getTileCachingEnabled()

      let storedTile = null
      try {
        storedTile = await getStoredTile(request.url)
      } catch {
        // If IndexedDB is temporarily unavailable, still try the network.
      }

      if (storedTile) {
        if (shouldPersistTiles) {
          void updateTileInBackground(request)
        }
        return responseFromStoredTile(storedTile)
      }

      const networkResponse = await fetch(request)
      if (shouldPersistTiles && networkResponse.ok) {
        void persistTileBestEffort(request, networkResponse)
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

    async function updateTileInBackground(request) {
      try {
        const networkResponse = await fetch(request)
        if (networkResponse.ok) {
          await persistTileBestEffort(request, networkResponse)
        }
      } catch {
        // Ignore background refresh failures and keep the cached tile.
      }
    }

    async function persistTileBestEffort(request, response) {
      let didPersist = false
      const storedResponse = response.clone()

      try {
        await putStoredTile(request, storedResponse)
        didPersist = true
      } catch {
        // Tile persistence is opportunistic; failures must not break maps.
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
      let deletedStoredCount = 0

      try {
        const storedTrim = await deleteOldestStoredTiles(cap)
        deletedStoredCount = storedTrim.deletedCount
      } catch {
        // Best-effort: a failed trim just leaves the store as-is until next time.
      }

      if (deletedStoredCount > 0) {
        scheduleTileCacheUpdatedMessage()
      }
    }

    async function deleteOldestStoredTiles(cap) {
      const database = await openTileDb()

      return new Promise((resolve, reject) => {
        let deletedCount = 0
        const transaction = database.transaction(shared.MAP_TILE_STORE, 'readwrite')
        const store = transaction.objectStore(shared.MAP_TILE_STORE)

        transaction.oncomplete = () => {
          database.close()
          resolve({ deletedCount })
        }
        transaction.onabort = () => {
          database.close()
          reject(transaction.error)
        }

        const countRequest = store.count()
        countRequest.onsuccess = () => {
          const overflow = Math.max(0, countRequest.result - cap)
          if (overflow <= 0) return

          // Oldest-first: the updatedAt index iterates ascending by default.
          const cursorRequest = store.index(shared.TILE_DB_UPDATED_AT_INDEX).openCursor()
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result
            if (!cursor) return

            if (deletedCount < overflow) {
              deletedCount += 1
              cursor.delete()
              if (deletedCount < overflow) {
                cursor.continue()
              }
            }
          }
        }
      })
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
      handleMessage,
      handleTileRequest,
      isCacheableTileRequest,
    }
  }

  swScope.createTileCacheController = createTileCacheController
})()
