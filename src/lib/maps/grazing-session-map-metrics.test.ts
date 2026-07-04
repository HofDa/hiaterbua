import { describe, expect, it } from 'vitest'
import type * as GeoJSON from 'geojson'
import { buildTrackpointsFeatureCollection } from '@/lib/maps/grazing-session-map-feature-collections'
import { buildSessionMetrics } from '@/lib/maps/grazing-session-map-metrics'
import type { TrackPoint } from '@/types/domain'

function trackPoint(seq: number, timestamp: string, lat: number): TrackPoint {
  return {
    id: `trackpoint_${seq}`,
    sessionId: 'session_1',
    enclosureWalkId: null,
    seq,
    timestamp,
    lat,
    lon: 11,
    accuracyM: 5,
    speedMps: null,
    headingDeg: null,
    accepted: true,
  }
}

describe('buildSessionMetrics', () => {
  it('excludes long GPS gaps from moving time and distance', () => {
    const points = [
      trackPoint(1, '2026-06-01T08:00:00.000Z', 46.5),
      trackPoint(2, '2026-06-01T08:00:30.000Z', 46.5001),
      trackPoint(3, '2026-06-01T08:40:30.000Z', 46.501),
    ]

    const metrics = buildSessionMetrics(
      points,
      '2026-06-01T08:00:00.000Z',
      '2026-06-01T08:45:00.000Z'
    )

    expect(metrics.durationS).toBe(2700)
    expect(metrics.movingTimeS).toBe(30)
    expect(metrics.distanceM).toBeGreaterThan(10)
    expect(metrics.distanceM).toBeLessThan(12)
  })
})

describe('buildTrackpointsFeatureCollection', () => {
  it('splits the rendered line across long GPS gaps', () => {
    const points = [
      trackPoint(1, '2026-06-01T08:00:00.000Z', 46.5),
      trackPoint(2, '2026-06-01T08:00:30.000Z', 46.5001),
      trackPoint(3, '2026-06-01T08:10:30.000Z', 46.501),
      trackPoint(4, '2026-06-01T08:11:00.000Z', 46.5011),
    ]

    const featureCollection = buildTrackpointsFeatureCollection(points)
    const lineFeatures = featureCollection.features.filter(
      (feature): feature is GeoJSON.Feature<GeoJSON.LineString> =>
        feature.geometry.type === 'LineString'
    )

    expect(lineFeatures).toHaveLength(2)
    expect(lineFeatures.map((feature) => feature.geometry.coordinates)).toEqual([
      [
        [11, 46.5],
        [11, 46.5001],
      ],
      [
        [11, 46.501],
        [11, 46.5011],
      ],
    ])
  })
})
