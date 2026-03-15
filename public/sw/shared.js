(() => {
  const swScope = self.__PASTORE_SW__ || (self.__PASTORE_SW__ = {})
  const OFFLINE_URL = '/offline.html'

  swScope.shared = {
    TILE_CACHE_NAME: 'hirtenapp-map-tiles-v1',
    OFFLINE_URL,
    TILE_DB_UPDATED_AT_INDEX: 'updatedAt',
    DEFAULT_PRECACHE_MANIFEST: {
      version: 'dev',
      routes: [],
      urls: [OFFLINE_URL],
    },
    APP_SHELL_PREFIX: 'pastore-app-shell',
    CACHEABLE_PUBLIC_ASSET_PATTERN:
      /\.(?:css|js|json|txt|xml|ico|png|jpg|jpeg|svg|webp|gif|woff2?)$/i,
    DB_NAME: 'hirtenapp-tile-db',
    MAP_TILE_STORE: 'mapTiles',
    createCacheKey(pathOrUrl) {
      return new Request(new URL(pathOrUrl, self.location.origin).toString())
    },
    normalizePathname(pathname) {
      if (pathname.length > 1 && pathname.endsWith('/')) {
        return pathname.slice(0, -1)
      }

      return pathname
    },
    safeDecodeURIComponent(value) {
      try {
        return decodeURIComponent(value)
      } catch {
        return value
      }
    },
  }
})()
