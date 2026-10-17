import { describe, expect, it } from 'vitest'
import { getOfflineMapReadinessProblem } from './offline-map-readiness'

describe('getOfflineMapReadinessProblem', () => {
  it('prioritizes a disabled tile cache', () => {
    expect(
      getOfflineMapReadinessProblem({
        tileCachingEnabled: false,
        isOnline: false,
        tileCacheCount: 0,
      }),
    ).toMatchObject({
      tone: 'warning',
      action: { href: '/settings', label: 'Jetzt sichern' },
    })
  })

  it('waits for the tile count before warning', () => {
    expect(
      getOfflineMapReadinessProblem({
        tileCachingEnabled: true,
        isOnline: true,
        tileCacheCount: null,
      }),
    ).toBeNull()
  })

  it('warns about missing maps while the user can still download them', () => {
    expect(
      getOfflineMapReadinessProblem({
        tileCachingEnabled: true,
        isOnline: true,
        tileCacheCount: 0,
      }),
    ).toEqual({
      tone: 'warning',
      text: 'Karte ist noch nicht offline gesichert.',
      action: { href: '/settings', label: 'Jetzt sichern' },
    })
  })

  it('reports an error when the device is already offline without maps', () => {
    expect(
      getOfflineMapReadinessProblem({
        tileCachingEnabled: true,
        isOnline: false,
        tileCacheCount: 0,
      }),
    ).toEqual({
      tone: 'error',
      text: 'Kein Netz und keine offline gesicherte Karte.',
      action: null,
    })
  })

  it('stays hidden when at least one tile is stored', () => {
    expect(
      getOfflineMapReadinessProblem({
        tileCachingEnabled: true,
        isOnline: false,
        tileCacheCount: 1,
      }),
    ).toBeNull()
  })
})
