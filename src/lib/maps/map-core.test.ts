import { describe, expect, it } from 'vitest'
import { getFreshPosition, isPositionFresh } from './map-core'

describe('GPS position freshness', () => {
  const nowMs = 1_700_000_000_000

  it('accepts positions inside the freshness window', () => {
    const position = { timestamp: nowMs - 30_000, latitude: 1, longitude: 1 }

    expect(isPositionFresh(position, 60_000, nowMs)).toBe(true)
    expect(getFreshPosition(position, 60_000, nowMs)).toBe(position)
  })

  it('rejects missing, stale, invalid, and far-future positions', () => {
    expect(isPositionFresh(null, 60_000, nowMs)).toBe(false)
    expect(isPositionFresh({ timestamp: Number.NaN }, 60_000, nowMs)).toBe(false)
    expect(isPositionFresh({ timestamp: nowMs - 60_001 }, 60_000, nowMs)).toBe(false)
    expect(isPositionFresh({ timestamp: nowMs + 5_001 }, 60_000, nowMs)).toBe(false)
  })
})
