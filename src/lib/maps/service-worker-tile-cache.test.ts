import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'
import { afterEach, describe, expect, it, vi } from 'vitest'

type ResponseLike = {
  ok: boolean
  type: string
  status: number
  statusText: string
  headers: Headers
  clone: () => ResponseLike
  blob: () => Promise<Blob>
}

type TileCacheController = {
  handleMessage: (data: unknown, event: { waitUntil: (promise: Promise<unknown>) => void }) => boolean
  handleTileRequest: (request: Request) => Promise<unknown>
}

type TestServiceWorkerScope = {
  __PASTORE_SW__: {
    shared: Record<string, unknown>
    createTileCacheController?: () => TileCacheController
  }
  clients: {
    matchAll: () => Promise<unknown[]>
  }
}

class OpaqueTileResponse implements ResponseLike {
  readonly ok = false
  readonly type = 'opaque'
  readonly status = 0
  readonly statusText = ''
  readonly headers = new Headers()

  constructor(private readonly bodyText: string) {}

  clone() {
    return new OpaqueTileResponse(this.bodyText)
  }

  async blob() {
    return new Blob([this.bodyText], { type: 'image/png' })
  }
}

class MemoryCache {
  private readonly items = new Map<string, ResponseLike>()

  async put(request: RequestInfo | URL, response: ResponseLike) {
    this.items.set(getRequestUrl(request), response.clone())
  }

  async match(request: RequestInfo | URL) {
    return this.items.get(getRequestUrl(request))?.clone()
  }

  async delete(request: RequestInfo | URL) {
    return this.items.delete(getRequestUrl(request))
  }

  async keys() {
    return this.urls().map((url) => new Request(url))
  }

  urls() {
    return [...this.items.keys()]
  }

  clear() {
    this.items.clear()
  }
}

const dbNames: string[] = []

function getRequestUrl(request: RequestInfo | URL) {
  return request instanceof Request ? request.url : request.toString()
}

function deleteIndexedDb(name: string) {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => resolve()
  })
}

async function waitFor<T>(read: () => T | Promise<T>, accept: (value: T) => boolean) {
  let lastValue: T | undefined

  for (let attempt = 0; attempt < 80; attempt += 1) {
    lastValue = await read()
    if (accept(lastValue)) return lastValue
    await new Promise((resolveWait) => setTimeout(resolveWait, 5))
  }

  throw new Error(`Timed out waiting for condition. Last value: ${String(lastValue)}`)
}

function createTileCacheController(maxCachedTiles: number) {
  const source = readFileSync(resolve(process.cwd(), 'public/sw/tile-cache.js'), 'utf8')
  const dbName = `pastore-sw-tile-cache-test-${Date.now()}-${Math.random()}`
  const cache = new MemoryCache()
  let nowMs = Date.parse('2026-06-01T00:00:00.000Z')
  dbNames.push(dbName)

  const swScope: TestServiceWorkerScope = {
    __PASTORE_SW__: {
      shared: {
        TILE_CACHE_NAME: 'test-map-tiles',
        DB_NAME: dbName,
        MAP_TILE_STORE: 'mapTiles',
        TILE_DB_UPDATED_AT_INDEX: 'updatedAt',
        MAX_CACHED_TILES: maxCachedTiles,
      },
    },
    clients: {
      matchAll: async () => [],
    },
  }
  const cacheStorage = {
    open: vi.fn(async () => cache),
    delete: vi.fn(async () => {
      cache.clear()
      return true
    }),
  }
  const fetchMock = vi.fn(async (request: Request) => new OpaqueTileResponse(request.url))
  const TestDate = class extends Date {
    static now() {
      return nowMs
    }
  }

  vm.runInNewContext(
    source,
    {
      self: swScope,
      caches: cacheStorage,
      indexedDB,
      Request,
      Response,
      Blob,
      Headers,
      URL,
      Date: TestDate,
      fetch: fetchMock,
      setTimeout,
      clearTimeout,
    },
    { filename: 'public/sw/tile-cache.js' }
  )

  const controller = swScope.__PASTORE_SW__.createTileCacheController?.()
  if (!controller) {
    throw new Error('Service-worker tile cache controller was not registered.')
  }

  return {
    cache,
    controller,
    advanceTime(ms: number) {
      nowMs += ms
    },
  }
}

afterEach(async () => {
  vi.restoreAllMocks()

  while (dbNames.length > 0) {
    const dbName = dbNames.pop()
    if (dbName) {
      await deleteIndexedDb(dbName)
    }
  }
})

describe('service-worker tile cache', () => {
  it('evicts Cache API-only tiles beyond the shared cache ceiling', async () => {
    const { cache, controller, advanceTime } = createTileCacheController(2)
    const urls = [
      'https://geoservices.buergernetz.bz.it/mapproxy/ows?SERVICE=WMS&REQUEST=GetMap&BBOX=1',
      'https://geoservices.buergernetz.bz.it/mapproxy/ows?SERVICE=WMS&REQUEST=GetMap&BBOX=2',
      'https://geoservices.buergernetz.bz.it/mapproxy/ows?SERVICE=WMS&REQUEST=GetMap&BBOX=3',
    ]

    controller.handleMessage({ type: 'SET_TILE_CACHING', enabled: true }, { waitUntil: vi.fn() })

    for (const url of urls) {
      advanceTime(61_000)
      await controller.handleTileRequest(new Request(url))
      await waitFor(
        () => cache.urls(),
        (cachedUrls) => cachedUrls.includes(url)
      )
    }

    const cachedUrls = await waitFor(
      () => cache.urls(),
      (currentUrls) => currentUrls.length === 2 && !currentUrls.includes(urls[0])
    )

    expect(cachedUrls).toEqual([urls[1], urls[2]])
  })
})
