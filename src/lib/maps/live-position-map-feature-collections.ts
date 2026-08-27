import type * as GeoJSON from 'geojson'
import { buildPointPathFeatureCollection, emptyFeatureCollection } from '@/lib/maps/map-core'
import type { DraftPoint, WalkPoint } from '@/lib/maps/live-position-map-helper-types'
import type { Enclosure, TrackPoint } from '@/types/domain'

const fromLonLat = (point: { lon: number; lat: number }): GeoJSON.Position => [
  point.lon,
  point.lat,
]

const fromLongitudeLatitude = (point: {
  longitude: number
  latitude: number
}): GeoJSON.Position => [point.longitude, point.latitude]

/** The enclosure currently being drawn by tapping the map. */
export function buildDraftFeatureCollection(points: DraftPoint[]): GeoJSON.FeatureCollection {
  return buildPointPathFeatureCollection({
    points,
    toCoordinates: fromLonLat,
    lineKind: 'draft-line',
    polygonKind: 'draft-polygon',
  })
}

/** The enclosure currently being walked, one point per accepted GPS fix. */
export function buildWalkFeatureCollection(points: WalkPoint[]): GeoJSON.FeatureCollection {
  return buildPointPathFeatureCollection({
    points,
    toCoordinates: fromLongitudeLatitude,
    lineKind: 'walk-line',
    polygonKind: 'walk-polygon',
  })
}

/**
 * The stored walk of a saved enclosure. Left open — the enclosure's own polygon
 * already shows the enclosed area, so closing the track would double the outline.
 */
export function buildTrackpointsFeatureCollection(
  trackpoints: TrackPoint[]
): GeoJSON.FeatureCollection {
  return buildPointPathFeatureCollection({
    points: [...trackpoints].sort((left, right) => left.seq - right.seq),
    toCoordinates: fromLonLat,
    lineKind: 'stored-walk-line',
  })
}

export function buildSavedFeatureCollection(enclosures: Enclosure[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: enclosures
      .filter(
        (enclosure): enclosure is Enclosure & { geometry: GeoJSON.Polygon } =>
          enclosure.geometry !== null
      )
      .map((enclosure) => ({
        type: 'Feature',
        geometry: enclosure.geometry,
        properties: {
          id: enclosure.id,
          name: enclosure.name,
          areaHa: enclosure.areaHa,
          areaM2: enclosure.areaM2,
        },
      })),
  }
}

export function buildSelectedFeatureCollection(
  enclosure: Enclosure | null
): GeoJSON.FeatureCollection {
  if (!enclosure?.geometry) {
    return emptyFeatureCollection
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: enclosure.geometry,
        properties: {
          id: enclosure.id,
          name: enclosure.name,
        },
      },
    ],
  }
}

export function buildSelectedWalkPointFeatureCollection(
  point: Pick<WalkPoint, 'latitude' | 'longitude'> | null,
  index: number | null
): GeoJSON.FeatureCollection {
  if (!point || index === null) {
    return emptyFeatureCollection
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [point.longitude, point.latitude],
        },
        properties: {
          index: index + 1,
        },
      },
    ],
  }
}
