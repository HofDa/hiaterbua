import { db } from '@/lib/db/dexie'
import {
  buildSessionMetrics,
  buildTrackpointsFromEditableTrackpoints,
  logSessionEvent,
  type EditableTrackPoint,
} from '@/lib/maps/grazing-session-map-helpers'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type { GrazingSession, SessionEventType, TrackPoint } from '@/types/domain'

type PositionData = {
  latitude: number
  longitude: number
  accuracy: number
  speed: number | null
  heading: number | null
  timestamp: number
}

export async function appendSessionTrackpoint(params: {
  sessionId: string
  lastTimestamp: number | null
  nextSeq: number
  nextPosition: PositionData
  currentTrackpoints: TrackPoint[]
  startTime: string
}) {
  const { sessionId, lastTimestamp, nextSeq, nextPosition, currentTrackpoints, startTime } =
    params

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

  await db.trackpoints.add(trackPoint)

  const nextTrackpoints = [...currentTrackpoints, trackPoint]
  const metrics = buildSessionMetrics(nextTrackpoints, startTime)

  await db.sessions.update(sessionId, {
    durationS: metrics.durationS,
    movingTimeS: metrics.movingTimeS,
    distanceM: metrics.distanceM,
    avgSpeedMps: metrics.avgSpeedMps,
    avgAccuracyM: metrics.avgAccuracyM,
    updatedAt: nowIso(),
  })

  return {
    trackPoint,
    nextTrackpoints,
    nextSeq,
    lastTimestamp: nextPosition.timestamp,
  }
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

  await db.sessions.add(session)
  await logSessionEvent(session.id, 'start', position)
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

  await db.sessions.update(sessionId, {
    status: 'paused',
    durationS: metrics.durationS,
    movingTimeS: metrics.movingTimeS,
    distanceM: metrics.distanceM,
    avgSpeedMps: metrics.avgSpeedMps,
    avgAccuracyM: metrics.avgAccuracyM,
    updatedAt: nowIso(),
  })

  await logSessionEvent(sessionId, 'pause', position)
}

export async function resumeGrazingSessionRecord(params: {
  sessionId: string
  position: PositionData | null
}) {
  const { sessionId, position } = params

  await db.sessions.update(sessionId, {
    status: 'active',
    updatedAt: nowIso(),
  })

  await logSessionEvent(sessionId, 'resume', position)
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

  await db.sessions.update(sessionId, {
    status: 'finished',
    endTime,
    durationS: metrics.durationS,
    movingTimeS: metrics.movingTimeS,
    distanceM: metrics.distanceM,
    avgSpeedMps: metrics.avgSpeedMps,
    avgAccuracyM: metrics.avgAccuracyM,
    updatedAt: endTime,
  })

  await logSessionEvent(sessionId, 'stop', position)
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
