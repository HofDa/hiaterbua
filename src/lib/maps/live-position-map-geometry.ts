import { area, polygon } from '@turf/turf'
import type * as GeoJSON from 'geojson'
import type {
  DraftPoint,
  WalkPoint,
  WalkTrackSummary,
} from '@/lib/maps/live-position-map-helper-types'
import type { TrackPoint } from '@/types/domain'

export function getDraftPolygon(points: DraftPoint[]) {
  if (points.length < 3) return null

  const coordinates = points.map((point) => [point.lon, point.lat] as [number, number])
  coordinates.push([points[0].lon, points[0].lat])

  return polygon([coordinates])
}

export function getPolygonAreaM2(points: DraftPoint[]) {
  const draftPolygon = getDraftPolygon(points)
  return draftPolygon ? area(draftPolygon) : 0
}

export function getWalkAreaM2(points: WalkPoint[]) {
  if (points.length < 3) return 0

  const coordinates = points.map(
    (point) => [point.longitude, point.latitude] as [number, number]
  )
  coordinates.push([points[0].longitude, points[0].latitude])

  return area(polygon([coordinates]))
}

export function getBoundsFromPolygon(geometry: GeoJSON.Polygon) {
  const allPoints = geometry.coordinates[0]
  if (allPoints.length === 0) return null

  let minLon = allPoints[0][0]
  let minLat = allPoints[0][1]
  let maxLon = allPoints[0][0]
  let maxLat = allPoints[0][1]

  for (const [lon, lat] of allPoints) {
    minLon = Math.min(minLon, lon)
    minLat = Math.min(minLat, lat)
    maxLon = Math.max(maxLon, lon)
    maxLat = Math.max(maxLat, lat)
  }

  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ] as [[number, number], [number, number]]
}

export function getWalkTrackSummary(trackpoints: TrackPoint[]): WalkTrackSummary {
  if (trackpoints.length === 0) {
    return {
      count: 0,
      avgAccuracyM: null,
      firstTimestamp: null,
      lastTimestamp: null,
    }
  }

  const sorted = [...trackpoints].sort((left, right) => left.seq - right.seq)
  const accuracies = sorted
    .map((point) => point.accuracyM)
    .filter((accuracy): accuracy is number => typeof accuracy === 'number')

  return {
    count: sorted.length,
    avgAccuracyM:
      accuracies.length > 0
        ? accuracies.reduce((sum, accuracy) => sum + accuracy, 0) / accuracies.length
        : null,
    firstTimestamp: sorted[0]?.timestamp ?? null,
    lastTimestamp: sorted[sorted.length - 1]?.timestamp ?? null,
  }
}

export function getBoundsFromWalkPoints(points: WalkPoint[]) {
  if (points.length === 0) return null

  let minLon = points[0].longitude
  let minLat = points[0].latitude
  let maxLon = points[0].longitude
  let maxLat = points[0].latitude

  for (const point of points) {
    minLon = Math.min(minLon, point.longitude)
    minLat = Math.min(minLat, point.latitude)
    maxLon = Math.max(maxLon, point.longitude)
    maxLat = Math.max(maxLat, point.latitude)
  }

  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ] as [[number, number], [number, number]]
}
