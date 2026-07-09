import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'
import { afterEach, describe, expect, it, vi } from 'vitest'

type ResponseLike = {
  ok: boolean
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

class TileResponse implements ResponseLike {
  readonly ok = true
  readonly status = 200
  readonly statusText = 'OK'
  readonly headers = new Headers({ 'Content-Type': 'image/png' })

  constructor(private readonly bodyText: string) {}

  clone() {
    return new TileResponse(this.bodyText)
  }

  async blob() {
    return new Blob([this.bodyText], { type: 'image/png' })
  }
}

const dbNames: string[] = []

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

function getStoredTiles(dbName: string) {
  return new Promise<Array<{ url: string; blob: Blob }>>((resolve, reject) => {
    const openRequest = indexedDB.open(dbName)
    openRequest.onerror = () => reject(openRequest.error)
    openRequest.onsuccess = () => {
      const database = openRequest.result
      const transaction = database.transaction('mapTiles', 'readonly')
      const store = transaction.objectStore('mapTiles')
      const getAllRequest = store.getAll()

      getAllRequest.onsuccess = () => resolve(getAllRequest.result)
      getAllRequest.onerror = () => reject(getAllRequest.error)
      transaction.oncomplete = () => database.close()
      transaction.onabort = () => {
        database.close()
        reject(transaction.error)
      }
    }
  })
}

async function getStoredTileUrls(dbName: string) {
  return (await getStoredTiles(dbName)).map((tile) => tile.url)
}

function createTileCacheController(maxCachedTiles: number, existingDbName?: string) {
  const source = readFileSync(resolve(process.cwd(), 'public/sw/tile-cache.js'), 'utf8')
  const dbName =
    existingDbName ?? `pastore-sw-tile-cache-test-${Date.now()}-${Math.random()}`
  let nowMs = Date.parse('2026-06-01T00:00:00.000Z')
  if (!existingDbName) {
    dbNames.push(dbName)
  }

  const swScope: TestServiceWorkerScope = {
    __PASTORE_SW__: {
      shared: {
        TILE_CACHE_NAME: 'test-map-tiles',
        DB_NAME: dbName,
        MAP_TILE_STORE: 'mapTiles',
        TILE_CACHE_SETTINGS_STORE: 'tileCacheSettings',
        TILE_CACHING_ENABLED_KEY: 'runtimeCachingEnabled',
        TILE_DB_UPDATED_AT_INDEX: 'updatedAt',
        MAX_CACHED_TILES: maxCachedTiles,
      },
    },
    clients: {
      matchAll: async () => [],
    },
  }
  const cacheStorage = {
    delete: vi.fn(async () => true),
  }
  const fetchMock = vi.fn(async (request: Request) => new TileResponse(request.url))
  const TestDate = class extends Date {
    constructor(value?: string | number | Date) {
      if (value instanceof Date) {
        super(value.getTime())
      } else {
        super(value ?? nowMs)
      }
    }

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
    controller,
    dbName,
    fetchMock,
    advanceTime(ms: number) {
      nowMs += ms
    },
  }
}

async function sendTileCachingMessage(
  controller: TileCacheController,
  enabled: boolean,
  clearStoredTiles = false
) {
  const waitUntil = vi.fn()
  controller.handleMessage(
    { type: 'SET_TILE_CACHING', enabled, clearStoredTiles },
    { waitUntil }
  )

  await Promise.all(waitUntil.mock.calls.map(([promise]) => promise))
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
  it('evicts IndexedDB tiles beyond the shared cache ceiling', async () => {
    const { controller, dbName, advanceTime } = createTileCacheController(2)
    const urls = [
      'https://geoservices.buergernetz.bz.it/mapproxy/ows?SERVICE=WMS&REQUEST=GetMap&BBOX=1',
      'https://geoservices.buergernetz.bz.it/mapproxy/ows?SERVICE=WMS&REQUEST=GetMap&BBOX=2',
      'https://geoservices.buergernetz.bz.it/mapproxy/ows?SERVICE=WMS&REQUEST=GetMap&BBOX=3',
    ]

    await sendTileCachingMessage(controller, true)

    for (const url of urls) {
      advanceTime(61_000)
      await controller.handleTileRequest(new Request(url))
      await waitFor(
        () => getStoredTileUrls(dbName),
        (storedUrls) => storedUrls.includes(url)
      )
    }

    const storedUrls = await waitFor(
      () => getStoredTileUrls(dbName),
      (currentUrls) => currentUrls.length === 2 && !currentUrls.includes(urls[0])
    )

    expect(storedUrls.sort()).toEqual([urls[1], urls[2]].sort())
  })

  it('keeps runtime tile caching enabled after the service worker restarts', async () => {
    const firstWorker = createTileCacheController(10)
    const url =
      'https://geoservices.buergernetz.bz.it/mapproxy/ows?SERVICE=WMS&REQUEST=GetMap&BBOX=restart'

    await sendTileCachingMessage(firstWorker.controller, true)

    const restartedWorker = createTileCacheController(10, firstWorker.dbName)
    await restartedWorker.controller.handleTileRequest(new Request(url))

    const storedUrls = await waitFor(
      () => getStoredTileUrls(firstWorker.dbName),
      (currentUrls) => currentUrls.includes(url)
    )

    expect(storedUrls).toContain(url)
  })

  it('serves a cached tile from IndexedDB when the network is unavailable', async () => {
    const worker = createTileCacheController(10)
    const url =
      'https://geoservices.buergernetz.bz.it/mapproxy/ows?SERVICE=WMS&REQUEST=GetMap&BBOX=offline'

    await sendTileCachingMessage(worker.controller, true)
    await worker.controller.handleTileRequest(new Request(url))
    await waitFor(
      () => getStoredTileUrls(worker.dbName),
      (storedUrls) => storedUrls.includes(url)
    )

    worker.fetchMock.mockRejectedValueOnce(new Error('network unavailable'))
    const offlineResponse = await worker.controller.handleTileRequest(new Request(url))

    expect(worker.fetchMock).toHaveBeenCalledTimes(2)
    await expect((offlineResponse as Response).text()).resolves.toBe(url)
  })

  it('returns a transparent fallback tile when network and cache both miss', async () => {
    const worker = createTileCacheController(10)
    const url =
      'https://geoservices.buergernetz.bz.it/mapproxy/ows?SERVICE=WMS&REQUEST=GetMap&BBOX=missing'

    worker.fetchMock.mockRejectedValueOnce(new Error('network unavailable'))
    const response = await worker.controller.handleTileRequest(new Request(url))

    expect((response as Response).ok).toBe(true)
    expect((response as Response).headers.get('X-Pastore-Tile-Fallback')).toBe('1')
  })
})
