(() => {
  const swScope = self.__PASTORE_SW__ || (self.__PASTORE_SW__ = {})
  const shared = swScope.shared

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

    async function openCacheBestEffort() {
      try {
        return await caches.open(appCacheName)
      } catch {
        return null
      }
    }

    async function precacheAppShell() {
      const cache = await openCacheBestEffort()
      if (!cache) return

      await Promise.allSettled(
        precacheUrls.map(async (url) => {
          try {
            const response = await fetch(new Request(url, { cache: 'reload' }))
            if (!response.ok && response.type !== 'opaque') {
              return
            }

            await cache.put(shared.createCacheKey(url), response.clone())
          } catch {
            // Ignore individual precache failures and keep the install resilient.
          }
        })
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

      try {
        const networkResponse = await fetch(request)

        if (cacheKey && networkResponse.ok) {
          await putCacheBestEffort(cache, cacheKey, networkResponse)
        }

        return networkResponse
      } catch {
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

    async function handleAppDataRequest(request) {
      const requestUrl = new URL(request.url)
      const cache = await openCacheBestEffort()
      const cacheKey = getAppDataCacheKey(request, requestUrl)

      try {
        const networkResponse = await fetch(request)

        if (cacheKey && networkResponse.ok) {
          await putCacheBestEffort(cache, cacheKey, networkResponse)
        }

        return networkResponse
      } catch {
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
