import { describe, expect, test } from 'vitest'
import { normalizeMapBaseLayer } from './defaults'

describe('normalizeMapBaseLayer', () => {
  test('passes through the supported base layers unchanged', () => {
    expect(normalizeMapBaseLayer('south-tyrol-basemap')).toBe('south-tyrol-basemap')
    expect(normalizeMapBaseLayer('south-tyrol-orthophoto-2023')).toBe(
      'south-tyrol-orthophoto-2023',
    )
  })

  test('migrates legacy orthophoto identifiers to the current one', () => {
    expect(normalizeMapBaseLayer('bozen-ortho')).toBe('south-tyrol-orthophoto-2023')
    expect(normalizeMapBaseLayer('ortho')).toBe('south-tyrol-orthophoto-2023')
  })

  test('falls back to the basemap for unknown or missing values', () => {
    expect(normalizeMapBaseLayer('something-else')).toBe('south-tyrol-basemap')
    expect(normalizeMapBaseLayer('')).toBe('south-tyrol-basemap')
    expect(normalizeMapBaseLayer(null)).toBe('south-tyrol-basemap')
    expect(normalizeMapBaseLayer(undefined)).toBe('south-tyrol-basemap')
  })
})
