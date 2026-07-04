import { describe, expect, it } from 'vitest'
import { getFreshPosition, getPositionDecision, isPositionFresh } from './map-core'

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

describe('GPS position plausibility', () => {
  const previous = {
    latitude: 46.5,
    longitude: 11,
    accuracy: 5,
    timestamp: Date.parse('2026-06-01T08:00:00.000Z'),
  }

  it('rejects an otherwise accurate point whose implied speed is not plausible', () => {
    const teleport = {
      latitude: 46.503,
      longitude: 11,
      accuracy: 5,
      timestamp: previous.timestamp + 30_000,
    }

    expect(getPositionDecision(previous, teleport, 15, 2, 2)).toEqual({
      accepted: false,
      reason: 'speed',
    })
  })

  it('accepts a normal walking-speed point', () => {
    const next = {
      latitude: 46.5005,
      longitude: 11,
      accuracy: 5,
      timestamp: previous.timestamp + 30_000,
    }

    expect(getPositionDecision(previous, next, 15, 2, 2)).toEqual({
      accepted: true,
      reason: 'accepted',
    })
  })

  it('accepts faster movement when the active GPS preset allows it', () => {
    const fastButAllowed = {
      latitude: 46.503,
      longitude: 11,
      accuracy: 5,
      timestamp: previous.timestamp + 30_000,
    }

    expect(getPositionDecision(previous, fastButAllowed, 15, 2, 2, 12)).toEqual({
      accepted: true,
      reason: 'accepted',
    })
  })
})
