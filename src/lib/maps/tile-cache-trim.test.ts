import Dexie, { type Table } from 'dexie'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  MAX_CACHED_TILES,
  MAX_PREFETCH_TILES,
  TILE_DB_NAME,
  trimTileCacheToLimit,
} from '@/lib/maps/tile-cache'
import type { MapTileRecord } from '@/types/domain'

// `trimTileCacheToLimit` guards its browser entry on `window` (the SSR guard
// shared by the module). Provide a minimal stub with no Cache API so the
// IndexedDB-backed trim runs under Node against fake-indexeddb.
const globalWithWindow = globalThis as { window?: unknown }

// A second connection to the same fake-indexeddb database the module owns, used
// only to seed and inspect tile rows.
class TestTileDb extends Dexie {
  mapTiles!: Table<MapTileRecord, string>

  constructor() {
    super(TILE_DB_NAME)
    this.version(2).stores({ mapTiles: 'url, updatedAt' })
  }
}

let testDb: TestTileDb

function tile(url: string, updatedAt: string): MapTileRecord {
  return { url, blob: new Blob(['tile']), status: 200, updatedAt }
}

beforeAll(() => {
  globalWithWindow.window ??= {}
  testDb = new TestTileDb()
})

afterEach(async () => {
  await testDb.mapTiles.clear()
})

afterAll(async () => {
  testDb.close()
  delete globalWithWindow.window
})

describe('trimTileCacheToLimit', () => {
  it('keeps every tile when the cache is under the limit', async () => {
    await testDb.mapTiles.bulkPut([
      tile('a', '2026-06-01T00:00:00.000Z'),
      tile('b', '2026-06-02T00:00:00.000Z'),
      tile('c', '2026-06-03T00:00:00.000Z'),
    ])

    const removed = await trimTileCacheToLimit(10)

    expect(removed).toBe(0)
    expect(await testDb.mapTiles.count()).toBe(3)
  })

  it('evicts the oldest tiles by updatedAt past the limit', async () => {
    await testDb.mapTiles.bulkPut([
      tile('t1', '2026-06-01T00:00:00.000Z'),
      tile('t2', '2026-06-02T00:00:00.000Z'),
      tile('t3', '2026-06-03T00:00:00.000Z'),
      tile('t4', '2026-06-04T00:00:00.000Z'),
      tile('t5', '2026-06-05T00:00:00.000Z'),
    ])

    const removed = await trimTileCacheToLimit(2)

    expect(removed).toBe(3)
    const remaining = (await testDb.mapTiles.toArray()).map((row) => row.url).sort()
    expect(remaining).toEqual(['t4', 't5'])
  })

  it('is a no-op on an empty cache', async () => {
    expect(await trimTileCacheToLimit(2)).toBe(0)
  })

  it('defaults to a ceiling above a single prefetch batch', () => {
    expect(MAX_CACHED_TILES).toBeGreaterThan(MAX_PREFETCH_TILES)
  })
})
