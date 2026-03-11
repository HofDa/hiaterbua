import type * as GeoJSON from 'geojson'
import { emptyFeatureCollection } from '@/lib/maps/map-core'
import {
  getSessionEventLabel,
} from '@/lib/maps/grazing-session-map-formatters'
import type {
  EditableTrackPoint,
  SessionEvent,
  TrackPoint,
} from '@/lib/maps/grazing-session-map-helper-types'

export function buildTrackpointsFeatureCollection(
  trackpoints: TrackPoint[]
): GeoJSON.FeatureCollection {
  if (trackpoints.length === 0) {
    return emptyFeatureCollection
  }

  const sorted = [...trackpoints].sort((left, right) => left.seq - right.seq)

  const pointFeatures: GeoJSON.Feature<GeoJSON.Point>[] = sorted.map((point) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [point.lon, point.lat],
    },
    properties: {
      seq: point.seq,
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
        kind: 'session-line',
      },
    })
  }

  return {
    type: 'FeatureCollection',
    features,
  }
}

export function buildSessionEventFeatureCollection(
  sessionEvents: SessionEvent[]
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: sessionEvents
      .filter(
        (sessionEvent): sessionEvent is SessionEvent & { lat: number; lon: number } =>
          typeof sessionEvent.lat === 'number' && typeof sessionEvent.lon === 'number'
      )
      .map((sessionEvent) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [sessionEvent.lon, sessionEvent.lat],
        },
        properties: {
          id: sessionEvent.id,
          type: sessionEvent.type,
          label: getSessionEventLabel(sessionEvent.type),
          timestamp: sessionEvent.timestamp,
          comment: sessionEvent.comment ?? null,
        },
      })),
  }
}

export function buildEditableTrackpointsFeatureCollection(
  trackpoints: EditableTrackPoint[]
): GeoJSON.FeatureCollection {
  if (trackpoints.length === 0) {
    return emptyFeatureCollection
  }

  const pointFeatures: GeoJSON.Feature<GeoJSON.Point>[] = trackpoints.map((point, index) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [point.lon, point.lat],
    },
    properties: {
      seq: index + 1,
    },
  }))

  const features: GeoJSON.Feature[] = [...pointFeatures]

  if (trackpoints.length >= 2) {
    features.unshift({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: trackpoints.map((point) => [point.lon, point.lat]),
      },
      properties: {
        kind: 'session-line',
      },
    })
  }

  return {
    type: 'FeatureCollection',
    features,
  }
}

export function buildMergedSessionEventFeatureCollection(
  currentSessionEvents: SessionEvent[],
  selectedSessionEvents: SessionEvent[]
) {
  const mergedEvents = new Map<string, SessionEvent>()

  ;[...currentSessionEvents, ...selectedSessionEvents].forEach((sessionEvent) => {
    mergedEvents.set(sessionEvent.id, sessionEvent)
  })

  return buildSessionEventFeatureCollection(Array.from(mergedEvents.values()))
}
