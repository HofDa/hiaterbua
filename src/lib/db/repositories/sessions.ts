import Dexie from 'dexie'
import { assertUpdated } from '@/lib/db/assert-updated'
import {
  assertGrazingSessionTransition,
  OpenGrazingSessionExistsError,
} from '@/lib/domain/grazing-session-rules'
import { db } from '@/lib/db/dexie'
import {
  buildSessionMetrics,
  buildTrackpointMetricDelta,
  getDurationSeconds,
  buildTrackpointsFromEditableTrackpoints,
  logSessionEvent,
  type EditableTrackPoint,
} from '@/lib/maps/grazing-session-map-helpers'
import { buildLocalChangeMetadata, buildLocalChangePatch } from '@/lib/sync/local-metadata'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type { GpsTrackPosition } from '@/lib/maps/position-types'
import type {
  GrazingSession,
  SessionEvent,
  SessionEventType,
  SessionStatus,
  TrackPoint,
} from '@/types/domain'

type PositionData = GpsTrackPosition

export const SESSION_NOT_FOUND_MESSAGE = 'Weidegang wurde nicht gefunden.'

/**
 * Thrown when a trackpoint is offered to a session that is not recording. The
 * queued point cannot belong to that session, so the recorder must stop
 * retrying it rather than blocking every later point behind it.
 */
export class SessionNotRecordingError extends Error {
  readonly sessionId: string
  readonly status: SessionStatus

  constructor(sessionId: string, status: SessionStatus) {
    super(`Weidegang ${sessionId} zeichnet nicht auf (Status: ${status}).`)
    this.name = 'SessionNotRecordingError'
    this.sessionId = sessionId
    this.status = status
  }
}

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

/** A single grazing session, or `undefined` when it does not exist. */
export function getGrazingSession(sessionId: string): Promise<GrazingSession | undefined> {
  return db.sessions.get(sessionId)
}

/** Grazing sessions that are still running or paused — the recovery candidates. */
export function listUnfinishedSessions(): Promise<GrazingSession[]> {
  return db.sessions.where('status').anyOf('active', 'paused').toArray()
}

/** The trackpoints recorded while walking an enclosure boundary, in walk order. */
export function listEnclosureWalkTrackpoints(enclosureWalkId: string): Promise<TrackPoint[]> {
  return db.trackpoints.where('enclosureWalkId').equals(enclosureWalkId).sortBy('seq')
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Appends one accepted GPS fix to a session.
 *
 * The session must still be `active`: a point that arrives after pause or stop
 * belongs to no recording, and writing it would silently extend a session the
 * user has already ended. The check lives inside the transaction so it cannot
 * race the lifecycle transition, which takes the same session recording lock.
 *
 * `startTime` is read from the stored session rather than passed in — the caller
 * holds it in React refs that can be stale or, worse, absent (the previous
 * `?? nowIso()` fallback silently reset `durationS` to 0).
 */
export async function appendSessionTrackpoint(params: {
  sessionId: string
  lastTimestamp: number | null
  nextPosition: PositionData
}) {
  const { sessionId, lastTimestamp, nextPosition } = params

  if (lastTimestamp === nextPosition.timestamp) {
    return null
  }

  const updatedAt = nowIso()

  const trackPoint = await db.transaction('rw', db.trackpoints, db.sessions, async () => {
    const session = await db.sessions.get(sessionId)

    if (!session) {
      throw new Error(SESSION_NOT_FOUND_MESSAGE)
    }

    if (session.status !== 'active') {
      throw new SessionNotRecordingError(sessionId, session.status)
    }

    const startTime = session.startTime

    const previousTrackPoint = await db.trackpoints
      .where('[sessionId+seq]')
      .between([sessionId, Dexie.minKey], [sessionId, Dexie.maxKey])
      .last()

    if (
      previousTrackPoint &&
      new Date(previousTrackPoint.timestamp).getTime() >= nextPosition.timestamp
    ) {
      return null
    }

    const nextSeq = (previousTrackPoint?.seq ?? 0) + 1
    const nextTrackPoint: TrackPoint = {
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
      createdAt: updatedAt,
      updatedAt,
      ...buildLocalChangeMetadata(updatedAt),
    }
    const metricDelta = buildTrackpointMetricDelta(previousTrackPoint ?? null, nextTrackPoint)
    const distanceM = session.distanceM + metricDelta.distanceM
    const movingTimeS = session.movingTimeS + metricDelta.movingTimeS
    const avgAccuracyM = appendAverageAccuracy(
      session.avgAccuracyM ?? null,
      // Seq is contiguous: appends assign max(seq)+1 and session edits renumber points.
      previousTrackPoint?.seq ?? 0,
      nextTrackPoint.accuracyM
    )

    await db.trackpoints.add(nextTrackPoint)
    const updatedCount = await db.sessions.update(sessionId, {
      durationS: getDurationSeconds(startTime, updatedAt),
      movingTimeS,
      distanceM,
      avgSpeedMps: movingTimeS > 0 ? distanceM / movingTimeS : null,
      avgAccuracyM,
      updatedAt,
      ...buildLocalChangePatch(updatedAt),
    })

    assertUpdated(updatedCount, SESSION_NOT_FOUND_MESSAGE)

    return nextTrackPoint
  })

  if (!trackPoint) {
    return null
  }

  return {
    trackPoint,
    nextSeq: trackPoint.seq,
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
    ...buildLocalChangeMetadata(timestamp),
  }

  await db.transaction('rw', db.sessions, db.events, async () => {
    const existingOpenSession = await db.sessions
      .where('status')
      .anyOf('active', 'paused')
      .first()

    if (existingOpenSession) {
      throw new OpenGrazingSessionExistsError(existingOpenSession.id)
    }

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
  const timestamp = nowIso()

  await db.sessions.update(sessionId, {
    animalCount,
    updatedAt: timestamp,
    ...buildLocalChangePatch(timestamp),
  })
}

/**
 * Loads and validates a session for a lifecycle transition. Lifecycle commands
 * are strict except for repeated stop: only stop is intentionally idempotent.
 * Keeping the guard in the repository means UI state can never be the sole
 * authority for a persisted status change.
 */
async function loadSessionForTransition(
  sessionId: string,
  targetStatus: SessionStatus,
  options: { allowAlreadyFinished?: boolean } = {}
): Promise<GrazingSession | null> {
  const session = await db.sessions.get(sessionId)

  if (!session) {
    throw new Error(SESSION_NOT_FOUND_MESSAGE)
  }

  if (
    options.allowAlreadyFinished &&
    session.status === 'finished' &&
    targetStatus === 'finished'
  ) {
    return null
  }

  assertGrazingSessionTransition({
    sessionId,
    from: session.status,
    to: targetStatus,
  })

  return session
}

async function assertNoOtherOpenGrazingSession(sessionId: string) {
  const openSessions = await db.sessions
    .where('status')
    .anyOf('active', 'paused')
    .toArray()
  const conflictingSession = openSessions.find((session) => session.id !== sessionId)

  if (conflictingSession) {
    throw new OpenGrazingSessionExistsError(conflictingSession.id)
  }
}

/**
 * Recomputes a session's metrics from the trackpoints actually in IndexedDB.
 *
 * IndexedDB is the source of truth: React refs can lag behind a just-flushed
 * point, and a metric computed from a stale ref would permanently understate the
 * recorded distance. Callers must hold the session recording lock so no append
 * can interleave between the read here and the status write.
 */
async function buildPersistedSessionMetrics(
  session: GrazingSession,
  effectiveEndTime: string
) {
  const trackpoints = await db.trackpoints.where('sessionId').equals(session.id).toArray()
  return buildSessionMetrics(trackpoints, session.startTime, effectiveEndTime)
}

export async function pauseGrazingSessionRecord(params: {
  sessionId: string
  position: PositionData | null
}) {
  const { sessionId, position } = params
  const timestamp = nowIso()

  await db.transaction('rw', db.sessions, db.trackpoints, db.events, async () => {
    const session = await loadSessionForTransition(sessionId, 'paused')
    if (!session) return

    const metrics = await buildPersistedSessionMetrics(session, timestamp)

    const updatedCount = await db.sessions.update(sessionId, {
      status: 'paused',
      durationS: metrics.durationS,
      movingTimeS: metrics.movingTimeS,
      distanceM: metrics.distanceM,
      avgSpeedMps: metrics.avgSpeedMps,
      avgAccuracyM: metrics.avgAccuracyM,
      updatedAt: timestamp,
      ...buildLocalChangePatch(timestamp),
    })

    assertUpdated(updatedCount, SESSION_NOT_FOUND_MESSAGE)

    await logSessionEvent(sessionId, 'pause', position)
  })
}

export async function resumeGrazingSessionRecord(params: {
  sessionId: string
  position: PositionData | null
}) {
  const { sessionId, position } = params
  const timestamp = nowIso()

  await db.transaction('rw', db.sessions, db.trackpoints, db.events, async () => {
    const session = await loadSessionForTransition(sessionId, 'active')
    if (!session) return

    await assertNoOtherOpenGrazingSession(sessionId)

    const updatedCount = await db.sessions.update(sessionId, {
      status: 'active',
      updatedAt: timestamp,
      ...buildLocalChangePatch(timestamp),
    })

    assertUpdated(updatedCount, SESSION_NOT_FOUND_MESSAGE)

    await logSessionEvent(sessionId, 'resume', position)
  })
}

export async function stopGrazingSessionRecord(params: {
  sessionId: string
  position: PositionData | null
}) {
  const { sessionId, position } = params
  const endTime = nowIso()

  await db.transaction('rw', db.sessions, db.trackpoints, db.events, async () => {
    const session = await loadSessionForTransition(sessionId, 'finished', {
      allowAlreadyFinished: true,
    })
    if (!session) return

    const metrics = await buildPersistedSessionMetrics(session, endTime)

    const updatedCount = await db.sessions.update(sessionId, {
      status: 'finished',
      endTime,
      durationS: metrics.durationS,
      movingTimeS: metrics.movingTimeS,
      distanceM: metrics.distanceM,
      avgSpeedMps: metrics.avgSpeedMps,
      avgAccuracyM: metrics.avgAccuracyM,
      updatedAt: endTime,
      ...buildLocalChangePatch(endTime),
    })

    assertUpdated(updatedCount, SESSION_NOT_FOUND_MESSAGE)

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
  const timestamp = nowIso()
  const nextTrackpoints = buildTrackpointsFromEditableTrackpoints(
    editTrackpoints,
    sessionId,
    existingTrackpoints
  ).map((trackpoint) => ({
    ...trackpoint,
    createdAt: trackpoint.timestamp,
    updatedAt: timestamp,
    ...buildLocalChangeMetadata(timestamp),
  }))

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
      updatedAt: timestamp,
      ...buildLocalChangePatch(timestamp),
    })

    if (startEvent) {
      await db.events.update(startEvent.id, {
        timestamp: editedStartTime,
        updatedAt: timestamp,
        ...buildLocalChangePatch(timestamp),
      })
    }

    if (stopEvent && editedEndTime) {
      await db.events.update(stopEvent.id, {
        timestamp: editedEndTime,
        updatedAt: timestamp,
        ...buildLocalChangePatch(timestamp),
      })
    }
  })
}

export async function deleteGrazingSessionRecord(sessionId: string) {
  await db.transaction('rw', [db.sessions, db.trackpoints, db.events, db.careMonitoringChecks], async () => {
    const historicalCheck = await db.careMonitoringChecks
      .where('grazingSessionId')
      .equals(sessionId)
      .first()

    if (historicalCheck) {
      throw new Error('Weidegang ist mit einem gespeicherten Pflegecheck verknüpft und kann nicht gelöscht werden.')
    }

    await db.trackpoints.where('sessionId').equals(sessionId).delete()
    await db.events.where('sessionId').equals(sessionId).delete()
    await db.sessions.delete(sessionId)
  })
}
