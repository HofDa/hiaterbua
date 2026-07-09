(() => {
  const swScope = self.__PASTORE_SW__ || (self.__PASTORE_SW__ = {})
  const shared = swScope.shared
  const NAVIGATION_NETWORK_TIMEOUT_MS = 3_000

  function createAppShell(precacheManifest) {
    const manifest = precacheManifest ?? shared.DEFAULT_PRECACHE_MANIFEST
    const appCacheName = `${shared.APP_SHELL_PREFIX}-${manifest.version || 'dev'}`
    const appRouteToDataRoute = new Map(
      (manifest.routes ?? [])
        .filter((route) => route.dataRoute)
        .map((route) => [shared.normalizePathname(route.path), route.dataRoute])
    )
    const appShellRoutes = new Set(
      (manifest.routes ?? []).map((route) => shared.normalizePathname(route.path))
    )
    const appDataRoutes = new Set(appRouteToDataRoute.values())
    const precacheUrls = Array.from(new Set([shared.OFFLINE_URL, ...(manifest.urls ?? [])]))
    const precacheUrlSet = new Set(precacheUrls)
    const precacheDataRoutePairs = Array.from(appRouteToDataRoute.entries())

    async function openCacheBestEffort() {
      try {
        return await caches.open(appCacheName)
      } catch {
        return null
      }
    }

    // Next serves these prerendered error documents with their semantic error
    // status (404/500); the body is still the correct page to cache.
    function isErrorStatusAppPage(url) {
      return url === '/_not-found' || url === '/_global-error'
    }

    // An unconsumed response body keeps its HTTP/1.1 connection checked out of
    // the pool; a handful of discarded responses can wedge every later install
    // fetch. Cancel the stream whenever a response won't be cached.
    function discardResponseBody(response) {
      try {
        void response.body?.cancel()
      } catch {
        // Releasing the connection is best-effort.
      }
    }

    // A hung fetch must never wedge the install/repair forever. Generous for
    // core urls (large chunks on slow field connections), short for the
    // opportunistic data payloads. Guarded: not every runtime has AbortSignal.
    const PRECACHE_URL_FETCH_TIMEOUT_MS = 120_000
    const PRECACHE_DATA_FETCH_TIMEOUT_MS = 20_000

    function timeoutSignal(timeoutMs) {
      if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
        return AbortSignal.timeout(timeoutMs)
      }

      return undefined
    }

    async function cacheUrlIfMissing(cache, url) {
      const cacheKey = shared.createCacheKey(url)
      const existing = await matchCacheBestEffort(cache, cacheKey)
      if (existing) return true

      try {
        const response = await fetch(new Request(cacheKey, { cache: 'reload' }), {
          signal: timeoutSignal(PRECACHE_URL_FETCH_TIMEOUT_MS),
        })
        if (!response.ok && response.type !== 'opaque' && !isErrorStatusAppPage(url)) {
          discardResponseBody(response)
          return false
        }

        await cache.put(cacheKey, response.clone())
        return true
      } catch {
        return false
      }
    }

    // RSC payloads make offline client-side navigation seamless, but not every
    // server exposes the static `.rsc` path (e.g. `next start`), so fall back
    // to requesting the page route with the RSC header. Always best-effort:
    // a failed hydration payload still degrades gracefully to a cached full
    // navigation, so it must never block the install.
    async function cacheDataRouteBestEffort(cache, routePath, dataRoute) {
      const cacheKey = shared.createCacheKey(dataRoute)
      const existing = await matchCacheBestEffort(cache, cacheKey)
      if (existing) return

      try {
        let response = await fetch(new Request(shared.createCacheKey(dataRoute), { cache: 'reload' }), {
          signal: timeoutSignal(PRECACHE_DATA_FETCH_TIMEOUT_MS),
        })
        if (!response.ok) {
          discardResponseBody(response)
          response = await fetch(
            new Request(shared.createCacheKey(routePath), {
              cache: 'reload',
              headers: { RSC: '1' },
            }),
            { signal: timeoutSignal(PRECACHE_DATA_FETCH_TIMEOUT_MS) }
          )
        }

        if (response.ok) {
          await putCacheBestEffort(cache, cacheKey, response)
        } else {
          discardResponseBody(response)
        }
      } catch {
        // Opportunistic only; the cached page navigation remains the fallback.
      }
    }

    // Strict on purpose: a partially precached shell used to install "successfully"
    // and later strand the user on the offline page mid-field. Failing the install
    // keeps the previous, complete shell active until a retry succeeds.
    async function precacheAppShell() {
      const cache = await caches.open(appCacheName)

      const results = await Promise.all(precacheUrls.map((url) => cacheUrlIfMissing(cache, url)))

      await Promise.allSettled(
        precacheDataRoutePairs.map(([routePath, dataRoute]) =>
          cacheDataRouteBestEffort(cache, routePath, dataRoute)
        )
      )

      const failedCount = results.filter((ok) => !ok).length
      if (failedCount > 0) {
        throw new Error(
          `app-shell precache incomplete: ${failedCount} of ${precacheUrls.length} urls failed`
        )
      }
    }

    // Refill any precache entries that were lost (storage eviction, or a partial
    // install from an older service-worker version). Best-effort by design —
    // it runs opportunistically whenever the app regains connectivity.
    async function repairAppShellCache() {
      const cache = await openCacheBestEffort()
      if (!cache) return

      await Promise.allSettled(precacheUrls.map((url) => cacheUrlIfMissing(cache, url)))
      await Promise.allSettled(
        precacheDataRoutePairs.map(([routePath, dataRoute]) =>
          cacheDataRouteBestEffort(cache, routePath, dataRoute)
        )
      )
    }

    async function putCacheBestEffort(cache, key, response) {
      if (!cache) return

      try {
        await cache.put(key, response.clone())
      } catch {
        // Cache writes are opportunistic. Under storage pressure the network
        // response should still be returned to the page.
      }
    }

    async function matchCacheBestEffort(cache, key) {
      if (!cache) return null

      try {
        return await cache.match(key)
      } catch {
        return null
      }
    }

    async function handleNavigationRequest(request) {
      const requestUrl = new URL(request.url)
      const cache = await openCacheBestEffort()
      const cacheKey = getNavigationCacheKey(requestUrl)
      const networkResponse = fetch(request).then(async (response) => {
        if (cacheKey && response.ok) {
          await putCacheBestEffort(cache, cacheKey, response)
        }

        return response
      })

      try {
        return await raceNetworkResponse(networkResponse, NAVIGATION_NETWORK_TIMEOUT_MS)
      } catch {
        void networkResponse.catch(() => undefined)
        const legacyRedirectTarget = getLegacyHerdRedirectUrl(requestUrl)
        if (legacyRedirectTarget) {
          return Response.redirect(legacyRedirectTarget, 302)
        }

        if (cacheKey) {
          const cachedResponse = await matchCacheBestEffort(cache, cacheKey)
          if (cachedResponse) {
            return cachedResponse
          }
        }

        const offlineResponse = await matchCacheBestEffort(
          cache,
          shared.createCacheKey(shared.OFFLINE_URL)
        )
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

    function raceNetworkResponse(networkResponse, timeoutMs) {
      let timeoutId = null
      const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('navigation_network_timeout'))
        }, timeoutMs)
      })

      return Promise.race([networkResponse, timeout]).finally(() => {
        if (timeoutId !== null) {
          clearTimeout(timeoutId)
        }
      })
    }

    // Mirror the navigation strategy: on flaky field signal a fetch can hang for
    // minutes without rejecting, which froze client-side navigation. Race the
    // network against the same short timeout and fall back to the cached payload.
    async function handleAppDataRequest(request) {
      const requestUrl = new URL(request.url)
      const cache = await openCacheBestEffort()
      const cacheKey = getAppDataCacheKey(request, requestUrl)
      const networkResponse = fetch(request).then(async (response) => {
        if (cacheKey && response.ok) {
          await putCacheBestEffort(cache, cacheKey, response)
        }

        return response
      })

      try {
        return await raceNetworkResponse(networkResponse, NAVIGATION_NETWORK_TIMEOUT_MS)
      } catch {
        void networkResponse.catch(() => undefined)

        if (cacheKey) {
          const cachedResponse = await matchCacheBestEffort(cache, cacheKey)
          if (cachedResponse) {
            return cachedResponse
          }
        }

        return new Response('', {
          status: 503,
          statusText: 'Offline',
        })
      }
    }

    async function handleAppAssetRequest(request) {
      const cache = await openCacheBestEffort()
      const cachedResponse = await matchCacheBestEffort(cache, request)

      if (cachedResponse) {
        void refreshAppAsset(cache, request)
        return cachedResponse
      }

      const networkResponse = await fetch(request)

      if (networkResponse.ok) {
        await putCacheBestEffort(cache, request, networkResponse)
      }

      return networkResponse
    }

    async function refreshAppAsset(cache, request) {
      try {
        const networkResponse = await fetch(request)
        if (networkResponse.ok) {
          await putCacheBestEffort(cache, request, networkResponse)
        }
      } catch {
        // Keep the cached asset when the refresh fails.
      }
    }

    function getNavigationCacheKey(url) {
      const canonicalPath = getCanonicalAppPath(url)

      if (!canonicalPath) {
        return null
      }

      return shared.createCacheKey(canonicalPath)
    }

    function getAppDataCacheKey(request, url) {
      if (appDataRoutes.has(url.pathname)) {
        return shared.createCacheKey(url.pathname)
      }

      const canonicalPath = getCanonicalAppPath(url)
      if (!canonicalPath) {
        return null
      }

      const dataRoute = appRouteToDataRoute.get(canonicalPath)
      if (!dataRoute) {
        return null
      }

      return shared.createCacheKey(dataRoute)
    }

    function getCanonicalAppPath(url) {
      const legacyRoute = matchLegacyHerdRoute(url.pathname)
      if (legacyRoute) {
        return legacyRoute.canonicalPath
      }

      const normalizedPath = shared.normalizePathname(url.pathname)
      if (appShellRoutes.has(normalizedPath)) {
        return normalizedPath
      }

      return null
    }

    function getLegacyHerdRedirectUrl(url) {
      const legacyRoute = matchLegacyHerdRoute(url.pathname)
      if (!legacyRoute) {
        return null
      }

      return `${legacyRoute.canonicalPath}?id=${encodeURIComponent(legacyRoute.herdId)}`
    }

    function matchLegacyHerdRoute(pathname) {
      const normalizedPath = shared.normalizePathname(pathname)

      const editMatch = normalizedPath.match(/^\/herds\/([^/]+)\/edit$/)
      if (editMatch) {
        return {
          canonicalPath: '/herd/edit',
          herdId: shared.safeDecodeURIComponent(editMatch[1]),
        }
      }

      const detailMatch = normalizedPath.match(/^\/herds\/([^/]+)$/)
      if (detailMatch) {
        return {
          canonicalPath: '/herd',
          herdId: shared.safeDecodeURIComponent(detailMatch[1]),
        }
      }

      return null
    }

    return {
      cacheName: appCacheName,
      handleAppAssetRequest,
      handleAppDataRequest,
      handleNavigationRequest,
      repairAppShellCache,
      isAppDataRequest(request, url) {
        return (
          appDataRoutes.has(url.pathname) ||
          url.searchParams.has('_rsc') ||
          request.headers.get('RSC') === '1' ||
          request.headers.get('accept')?.includes('text/x-component')
        )
      },
      isCacheableSameOriginAsset(url) {
        if (url.pathname.startsWith('/_next/static/')) {
          return true
        }

        if (precacheUrlSet.has(url.pathname)) {
          return true
        }

        return shared.CACHEABLE_PUBLIC_ASSET_PATTERN.test(url.pathname)
      },
      precacheAppShell,
    }
  }

  swScope.createAppShell = createAppShell
})()
