import { area, polygon } from '@turf/turf'
import type * as GeoJSON from 'geojson'
import { emptyFeatureCollection, formatTimestamp } from '@/lib/maps/map-core'
import { nowIso } from '@/lib/utils/time'
import type {
  Animal,
  Enclosure,
  EnclosureAssignment,
  Herd,
  TrackPoint,
} from '@/types/domain'

export type DraftPoint = {
  lat: number
  lon: number
}

type WalkPoint = {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

export type WalkTrackSummary = {
  count: number
  avgAccuracyM: number | null
  firstTimestamp: string | null
  lastTimestamp: string | null
}

export type EnclosureListFilter = 'all' | 'active' | 'unused' | 'most-used'

export type EnclosureStats = {
  totalAssignments: number
  totalDurationS: number
  averageCount: number | null
  lastEndTime: string | null
  uniqueHerdsCount: number
}

export type FilteredEnclosureItem = {
  enclosure: Enclosure
  stats: EnclosureStats | undefined
  activeAssignment: EnclosureAssignment | undefined
}

export function formatPointTimestamp(timestamp: number) {
  return formatTimestamp(timestamp)
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return 'unbekannt'
  return new Date(value).toLocaleString('de-DE')
}

export function formatDate(value: string | null | undefined) {
  if (!value) return 'unbekannt'
  return new Date(value).toLocaleDateString('de-DE')
}

export function formatDurationFromIso(startTime: string | null | undefined, endTime?: string | null) {
  if (!startTime) return 'unbekannt'

  const startMs = new Date(startTime).getTime()
  const endMs = new Date(endTime ?? nowIso()).getTime()

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return 'unbekannt'
  }

  const totalMinutes = Math.round((endMs - startMs) / 1000 / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours <= 0) return `${minutes} min`
  return `${hours} h ${String(minutes).padStart(2, '0')} min`
}

export function getDurationSecondsFromIso(
  startTime: string | null | undefined,
  endTime?: string | null
) {
  if (!startTime) return 0

  const startMs = new Date(startTime).getTime()
  const endMs = new Date(endTime ?? nowIso()).getTime()

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return 0
  }

  return Math.max(0, Math.round((endMs - startMs) / 1000))
}

export function formatDurationSeconds(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds))
  const totalMinutes = Math.round(safeSeconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours <= 0) return `${minutes} min`
  return `${hours} h ${String(minutes).padStart(2, '0')} min`
}

export function getEffectiveHerdCount(herd: Herd | undefined, animals: Animal[]) {
  const activeAnimalsCount = animals.filter((animal) => !animal.isArchived).length
  if (activeAnimalsCount > 0) return activeAnimalsCount
  return herd?.fallbackCount ?? null
}

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

export function buildHerdsById(herds: Herd[]) {
  return new Map(herds.map((herd) => [herd.id, herd]))
}

export function buildAnimalsByHerdId(animals: Animal[]) {
  const map = new Map<string, Animal[]>()

  animals.forEach((animal) => {
    const currentAnimals = map.get(animal.herdId) ?? []
    currentAnimals.push(animal)
    map.set(animal.herdId, currentAnimals)
  })

  return map
}

export function buildActiveAssignmentsByEnclosureId(assignments: EnclosureAssignment[]) {
  const map = new Map<string, EnclosureAssignment>()

  assignments.forEach((assignment) => {
    if (!assignment.endTime && !map.has(assignment.enclosureId)) {
      map.set(assignment.enclosureId, assignment)
    }
  })

  return map
}

export function buildAssignmentHistoryByEnclosureId(assignments: EnclosureAssignment[]) {
  const map = new Map<string, EnclosureAssignment[]>()

  assignments.forEach((assignment) => {
    const currentAssignments = map.get(assignment.enclosureId) ?? []
    currentAssignments.push(assignment)
    map.set(assignment.enclosureId, currentAssignments)
  })

  return map
}

export function buildEnclosureStatsById(
  enclosures: Enclosure[],
  assignmentHistoryByEnclosureId: Map<string, EnclosureAssignment[]>,
  herdsById: Map<string, Herd>,
  animalsByHerdId: Map<string, Animal[]>
) {
  const map = new Map<string, EnclosureStats>()

  enclosures.forEach((enclosure) => {
    const history = assignmentHistoryByEnclosureId.get(enclosure.id) ?? []
    const totalDurationS = history.reduce(
      (sum, assignment) => sum + getDurationSecondsFromIso(assignment.startTime, assignment.endTime),
      0
    )

    const counts = history
      .map((assignment) => {
        if (typeof assignment.count === 'number') return assignment.count

        const herd = herdsById.get(assignment.herdId)
        return getEffectiveHerdCount(herd, animalsByHerdId.get(assignment.herdId) ?? [])
      })
      .filter((count): count is number => typeof count === 'number')

    const uniqueHerdsCount = new Set(history.map((assignment) => assignment.herdId)).size

    map.set(enclosure.id, {
      totalAssignments: history.length,
      totalDurationS,
      averageCount:
        counts.length > 0
          ? Math.round(counts.reduce((sum, count) => sum + count, 0) / counts.length)
          : null,
      lastEndTime:
        history
          .map((assignment) => assignment.endTime ?? assignment.startTime ?? null)
          .filter((value): value is string => Boolean(value))
          .sort()
          .at(-1) ?? null,
      uniqueHerdsCount,
    })
  })

  return map
}

export function buildFilteredEnclosures(
  enclosures: Enclosure[],
  activeAssignmentsByEnclosureId: Map<string, EnclosureAssignment>,
  enclosureStatsById: Map<string, EnclosureStats>,
  filter: EnclosureListFilter
): FilteredEnclosureItem[] {
  const withMeta = enclosures.map((enclosure) => ({
    enclosure,
    stats: enclosureStatsById.get(enclosure.id),
    activeAssignment: activeAssignmentsByEnclosureId.get(enclosure.id),
  }))

  switch (filter) {
    case 'active':
      return withMeta
        .filter((item) => Boolean(item.activeAssignment))
        .sort((left, right) => right.enclosure.updatedAt.localeCompare(left.enclosure.updatedAt))
    case 'unused':
      return withMeta
        .filter((item) => (item.stats?.totalAssignments ?? 0) === 0)
        .sort((left, right) => left.enclosure.name.localeCompare(right.enclosure.name, 'de'))
    case 'most-used':
      return withMeta.sort((left, right) => {
        const assignmentsDiff =
          (right.stats?.totalAssignments ?? 0) - (left.stats?.totalAssignments ?? 0)
        if (assignmentsDiff !== 0) return assignmentsDiff

        const durationDiff = (right.stats?.totalDurationS ?? 0) - (left.stats?.totalDurationS ?? 0)
        if (durationDiff !== 0) return durationDiff

        return left.enclosure.name.localeCompare(right.enclosure.name, 'de')
      })
    case 'all':
    default:
      return withMeta.sort((left, right) =>
        right.enclosure.updatedAt.localeCompare(left.enclosure.updatedAt)
      )
  }
}
