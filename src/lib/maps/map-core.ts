import type * as GeoJSON from 'geojson'
import type { SurveyArea, TrackPoint } from '@/types/domain'

export type GpsState = 'idle' | 'requesting' | 'tracking' | 'unsupported' | 'denied' | 'error'

export type PositionDecision =
  | { accepted: true; reason: 'initial' | 'accepted' }
  | { accepted: false; reason: 'accuracy' | 'time' | 'distance' }

type PositionSample = {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

export const emptyFeatureCollection: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
}

export function formatAccuracy(accuracy: number | null | undefined) {
  if (typeof accuracy !== 'number' || !Number.isFinite(accuracy)) return 'unbekannt'
  return `${Math.round(accuracy)} m`
}

export function formatArea(areaM2: number) {
  if (!Number.isFinite(areaM2) || areaM2 <= 0) return '0 m² · 0,00 ha'
  return `${Math.round(areaM2)} m² · ${(areaM2 / 10_000).toFixed(2)} ha`
}

export function formatTimestamp(timestamp: number) {
  return new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(timestamp)
}

export function haversineDistanceM(
  from: Pick<PositionSample, 'latitude' | 'longitude'>,
  to: Pick<PositionSample, 'latitude' | 'longitude'>
) {
  const earthRadiusM = 6_371_000
  const toRadians = (value: number) => (value * Math.PI) / 180

  const dLat = toRadians(to.latitude - from.latitude)
  const dLon = toRadians(to.longitude - from.longitude)
  const lat1 = toRadians(from.latitude)
  const lat2 = toRadians(to.latitude)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusM * c
}

export function getPositionDecision(
  previousPosition: PositionSample | null,
  nextPosition: PositionSample,
  gpsAccuracyThresholdM: number,
  gpsMinTimeS: number,
  gpsMinDistanceM: number
): PositionDecision {
  if (nextPosition.accuracy > gpsAccuracyThresholdM) {
    return { accepted: false, reason: 'accuracy' }
  }

  if (!previousPosition) {
    return { accepted: true, reason: 'initial' }
  }

  const timeDiffS = (nextPosition.timestamp - previousPosition.timestamp) / 1000
  if (timeDiffS < gpsMinTimeS) {
    return { accepted: false, reason: 'time' }
  }

  const distanceM = haversineDistanceM(previousPosition, nextPosition)
  if (distanceM < gpsMinDistanceM) {
    return { accepted: false, reason: 'distance' }
  }

  return { accepted: true, reason: 'accepted' }
}

export function buildSurveyAreaFeatureCollection(
  surveyAreas: SurveyArea[]
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: surveyAreas.map((surveyArea) => ({
      type: 'Feature',
      geometry: surveyArea.geometry,
      properties: {
        id: surveyArea.id,
        name: surveyArea.name,
        areaHa: surveyArea.areaHa,
        areaM2: surveyArea.areaM2,
      },
    })),
  }
}

export function getBoundsFromTrackpoints(trackpoints: TrackPoint[]) {
  if (trackpoints.length === 0) return null

  let minLon = trackpoints[0].lon
  let minLat = trackpoints[0].lat
  let maxLon = trackpoints[0].lon
  let maxLat = trackpoints[0].lat

  for (const point of trackpoints) {
    minLon = Math.min(minLon, point.lon)
    minLat = Math.min(minLat, point.lat)
    maxLon = Math.max(maxLon, point.lon)
    maxLat = Math.max(maxLat, point.lat)
  }

  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ] as [[number, number], [number, number]]
}

export function getBoundsFromSurveyAreaGeometry(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  const firstPoint = polygons[0]?.[0]?.[0]
  if (!firstPoint) return null

  let minLon = firstPoint[0]
  let minLat = firstPoint[1]
  let maxLon = firstPoint[0]
  let maxLat = firstPoint[1]

  for (const polygonCoordinates of polygons) {
    for (const ring of polygonCoordinates) {
      for (const [lon, lat] of ring) {
        minLon = Math.min(minLon, lon)
        minLat = Math.min(minLat, lat)
        maxLon = Math.max(maxLon, lon)
        maxLat = Math.max(maxLat, lat)
      }
    }
  }

  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ] as [[number, number], [number, number]]
}
