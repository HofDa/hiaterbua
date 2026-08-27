import { describe, expect, it, vi } from 'vitest'
import { postTileCachingMessage, shouldClearStoredTiles } from '@/lib/maps/tile-caching-sync'

describe('shouldClearStoredTiles', () => {
  it('clears only when the user switches caching off', () => {
    expect(shouldClearStoredTiles(true, false)).toBe(true)
  })

  it('keeps stored tiles on every other transition', () => {
    expect(shouldClearStoredTiles(false, true)).toBe(false)
    expect(shouldClearStoredTiles(true, true)).toBe(false)
    expect(shouldClearStoredTiles(false, false)).toBe(false)
  })

  // A cold start reads the setting as `null` before the DB answers. Treating that
  // as "off" would wipe the offline map cache of a device that is out of signal.
  it('never clears while the setting is still unknown', () => {
    expect(shouldClearStoredTiles(null, false)).toBe(false)
    expect(shouldClearStoredTiles(null, true)).toBe(false)
    expect(shouldClearStoredTiles(true, null)).toBe(false)
  })
})

describe('postTileCachingMessage', () => {
  it('sends the preference to the worker', () => {
    const postMessage = vi.fn()

    expect(postTileCachingMessage({ postMessage }, true, false)).toBe(true)
    expect(postMessage).toHaveBeenCalledWith({
      type: 'SET_TILE_CACHING',
      enabled: true,
      clearStoredTiles: false,
    })
  })

  it('forwards the clear flag', () => {
    const postMessage = vi.fn()

    postTileCachingMessage({ postMessage }, false, true)

    expect(postMessage).toHaveBeenCalledWith({
      type: 'SET_TILE_CACHING',
      enabled: false,
      clearStoredTiles: true,
    })
  })

  it('reports no send when there is no worker yet', () => {
    expect(postTileCachingMessage(null, true, false)).toBe(false)
    expect(postTileCachingMessage(undefined, true, false)).toBe(false)
  })

  it('reports no send while the setting is still unknown', () => {
    const postMessage = vi.fn()

    expect(postTileCachingMessage({ postMessage }, null, false)).toBe(false)
    expect(postMessage).not.toHaveBeenCalled()
  })
})
