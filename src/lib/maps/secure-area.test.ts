import { describe, expect, it } from 'vitest'
import {
  MAX_PREFETCH_TILES,
  buildSecureAreaPrefetchUrls,
} from '@/lib/maps/tile-cache'

// A point in South Tyrol (where the app's tile layers cover).
const LAT = 46.5
const LON = 11.0

describe('buildSecureAreaPrefetchUrls', () => {
  it('produces a non-empty, bounded tile set for a single layer', () => {
    const urls = buildSecureAreaPrefetchUrls(['south-tyrol-basemap'], LAT, LON)

    expect(urls.length).toBeGreaterThan(0)
    expect(urls.length).toBeLessThanOrEqual(MAX_PREFETCH_TILES)
  })

  it('scales linearly with the number of layers and stays bounded', () => {
    const single = buildSecureAreaPrefetchUrls(['south-tyrol-basemap'], LAT, LON)
    const both = buildSecureAreaPrefetchUrls(
      ['south-tyrol-basemap', 'south-tyrol-orthophoto-2023'],
      LAT,
      LON,
    )

    expect(both.length).toBe(single.length * 2)
    expect(both.length).toBeLessThanOrEqual(MAX_PREFETCH_TILES)
  })

  it('returns distinct tile URLs', () => {
    const urls = buildSecureAreaPrefetchUrls(['south-tyrol-basemap'], LAT, LON)

    expect(new Set(urls).size).toBe(urls.length)
  })
})
