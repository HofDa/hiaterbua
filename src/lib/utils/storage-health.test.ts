import { describe, expect, it } from 'vitest'
import {
  formatStorageBytes,
  formatStorageRatioPercent,
  getStorageHealthLevel,
  isQuotaExceededError,
  STORAGE_WARNING_RATIO,
} from '@/lib/utils/storage-health'

describe('formatStorageBytes', () => {
  it('formats plain byte counts without decimals', () => {
    expect(formatStorageBytes(0)).toBe('0 B')
    expect(formatStorageBytes(512)).toBe('512 B')
    expect(formatStorageBytes(999)).toBe('999 B')
  })

  it('scales to KB/MB/GB/TB with a German decimal comma', () => {
    expect(formatStorageBytes(1_500)).toBe('1,5 KB')
    expect(formatStorageBytes(234_500_000)).toBe('234,5 MB')
    expect(formatStorageBytes(2_000_000_000)).toBe('2,0 GB')
    expect(formatStorageBytes(1_250_000_000_000)).toBe('1,3 TB')
  })

  it('never uses a decimal point', () => {
    for (const bytes of [1_234, 56_789_012, 3_456_789_012_345]) {
      expect(formatStorageBytes(bytes)).not.toContain('.')
    }
  })

  it('degrades invalid input to zero instead of throwing', () => {
    expect(formatStorageBytes(Number.NaN)).toBe('0 B')
    expect(formatStorageBytes(-5)).toBe('0 B')
    expect(formatStorageBytes(Number.POSITIVE_INFINITY)).toBe('0 B')
  })
})

describe('formatStorageRatioPercent', () => {
  it('rounds to whole percent with a space before the sign', () => {
    expect(formatStorageRatioPercent(0)).toBe('0 %')
    expect(formatStorageRatioPercent(0.0615)).toBe('6 %')
    expect(formatStorageRatioPercent(0.899)).toBe('90 %')
  })

  it('clamps to 0..100 and tolerates invalid input', () => {
    expect(formatStorageRatioPercent(1.5)).toBe('100 %')
    expect(formatStorageRatioPercent(-0.2)).toBe('0 %')
    expect(formatStorageRatioPercent(Number.NaN)).toBe('0 %')
  })
})

describe('getStorageHealthLevel', () => {
  it('stays ok below the warning ratio', () => {
    expect(getStorageHealthLevel(0)).toBe('ok')
    expect(getStorageHealthLevel(0.5)).toBe('ok')
    expect(getStorageHealthLevel(STORAGE_WARNING_RATIO - 0.001)).toBe('ok')
  })

  it('switches to warning at the shared recording threshold', () => {
    expect(getStorageHealthLevel(STORAGE_WARNING_RATIO)).toBe('warning')
    expect(getStorageHealthLevel(0.95)).toBe('warning')
    expect(getStorageHealthLevel(1)).toBe('warning')
  })

  it('treats invalid ratios as ok instead of alarming falsely', () => {
    expect(getStorageHealthLevel(Number.NaN)).toBe('ok')
  })
})

describe('isQuotaExceededError', () => {
  it('detects quota errors directly and via Dexie inner errors', () => {
    expect(isQuotaExceededError({ name: 'QuotaExceededError' })).toBe(true)
    expect(isQuotaExceededError({ inner: { name: 'QuotaExceededError' } })).toBe(true)
    expect(isQuotaExceededError({ name: 'AbortError' })).toBe(false)
    expect(isQuotaExceededError(null)).toBe(false)
  })
})
