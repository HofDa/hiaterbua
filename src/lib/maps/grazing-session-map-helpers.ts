import type * as GeoJSON from 'geojson'
import { db } from '@/lib/db/dexie'
import { emptyFeatureCollection, haversineDistanceM } from '@/lib/maps/map-core'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type {
  GrazingSession,
  SessionEvent,
  SessionEventType,
  TrackPoint,
} from '@/types/domain'

type PositionData = {
  latitude: number
  longitude: number
  speed: number | null
  heading: number | null
  timestamp: number
}

export type EditableTrackPoint = {
  lat: number
  lon: number
  timestamp: string
  accuracyM: number | null
  speedMps: number | null
  headingDeg: number | null
}

export type SessionMetrics = {
  durationS: number
  movingTimeS: number
  distanceM: number
  avgSpeedMps: number | null
  avgAccuracyM: number | null
}

export type SessionHistoryStats = {
  totalSessions: number
  finishedSessions: number
  totalDistanceM: number
  totalDurationS: number
  uniqueHerds: number
}

export type GroupedSessionHistory = {
  dayKey: string
  label: string
  sessions: GrazingSession[]
}

export function formatDistance(distanceM: number) {
  if (!Number.isFinite(distanceM) || distanceM <= 0) return '0 m'
  if (distanceM >= 1000) return `${(distanceM / 1000).toFixed(2)} km`
  return `${Math.round(distanceM)} m`
}

export function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':')
}

export function formatDateTime(timestamp: string) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

export function formatDateLabel(timestamp: string) {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(timestamp))
}

export function getSessionEventLabel(type: SessionEventType) {
  switch (type) {
    case 'water':
      return 'Wasser'
    case 'rest':
      return 'Rast'
    case 'move':
      return 'Bewegung'
    case 'disturbance':
      return 'Störung'
    case 'note':
      return 'Notiz'
    case 'start':
      return 'Start'
    case 'pause':
      return 'Pause'
    case 'resume':
      return 'Fortsetzen'
    case 'stop':
      return 'Ende'
    default:
      return type
  }
}

export function buildTrackpointsFeatureCollection(trackpoints: TrackPoint[]): GeoJSON.FeatureCollection {
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

export function buildSessionMetrics(
  trackpoints: TrackPoint[],
  startTime: string,
  endTime?: string | null
): SessionMetrics {
  const sorted = [...trackpoints].sort((left, right) => left.seq - right.seq)
  const sessionEnd = endTime ?? nowIso()
  const durationS = Math.max(
    0,
    Math.round((new Date(sessionEnd).getTime() - new Date(startTime).getTime()) / 1000)
  )

  if (sorted.length === 0) {
    return {
      durationS,
      movingTimeS: 0,
      distanceM: 0,
      avgSpeedMps: null,
      avgAccuracyM: null,
    }
  }

  let distanceM = 0
  let movingTimeS = 0

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1]
    const current = sorted[index]
    const segmentDistance = haversineDistanceM(
      { latitude: previous.lat, longitude: previous.lon },
      { latitude: current.lat, longitude: current.lon }
    )
    const timeDiffS = Math.max(
      0,
      Math.round(
        (new Date(current.timestamp).getTime() - new Date(previous.timestamp).getTime()) / 1000
      )
    )

    distanceM += segmentDistance
    movingTimeS += timeDiffS
  }

  const accuracies = sorted
    .map((point) => point.accuracyM)
    .filter((accuracy): accuracy is number => typeof accuracy === 'number')

  return {
    durationS,
    movingTimeS,
    distanceM,
    avgSpeedMps: movingTimeS > 0 ? distanceM / movingTimeS : null,
    avgAccuracyM:
      accuracies.length > 0
        ? accuracies.reduce((sum, accuracy) => sum + accuracy, 0) / accuracies.length
        : null,
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

export function buildSessionHistoryStats(sessions: GrazingSession[]): SessionHistoryStats {
  const finishedSessions = sessions.filter((session) => session.status === 'finished')
  const totalDistanceM = finishedSessions.reduce((sum, session) => sum + session.distanceM, 0)
  const totalDurationS = finishedSessions.reduce((sum, session) => sum + session.durationS, 0)
  const uniqueHerds = new Set(finishedSessions.map((session) => session.herdId)).size

  return {
    totalSessions: sessions.length,
    finishedSessions: finishedSessions.length,
    totalDistanceM,
    totalDurationS,
    uniqueHerds,
  }
}

export function groupSessionHistoryByDay(sessions: GrazingSession[]): GroupedSessionHistory[] {
  const groups = new Map<string, { label: string; sessions: GrazingSession[] }>()

  sessions.forEach((session) => {
    const dayKey = session.startTime.slice(0, 10)
    const current = groups.get(dayKey)

    if (current) {
      current.sessions.push(session)
      return
    }

    groups.set(dayKey, {
      label: formatDateLabel(session.startTime),
      sessions: [session],
    })
  })

  return Array.from(groups.entries()).map(([dayKey, group]) => ({
    dayKey,
    label: group.label,
    sessions: group.sessions,
  }))
}

export function buildTrackpointsFromEditableTrackpoints(
  trackpoints: EditableTrackPoint[],
  sessionId: string,
  existingTrackpoints: TrackPoint[] = []
) {
  return trackpoints.map((point, index) => ({
    id: existingTrackpoints[index]?.id ?? createId('trackpoint'),
    sessionId,
    enclosureWalkId: null,
    seq: index + 1,
    timestamp: point.timestamp,
    lat: point.lat,
    lon: point.lon,
    accuracyM: point.accuracyM,
    speedMps: point.speedMps,
    headingDeg: point.headingDeg,
    accepted: true,
  }))
}

export async function logSessionEvent(
  sessionId: string,
  type: SessionEventType,
  position: PositionData | null,
  comment?: string
) {
  const event: SessionEvent = {
    id: createId('event'),
    sessionId,
    timestamp: nowIso(),
    type,
    lat: position?.latitude ?? null,
    lon: position?.longitude ?? null,
    comment,
  }

  await db.events.add(event)
}
