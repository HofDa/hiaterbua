import { describe, expect, it } from 'vitest'
import { formatDecimal, pluralize } from '@/lib/utils/format'

describe('format', () => {
  it('formats German decimals and thousands', () => {
    expect(formatDecimal(0.875, 2)).toBe('0,88')
    expect(formatDecimal(8800)).toBe('8.800')
  })

  it('pluralizes German nouns', () => {
    expect(pluralize(1, 'Punkt', 'Punkte')).toBe('1 Punkt')
    expect(pluralize(0, 'Punkt', 'Punkte')).toBe('0 Punkte')
    expect(pluralize(12, 'Tier', 'Tiere')).toBe('12 Tiere')
  })
})
