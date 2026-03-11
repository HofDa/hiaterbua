import type * as GeoJSON from 'geojson'
import { emptyFeatureCollection } from '@/lib/maps/map-core'
import type { DraftPoint, WalkPoint } from '@/lib/maps/live-position-map-helper-types'
import type { Enclosure, TrackPoint } from '@/types/domain'

export function buildDraftFeatureCollection(points: DraftPoint[]): GeoJSON.FeatureCollection {
  if (points.length === 0) {
    return emptyFeatureCollection
  }

  const pointFeatures: GeoJSON.Feature<GeoJSON.Point>[] = points.map((point, index) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [point.lon, point.lat],
    },
    properties: {
      index: index + 1,
    },
  }))

  const features: GeoJSON.Feature[] = [...pointFeatures]

  if (points.length >= 2) {
    features.unshift({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: points.map((point) => [point.lon, point.lat]),
      },
      properties: {
        kind: 'draft-line',
      },
    })
  }

  if (points.length >= 3) {
    const ring = points.map((point) => [point.lon, point.lat])
    ring.push([points[0].lon, points[0].lat])

    features.unshift({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [ring],
      },
      properties: {
        kind: 'draft-polygon',
      },
    })
  }

  return {
    type: 'FeatureCollection',
    features,
  }
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

export function buildWalkFeatureCollection(points: WalkPoint[]): GeoJSON.FeatureCollection {
  if (points.length === 0) {
    return emptyFeatureCollection
  }

  const pointFeatures: GeoJSON.Feature<GeoJSON.Point>[] = points.map((point, index) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [point.longitude, point.latitude],
    },
    properties: {
      index: index + 1,
    },
  }))

  const features: GeoJSON.Feature[] = [...pointFeatures]

  if (points.length >= 2) {
    features.unshift({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: points.map((point) => [point.longitude, point.latitude]),
      },
      properties: {
        kind: 'walk-line',
      },
    })
  }

  if (points.length >= 3) {
    const ring = points.map((point) => [point.longitude, point.latitude])
    ring.push([points[0].longitude, points[0].latitude])

    features.unshift({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [ring],
      },
      properties: {
        kind: 'walk-polygon',
      },
    })
  }

  return {
    type: 'FeatureCollection',
    features,
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

export function buildTrackpointsFeatureCollection(trackpoints: TrackPoint[]): GeoJSON.FeatureCollection {
  if (trackpoints.length === 0) {
    return emptyFeatureCollection
  }

  const sorted = [...trackpoints].sort((left, right) => left.seq - right.seq)

  const pointFeatures: GeoJSON.Feature<GeoJSON.Point>[] = sorted.map((point, index) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [point.lon, point.lat],
    },
    properties: {
      index: index + 1,
    },
  }))

  const features: GeoJSON.Feature[] = [...pointFeatures]

  if (sorted.length >= 2) {
    features.unshift({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: sorted.map((point) => [point.lon, point.lat]),
      },
      properties: {
        kind: 'stored-walk-line',
      },
    })
  }

  return {
    type: 'FeatureCollection',
    features,
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
