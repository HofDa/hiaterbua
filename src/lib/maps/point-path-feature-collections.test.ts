import { describe, expect, it } from 'vitest'
import type * as GeoJSON from 'geojson'
import { buildPointPathFeatureCollection } from '@/lib/maps/map-core'
import { buildEditableTrackpointsFeatureCollection } from '@/lib/maps/grazing-session-map-feature-collections'
import {
  buildDraftFeatureCollection,
  buildTrackpointsFeatureCollection,
  buildWalkFeatureCollection,
} from '@/lib/maps/live-position-map-feature-collections'
import type { TrackPoint } from '@/types/domain'

const lonLat = (point: { lon: number; lat: number }): GeoJSON.Position => [point.lon, point.lat]

function geometryTypes(collection: GeoJSON.FeatureCollection) {
  return collection.features.map((feature) => feature.geometry.type)
}

function trackPoint(seq: number, lon: number, lat: number): TrackPoint {
  return {
    id: `tp-${seq}`,
    seq,
    lon,
    lat,
    timestamp: new Date(1_700_000_000_000 + seq * 1000).toISOString(),
    accepted: true,
  }
}

describe('buildPointPathFeatureCollection', () => {
  it('returns an empty collection for no points', () => {
    const collection = buildPointPathFeatureCollection({
      points: [] as Array<{ lon: number; lat: number }>,
      toCoordinates: lonLat,
      lineKind: 'line',
      polygonKind: 'polygon',
    })

    expect(collection.features).toHaveLength(0)
  })

  it('emits only numbered points below two points', () => {
    const collection = buildPointPathFeatureCollection({
      points: [{ lon: 11, lat: 46 }],
      toCoordinates: lonLat,
      lineKind: 'line',
      polygonKind: 'polygon',
    })

    expect(geometryTypes(collection)).toEqual(['Point'])
    expect(collection.features[0].properties).toEqual({ index: 1 })
  })

  it('adds the connecting line at two points, beneath the points', () => {
    const collection = buildPointPathFeatureCollection({
      points: [
        { lon: 11, lat: 46 },
        { lon: 11.1, lat: 46.1 },
      ],
      toCoordinates: lonLat,
      lineKind: 'line',
      polygonKind: 'polygon',
    })

    expect(geometryTypes(collection)).toEqual(['LineString', 'Point', 'Point'])
    expect(collection.features[0].properties).toEqual({ kind: 'line' })
  })

  it('closes the ring at three points and paints the polygon lowest', () => {
    const collection = buildPointPathFeatureCollection({
      points: [
        { lon: 11, lat: 46 },
        { lon: 11.1, lat: 46 },
        { lon: 11.1, lat: 46.1 },
      ],
      toCoordinates: lonLat,
      lineKind: 'line',
      polygonKind: 'polygon',
    })

    expect(geometryTypes(collection)).toEqual(['Polygon', 'LineString', 'Point', 'Point', 'Point'])

    const ring = (collection.features[0].geometry as GeoJSON.Polygon).coordinates[0]
    expect(ring).toHaveLength(4)
    expect(ring[0]).toEqual(ring[3])
  })

  it('leaves the path open when no polygon kind is given', () => {
    const collection = buildPointPathFeatureCollection({
      points: [
        { lon: 11, lat: 46 },
        { lon: 11.1, lat: 46 },
        { lon: 11.1, lat: 46.1 },
      ],
      toCoordinates: lonLat,
      lineKind: 'line',
    })

    expect(geometryTypes(collection)).not.toContain('Polygon')
  })
})

describe('enclosure map feature collections', () => {
  it('closes a drawn draft and labels it as a draft', () => {
    const collection = buildDraftFeatureCollection([
      { lon: 11, lat: 46 },
      { lon: 11.1, lat: 46 },
      { lon: 11.1, lat: 46.1 },
    ])

    expect(collection.features[0].properties).toEqual({ kind: 'draft-polygon' })
    expect(collection.features[1].properties).toEqual({ kind: 'draft-line' })
  })

  it('reads walk points from their longitude/latitude fields', () => {
    const collection = buildWalkFeatureCollection([
      { longitude: 11, latitude: 46, accuracy: 5, timestamp: 1 },
      { longitude: 11.1, latitude: 46.1, accuracy: 5, timestamp: 2 },
    ])

    const [line] = collection.features
    expect(line.properties).toEqual({ kind: 'walk-line' })
    expect((line.geometry as GeoJSON.LineString).coordinates).toEqual([
      [11, 46],
      [11.1, 46.1],
    ])
  })

  it('sorts a stored walk by seq and leaves it open', () => {
    const collection = buildTrackpointsFeatureCollection([
      trackPoint(2, 11.1, 46.1),
      trackPoint(1, 11, 46),
    ])

    expect(geometryTypes(collection)).toEqual(['LineString', 'Point', 'Point'])
    expect((collection.features[0].geometry as GeoJSON.LineString).coordinates).toEqual([
      [11, 46],
      [11.1, 46.1],
    ])
  })
})

describe('grazing map editable trackpoints', () => {
  // The `selected-session-track` click handler maps a tapped point back to its
  // array index through this property; renaming it silently breaks editing.
  it('numbers points under `seq`, one-based', () => {
    const editablePoint = (lon: number, lat: number) => ({
      lon,
      lat,
      timestamp: '2024-06-01T10:00:00.000Z',
      accuracyM: null,
      speedMps: null,
      headingDeg: null,
    })

    const collection = buildEditableTrackpointsFeatureCollection([
      editablePoint(11, 46),
      editablePoint(11.1, 46.1),
    ])

    const points = collection.features.filter((feature) => feature.geometry.type === 'Point')
    expect(points.map((feature) => feature.properties)).toEqual([{ seq: 1 }, { seq: 2 }])
  })
})
