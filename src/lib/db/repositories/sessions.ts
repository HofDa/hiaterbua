import { assertUpdated } from '@/lib/db/assert-updated'
import { db } from '@/lib/db/dexie'
import {
  buildSessionMetrics,
  buildTrackpointMetricDelta,
  getDurationSeconds,
  buildTrackpointsFromEditableTrackpoints,
  logSessionEvent,
  type EditableTrackPoint,
} from '@/lib/maps/grazing-session-map-helpers'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type { GpsTrackPosition } from '@/lib/maps/position-types'
import type {
  GrazingSession,
  SessionEvent,
  SessionEventType,
  TrackPoint,
} from '@/types/domain'

type PositionData = GpsTrackPosition

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Every grazing session — for counts, backup and export. */
export function listAllSessions(): Promise<GrazingSession[]> {
  return db.sessions.toArray()
}

/** Grazing sessions, most recently updated first. */
export function listSessionsByRecent(): Promise<GrazingSession[]> {
  return db.sessions.orderBy('updatedAt').reverse().toArray()
}

/** A session's trackpoints in recorded order. */
export function listSessionTrackpoints(sessionId: string): Promise<TrackPoint[]> {
  return db.trackpoints.where('sessionId').equals(sessionId).sortBy('seq')
}

/** A session's events in chronological (oldest-first) order. */
export function listSessionEvents(sessionId: string): Promise<SessionEvent[]> {
  return db.events.where('sessionId').equals(sessionId).sortBy('timestamp')
}

/** Every session event — for backup and export. */
export function listAllSessionEvents(): Promise<SessionEvent[]> {
  return db.events.toArray()
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function appendSessionTrackpoint(params: {
  sessionId: string
  lastTimestamp: number | null
  nextSeq: number
  nextPosition: PositionData
  previousTrackPoint: TrackPoint | null
  trackpointCount: number
  startTime: string
}) {
  const {
    sessionId,
    lastTimestamp,
    nextSeq,
    nextPosition,
    previousTrackPoint,
    trackpointCount,
    startTime,
  } = params

  if (lastTimestamp === nextPosition.timestamp) {
    return null
  }

  const trackPoint: TrackPoint = {
    id: createId('trackpoint'),
    sessionId,
    enclosureWalkId: null,
    seq: nextSeq,
    timestamp: new Date(nextPosition.timestamp).toISOString(),
    lat: nextPosition.latitude,
    lon: nextPosition.longitude,
    accuracyM: nextPosition.accuracy,
    speedMps: nextPosition.speed,
    headingDeg: nextPosition.heading,
    accepted: true,
  }

  const metricDelta = buildTrackpointMetricDelta(previousTrackPoint, trackPoint)
  const updatedAt = nowIso()

  await db.transaction('rw', db.trackpoints, db.sessions, async () => {
    const session = await db.sessions.get(sessionId)
    assertUpdated(session ? 1 : 0, 'Weidegang wurde nicht gefunden.')

    const distanceM = (session?.distanceM ?? 0) + metricDelta.distanceM
    const movingTimeS = (session?.movingTimeS ?? 0) + metricDelta.movingTimeS
    const avgAccuracyM = appendAverageAccuracy(
      session?.avgAccuracyM ?? null,
      trackpointCount,
      trackPoint.accuracyM
    )

    await db.trackpoints.add(trackPoint)
    const updatedCount = await db.sessions.update(sessionId, {
      durationS: getDurationSeconds(startTime, updatedAt),
      movingTimeS,
      distanceM,
      avgSpeedMps: movingTimeS > 0 ? distanceM / movingTimeS : null,
      avgAccuracyM,
      updatedAt,
    })

    assertUpdated(updatedCount, 'Weidegang wurde nicht gefunden.')
  })

  return {
    trackPoint,
    nextSeq,
    lastTimestamp: nextPosition.timestamp,
  }
}

function appendAverageAccuracy(
  previousAverage: number | null | undefined,
  previousPointCount: number,
  nextAccuracy: number | null | undefined
) {
  if (typeof nextAccuracy !== 'number') {
    return previousAverage ?? null
  }

  if (typeof previousAverage !== 'number' || previousPointCount <= 0) {
    return nextAccuracy
  }

  return (previousAverage * previousPointCount + nextAccuracy) / (previousPointCount + 1)
}

export async function createGrazingSessionRecord(params: {
  herdId: string
  animalCount: number | null
  notes: string
  position: PositionData | null
}) {
  const { herdId, animalCount, notes, position } = params
  const timestamp = nowIso()

  const session: GrazingSession = {
    id: createId('session'),
    herdId,
    animalCount,
    status: 'active',
    startTime: timestamp,
    endTime: null,
    durationS: 0,
    movingTimeS: 0,
    distanceM: 0,
    avgSpeedMps: null,
    avgAccuracyM: null,
    notes: notes.trim() || undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await db.transaction('rw', db.sessions, db.events, async () => {
    await db.sessions.add(session)
    await logSessionEvent(session.id, 'start', position)
  })

  return session
}

export async function updateGrazingSessionAnimalCountRecord(params: {
  sessionId: string
  animalCount: number
}) {
  const { sessionId, animalCount } = params

  await db.sessions.update(sessionId, {
    animalCount,
    updatedAt: nowIso(),
  })
}

export async function pauseGrazingSessionRecord(params: {
  sessionId: string
  startTime: string
  trackpoints: TrackPoint[]
  position: PositionData | null
}) {
  const { sessionId, startTime, trackpoints, position } = params
  const metrics = buildSessionMetrics(trackpoints, startTime)

  await db.transaction('rw', db.sessions, db.events, async () => {
    const updatedCount = await db.sessions.update(sessionId, {
      status: 'paused',
      durationS: metrics.durationS,
      movingTimeS: metrics.movingTimeS,
      distanceM: metrics.distanceM,
      avgSpeedMps: metrics.avgSpeedMps,
      avgAccuracyM: metrics.avgAccuracyM,
      updatedAt: nowIso(),
    })

    assertUpdated(updatedCount, 'Weidegang wurde nicht gefunden.')

    await logSessionEvent(sessionId, 'pause', position)
  })
}

export async function resumeGrazingSessionRecord(params: {
  sessionId: string
  position: PositionData | null
}) {
  const { sessionId, position } = params

  await db.transaction('rw', db.sessions, db.events, async () => {
    const updatedCount = await db.sessions.update(sessionId, {
      status: 'active',
      updatedAt: nowIso(),
    })

    assertUpdated(updatedCount, 'Weidegang wurde nicht gefunden.')

    await logSessionEvent(sessionId, 'resume', position)
  })
}

export async function stopGrazingSessionRecord(params: {
  sessionId: string
  startTime: string
  trackpoints: TrackPoint[]
  position: PositionData | null
}) {
  const { sessionId, startTime, trackpoints, position } = params
  const endTime = nowIso()
  const metrics = buildSessionMetrics(trackpoints, startTime, endTime)

  await db.transaction('rw', db.sessions, db.events, async () => {
    const updatedCount = await db.sessions.update(sessionId, {
      status: 'finished',
      endTime,
      durationS: metrics.durationS,
      movingTimeS: metrics.movingTimeS,
      distanceM: metrics.distanceM,
      avgSpeedMps: metrics.avgSpeedMps,
      avgAccuracyM: metrics.avgAccuracyM,
      updatedAt: endTime,
    })

    assertUpdated(updatedCount, 'Weidegang wurde nicht gefunden.')

    await logSessionEvent(sessionId, 'stop', position)
  })
}

export async function addGrazingSessionEventRecord(params: {
  sessionId: string
  type: SessionEventType
  position: PositionData | null
  comment?: string
}) {
  const { sessionId, type, position, comment } = params
  await logSessionEvent(sessionId, type, position, comment?.trim())
}

export async function saveEditedGrazingSessionRecord(params: {
  sessionId: string
  editTrackpoints: EditableTrackPoint[]
  editedStartTime: string
  editedEndTime: string | null
  existingTrackpoints: TrackPoint[]
}) {
  const {
    sessionId,
    editTrackpoints,
    editedStartTime,
    editedEndTime,
    existingTrackpoints,
  } = params
  const nextTrackpoints = buildTrackpointsFromEditableTrackpoints(
    editTrackpoints,
    sessionId,
    existingTrackpoints
  )

  const metrics = buildSessionMetrics(nextTrackpoints, editedStartTime, editedEndTime)

  await db.transaction('rw', db.trackpoints, db.sessions, db.events, async () => {
    const sessionEvents = await db.events.where('sessionId').equals(sessionId).sortBy('timestamp')
    const startEvent = sessionEvents.find((sessionEvent) => sessionEvent.type === 'start')
    const stopEvent = [...sessionEvents]
      .reverse()
      .find((sessionEvent) => sessionEvent.type === 'stop')

    await db.trackpoints.where('sessionId').equals(sessionId).delete()
    await db.trackpoints.bulkAdd(nextTrackpoints)
    await db.sessions.update(sessionId, {
      startTime: editedStartTime,
      endTime: editedEndTime,
      durationS: metrics.durationS,
      movingTimeS: metrics.movingTimeS,
      distanceM: metrics.distanceM,
      avgSpeedMps: metrics.avgSpeedMps,
      avgAccuracyM: metrics.avgAccuracyM,
      updatedAt: nowIso(),
    })

    if (startEvent) {
      await db.events.update(startEvent.id, {
        timestamp: editedStartTime,
      })
    }

    if (stopEvent && editedEndTime) {
      await db.events.update(stopEvent.id, {
        timestamp: editedEndTime,
      })
    }
  })
}

export async function deleteGrazingSessionRecord(sessionId: string) {
  await db.transaction('rw', [db.sessions, db.trackpoints, db.events], async () => {
    await db.trackpoints.where('sessionId').equals(sessionId).delete()
    await db.events.where('sessionId').equals(sessionId).delete()
    await db.sessions.delete(sessionId)
  })
}
