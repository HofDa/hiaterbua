import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatSince } from './live-position-map-formatters'

describe('formatSince', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-13T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats whole days', () => {
    expect(formatSince('2026-07-10T11:30:00.000Z')).toBe('seit 3 Tagen')
    expect(formatSince('2026-07-12T12:00:00.000Z')).toBe('seit 1 Tag')
  })

  it('formats whole hours below one day', () => {
    expect(formatSince('2026-07-13T06:15:00.000Z')).toBe('seit 5 Std.')
  })

  it('formats minutes below one hour', () => {
    expect(formatSince('2026-07-13T11:39:30.000Z')).toBe('seit 20 min')
  })

  it('rejects missing, invalid, and future timestamps', () => {
    expect(formatSince(null)).toBeNull()
    expect(formatSince('not-a-date')).toBeNull()
    expect(formatSince('2026-07-13T12:00:01.000Z')).toBeNull()
  })
})
