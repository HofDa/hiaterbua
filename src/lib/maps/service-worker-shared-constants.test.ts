import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
import {
  MAP_TILE_STORE,
  MAX_CACHED_TILES,
  TILE_CACHE_NAME,
  TILE_CACHE_SETTINGS_STORE,
  TILE_CACHING_ENABLED_KEY,
  TILE_DB_NAME,
  TILE_DB_UPDATED_AT_INDEX,
} from '@/lib/maps/tile-cache'

type SharedConstants = {
  TILE_CACHE_NAME: string
  DB_NAME: string
  MAP_TILE_STORE: string
  TILE_CACHE_SETTINGS_STORE: string
  TILE_DB_UPDATED_AT_INDEX: string
  TILE_CACHING_ENABLED_KEY: string
  MAX_CACHED_TILES: number
}

// `public/sw/shared.js` is plain JS loaded via importScripts and cannot import
// from `src`, so it restates the tile-store contract by hand. Load the real file
// and compare, so drift fails CI instead of silently splitting the tile cache
// between the app and the service worker.
function loadSharedConstants(): SharedConstants {
  const source = readFileSync(resolve(process.cwd(), 'public/sw/shared.js'), 'utf8')
  const swScope: { __PASTORE_SW__?: { shared: SharedConstants } } = {}

  vm.runInNewContext(
    source,
    { self: swScope, Request, URL },
    { filename: 'public/sw/shared.js' }
  )

  const shared = swScope.__PASTORE_SW__?.shared
  if (!shared) {
    throw new Error('public/sw/shared.js did not register __PASTORE_SW__.shared')
  }

  return shared
}

describe('service-worker shared constants', () => {
  it('mirrors the tile-store contract declared in src/lib/maps/tile-cache.ts', () => {
    const shared = loadSharedConstants()

    expect(shared.TILE_CACHE_NAME).toBe(TILE_CACHE_NAME)
    expect(shared.DB_NAME).toBe(TILE_DB_NAME)
    expect(shared.MAP_TILE_STORE).toBe(MAP_TILE_STORE)
    expect(shared.TILE_CACHE_SETTINGS_STORE).toBe(TILE_CACHE_SETTINGS_STORE)
    expect(shared.TILE_DB_UPDATED_AT_INDEX).toBe(TILE_DB_UPDATED_AT_INDEX)
    expect(shared.TILE_CACHING_ENABLED_KEY).toBe(TILE_CACHING_ENABLED_KEY)
  })

  it('enforces the same cached-tile ceiling on both sides', () => {
    expect(loadSharedConstants().MAX_CACHED_TILES).toBe(MAX_CACHED_TILES)
  })
})
