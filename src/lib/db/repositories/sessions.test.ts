import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/lib/db/dexie'
import {
  InvalidSessionTransitionError,
  OpenGrazingSessionExistsError,
} from '@/lib/domain/grazing-session-rules'
import {
  appendSessionTrackpoint,
  SessionNotRecordingError,
  createGrazingSessionRecord,
  deleteGrazingSessionRecord,
  listSessionEvents,
  listSessionTrackpoints,
  pauseGrazingSessionRecord,
  resumeGrazingSessionRecord,
  saveEditedGrazingSessionRecord,
  stopGrazingSessionRecord,
} from '@/lib/db/repositories/sessions'
import type { GpsTrackPosition } from '@/lib/maps/position-types'

function position(overrides: Partial<GpsTrackPosition> = {}): GpsTrackPosition {
  return {
    latitude: 46.5,
    longitude: 11.0,
    accuracy: 5,
    timestamp: Date.parse('2026-06-01T08:00:00.000Z'),
    speed: null,
    heading: null,
    ...overrides,
  }
}

async function clearAllTables() {
  await Promise.all(db.tables.map((table) => table.clear()))
}

beforeEach(async () => {
  await clearAllTables()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createGrazingSessionRecord', () => {
  it('creates an active session and logs a start event in one transaction', async () => {
    const session = await createGrazingSessionRecord({
      herdId: 'herd_1',
      animalCount: 12,
      notes: '  Frischer Start  ',
      position: position(),
    })

    const stored = await db.sessions.get(session.id)
    expect(stored?.status).toBe('active')
    expect(stored?.endTime).toBeNull()
    expect(stored?.notes).toBe('Frischer Start')

    const events = await listSessionEvents(session.id)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('start')
  })
})


describe('single open grazing session invariant', () => {
  it('rejects a second session while another session is active', async () => {
    const first = await createGrazingSessionRecord({
      herdId: 'herd_1',
      animalCount: null,
      notes: '',
      position: null,
    })

    await expect(
      createGrazingSessionRecord({
        herdId: 'herd_2',
        animalCount: null,
        notes: '',
        position: null,
      })
    ).rejects.toMatchObject({
      name: 'OpenGrazingSessionExistsError',
      existingSessionId: first.id,
    })

    expect(await db.sessions.where('status').anyOf('active', 'paused').count()).toBe(1)
    expect(await db.events.where('type').equals('start').count()).toBe(1)
  })

  it('rejects a second session while another session is paused', async () => {
    const first = await createGrazingSessionRecord({
      herdId: 'herd_1',
      animalCount: null,
      notes: '',
      position: null,
    })
    await pauseGrazingSessionRecord({ sessionId: first.id, position: null })

    await expect(
      createGrazingSessionRecord({
        herdId: 'herd_2',
        animalCount: null,
        notes: '',
        position: null,
      })
    ).rejects.toBeInstanceOf(OpenGrazingSessionExistsError)

    expect(await db.sessions.where('status').anyOf('active', 'paused').count()).toBe(1)
  })

  it('serializes concurrent starts so exactly one succeeds', async () => {
    const results = await Promise.allSettled([
      createGrazingSessionRecord({
        herdId: 'herd_a',
        animalCount: null,
        notes: '',
        position: null,
      }),
      createGrazingSessionRecord({
        herdId: 'herd_b',
        animalCount: null,
        notes: '',
        position: null,
      }),
    ])

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
    expect(await db.sessions.where('status').anyOf('active', 'paused').count()).toBe(1)
    expect(await db.events.where('type').equals('start').count()).toBe(1)

    const rejected = results.find((result) => result.status === 'rejected')
    expect(rejected).toMatchObject({
      status: 'rejected',
      reason: expect.any(OpenGrazingSessionExistsError),
    })
  })

  it('rejects resume when another open session exists in legacy data', async () => {
    const paused = await createGrazingSessionRecord({
      herdId: 'herd_1',
      animalCount: null,
      notes: '',
      position: null,
    })
    await pauseGrazingSessionRecord({ sessionId: paused.id, position: null })

    const timestamp = new Date().toISOString()
    await db.sessions.add({
      ...paused,
      id: 'session_legacy_conflict',
      herdId: 'herd_2',
      status: 'active',
      startTime: timestamp,
      endTime: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })

    await expect(
      resumeGrazingSessionRecord({ sessionId: paused.id, position: null })
    ).rejects.toBeInstanceOf(OpenGrazingSessionExistsError)

    expect((await db.sessions.get(paused.id))?.status).toBe('paused')
    expect((await listSessionEvents(paused.id)).filter((event) => event.type === 'resume')).toHaveLength(0)
  })
})

describe('appendSessionTrackpoint', () => {
  it('appends points and recomputes the session distance', async () => {
    const session = await createGrazingSessionRecord({
      herdId: 'herd_1',
      animalCount: null,
      notes: '',
      position: null,
    })

    const first = await appendSessionTrackpoint({
      sessionId: session.id,
      lastTimestamp: null,
      nextPosition: position({ timestamp: Date.parse('2026-06-01T08:00:00.000Z') }),
    })
    expect(first).not.toBeNull()

    const second = await appendSessionTrackpoint({
      sessionId: session.id,
      lastTimestamp: first!.lastTimestamp,
      nextPosition: position({
        latitude: 46.51,
        longitude: 11.01,
        timestamp: Date.parse('2026-06-01T08:00:30.000Z'),
      }),
    })
    expect(second).not.toBeNull()

    const stored = await listSessionTrackpoints(session.id)
    expect(stored).toHaveLength(2)
    expect(stored.map((point) => point.seq)).toEqual([1, 2])

    const updated = await db.sessions.get(session.id)
    expect(updated?.distanceM).toBeGreaterThan(0)
  })

  it('derives seq and duplicate checks from stored trackpoints inside the transaction', async () => {
    const session = await createGrazingSessionRecord({
      herdId: 'herd_1',
      animalCount: null,
      notes: '',
      position: null,
    })
    const firstTimestamp = Date.parse('2026-06-01T08:00:00.000Z')

    const first = await appendSessionTrackpoint({
      sessionId: session.id,
      lastTimestamp: null,
      nextPosition: position({ timestamp: firstTimestamp }),
    })
    expect(first?.nextSeq).toBe(1)

    const duplicateFromStaleTab = await appendSessionTrackpoint({
      sessionId: session.id,
      lastTimestamp: null,
      nextPosition: position({ timestamp: firstTimestamp }),
    })
    expect(duplicateFromStaleTab).toBeNull()

    const second = await appendSessionTrackpoint({
      sessionId: session.id,
      lastTimestamp: null,
      nextPosition: position({
        latitude: 46.51,
        longitude: 11.01,
        timestamp: Date.parse('2026-06-01T08:00:30.000Z'),
      }),
    })
    expect(second?.nextSeq).toBe(2)

    const stored = await listSessionTrackpoints(session.id)
    expect(stored.map((point) => point.seq)).toEqual([1, 2])
  })

  it('ignores a fix with the same timestamp as the previous one', async () => {
    const session = await createGrazingSessionRecord({
      herdId: 'herd_1',
      animalCount: null,
      notes: '',
      position: null,
    })
    const sameTimestamp = Date.parse('2026-06-01T08:00:00.000Z')

    const result = await appendSessionTrackpoint({
      sessionId: session.id,
      lastTimestamp: sameTimestamp,
      nextPosition: position({ timestamp: sameTimestamp }),
    })

    expect(result).toBeNull()
    expect(await listSessionTrackpoints(session.id)).toHaveLength(0)
  })
})

describe('session lifecycle transitions', () => {
  it('records pause, resume and stop with matching status and events', async () => {
    const session = await createGrazingSessionRecord({
      herdId: 'herd_1',
      animalCount: null,
      notes: '',
      position: null,
    })

    await pauseGrazingSessionRecord({ sessionId: session.id, position: null })
    expect((await db.sessions.get(session.id))?.status).toBe('paused')

    await resumeGrazingSessionRecord({ sessionId: session.id, position: null })
    expect((await db.sessions.get(session.id))?.status).toBe('active')

    await stopGrazingSessionRecord({ sessionId: session.id, position: null })
    const stopped = await db.sessions.get(session.id)
    expect(stopped?.status).toBe('finished')
    expect(stopped?.endTime).toBeTruthy()

    const eventTypes = (await listSessionEvents(session.id)).map((event) => event.type)
    expect(eventTypes).toEqual(['start', 'pause', 'resume', 'stop'])
  })
})

describe('assertUpdated guard', () => {
  it('rejects a write against a missing session and persists nothing', async () => {
    await expect(
      pauseGrazingSessionRecord({ sessionId: 'does_not_exist', position: null }),
    ).rejects.toThrow('Weidegang wurde nicht gefunden.')

    expect(await db.events.where('sessionId').equals('does_not_exist').count()).toBe(0)
    expect(await db.sessions.get('does_not_exist')).toBeUndefined()
  })
})

describe('saveEditedGrazingSessionRecord', () => {
  it('replaces trackpoints and shifts the start/stop event timestamps', async () => {
    const session = await createGrazingSessionRecord({
      herdId: 'herd_1',
      animalCount: null,
      notes: '',
      position: position(),
    })
    await stopGrazingSessionRecord({ sessionId: session.id, position: position() })

    const editedStartTime = '2026-06-01T07:00:00.000Z'
    const editedEndTime = '2026-06-01T10:00:00.000Z'

    await saveEditedGrazingSessionRecord({
      sessionId: session.id,
      editTrackpoints: [
        {
          lat: 46.5,
          lon: 11.0,
          timestamp: editedStartTime,
          accuracyM: 5,
          speedMps: null,
          headingDeg: null,
        },
        {
          lat: 46.52,
          lon: 11.02,
          timestamp: editedEndTime,
          accuracyM: 5,
          speedMps: null,
          headingDeg: null,
        },
      ],
      editedStartTime,
      editedEndTime,
      existingTrackpoints: [],
    })

    const stored = await db.sessions.get(session.id)
    expect(stored?.startTime).toBe(editedStartTime)
    expect(stored?.endTime).toBe(editedEndTime)
    expect(await listSessionTrackpoints(session.id)).toHaveLength(2)

    const events = await listSessionEvents(session.id)
    const start = events.find((event) => event.type === 'start')
    const stop = events.find((event) => event.type === 'stop')
    expect(start?.timestamp).toBe(editedStartTime)
    expect(stop?.timestamp).toBe(editedEndTime)
  })
})

describe('deleteGrazingSessionRecord', () => {
  it('removes the session together with its trackpoints and events', async () => {
    const session = await createGrazingSessionRecord({
      herdId: 'herd_1',
      animalCount: null,
      notes: '',
      position: position(),
    })
    await appendSessionTrackpoint({
      sessionId: session.id,
      lastTimestamp: null,
      nextPosition: position(),
    })

    await deleteGrazingSessionRecord(session.id)

    expect(await db.sessions.get(session.id)).toBeUndefined()
    expect(await listSessionTrackpoints(session.id)).toHaveLength(0)
    expect(await listSessionEvents(session.id)).toHaveLength(0)
  })
})

describe('recording lifecycle guards', () => {
  async function startedSession() {
    return createGrazingSessionRecord({
      herdId: 'herd_1',
      animalCount: null,
      notes: '',
      position: null,
    })
  }

  it('rejects a point written after stop', async () => {
    const session = await startedSession()
    await stopGrazingSessionRecord({ sessionId: session.id, position: null })

    await expect(
      appendSessionTrackpoint({
        sessionId: session.id,
        lastTimestamp: null,
        nextPosition: position({ timestamp: Date.parse('2026-06-01T09:00:00.000Z') }),
      }),
    ).rejects.toBeInstanceOf(SessionNotRecordingError)

    expect(await listSessionTrackpoints(session.id)).toHaveLength(0)
  })

  it('rejects a point written while paused', async () => {
    const session = await startedSession()
    await pauseGrazingSessionRecord({ sessionId: session.id, position: null })

    await expect(
      appendSessionTrackpoint({
        sessionId: session.id,
        lastTimestamp: null,
        nextPosition: position({ timestamp: Date.parse('2026-06-01T09:00:00.000Z') }),
      }),
    ).rejects.toBeInstanceOf(SessionNotRecordingError)

    expect(await listSessionTrackpoints(session.id)).toHaveLength(0)
  })

  it('accepts points again after resume', async () => {
    const session = await startedSession()
    await pauseGrazingSessionRecord({ sessionId: session.id, position: null })
    await resumeGrazingSessionRecord({ sessionId: session.id, position: null })

    const appended = await appendSessionTrackpoint({
      sessionId: session.id,
      lastTimestamp: null,
      nextPosition: position({ timestamp: Date.parse('2026-06-01T09:00:00.000Z') }),
    })

    expect(appended).not.toBeNull()
    expect(await listSessionTrackpoints(session.id)).toHaveLength(1)
  })

  it('rejects a point for a session that no longer exists', async () => {
    await expect(
      appendSessionTrackpoint({
        sessionId: 'does_not_exist',
        lastTimestamp: null,
        nextPosition: position(),
      }),
    ).rejects.toThrow('Weidegang wurde nicht gefunden.')
  })
})

describe('lifecycle metrics come from IndexedDB', () => {
  it('includes the final persisted point in the stop metrics', async () => {
    const session = await createGrazingSessionRecord({
      herdId: 'herd_1',
      animalCount: null,
      notes: '',
      position: null,
    })

    await appendSessionTrackpoint({
      sessionId: session.id,
      lastTimestamp: null,
      nextPosition: position({ timestamp: Date.parse('2026-06-01T08:00:00.000Z') }),
    })
    // The last point is deliberately never mirrored back into any caller-held
    // array: stop must read it straight out of IndexedDB.
    await appendSessionTrackpoint({
      sessionId: session.id,
      lastTimestamp: null,
      nextPosition: position({
        latitude: 46.5005,
        timestamp: Date.parse('2026-06-01T08:00:30.000Z'),
      }),
    })

    const storedPoints = await listSessionTrackpoints(session.id)
    expect(storedPoints).toHaveLength(2)

    await stopGrazingSessionRecord({ sessionId: session.id, position: null })

    const stopped = await db.sessions.get(session.id)
    expect(stopped?.status).toBe('finished')
    // ~55 m of walking between the two stored points: a non-zero distance is
    // only possible if stop read both of them out of IndexedDB.
    expect(stopped?.distanceM).toBeGreaterThan(40)
    expect(stopped?.avgAccuracyM).toBe(5)
  })

  it('computes pause metrics from stored points, not from caller state', async () => {
    const session = await createGrazingSessionRecord({
      herdId: 'herd_1',
      animalCount: null,
      notes: '',
      position: null,
    })

    await appendSessionTrackpoint({
      sessionId: session.id,
      lastTimestamp: null,
      nextPosition: position({ timestamp: Date.parse('2026-06-01T08:00:00.000Z') }),
    })
    await appendSessionTrackpoint({
      sessionId: session.id,
      lastTimestamp: null,
      nextPosition: position({
        latitude: 46.5005,
        timestamp: Date.parse('2026-06-01T08:00:30.000Z'),
      }),
    })

    await pauseGrazingSessionRecord({ sessionId: session.id, position: null })

    const paused = await db.sessions.get(session.id)
    expect(paused?.status).toBe('paused')
    expect(paused?.distanceM).toBeGreaterThan(40)
  })
})

describe('strict lifecycle transition guards', () => {
  async function startedSession() {
    return createGrazingSessionRecord({
      herdId: 'herd_1',
      animalCount: null,
      notes: '',
      position: null,
    })
  }

  it('keeps repeated stop idempotent without changing endTime or duplicating events', async () => {
    const session = await startedSession()

    await stopGrazingSessionRecord({ sessionId: session.id, position: null })
    const firstEndTime = (await db.sessions.get(session.id))?.endTime

    await stopGrazingSessionRecord({ sessionId: session.id, position: null })

    const events = await listSessionEvents(session.id)
    expect(events.filter((event) => event.type === 'stop')).toHaveLength(1)
    expect((await db.sessions.get(session.id))?.endTime).toBe(firstEndTime)
  })

  it('rejects active -> active instead of silently treating resume as a no-op', async () => {
    const session = await startedSession()

    await expect(
      resumeGrazingSessionRecord({ sessionId: session.id, position: null })
    ).rejects.toBeInstanceOf(InvalidSessionTransitionError)

    expect((await listSessionEvents(session.id)).filter((event) => event.type === 'resume')).toHaveLength(0)
  })

  it('rejects paused -> paused instead of silently treating pause as a no-op', async () => {
    const session = await startedSession()
    await pauseGrazingSessionRecord({ sessionId: session.id, position: null })

    await expect(
      pauseGrazingSessionRecord({ sessionId: session.id, position: null })
    ).rejects.toBeInstanceOf(InvalidSessionTransitionError)

    expect((await listSessionEvents(session.id)).filter((event) => event.type === 'pause')).toHaveLength(1)
  })

  it('allows paused -> finished', async () => {
    const session = await startedSession()
    await pauseGrazingSessionRecord({ sessionId: session.id, position: null })

    await stopGrazingSessionRecord({ sessionId: session.id, position: null })

    expect((await db.sessions.get(session.id))?.status).toBe('finished')
    const events = await listSessionEvents(session.id)
    expect(events.map((event) => event.type)).toEqual(['start', 'pause', 'stop'])
  })

  it('rejects finished -> active and finished -> paused', async () => {
    const session = await startedSession()
    await stopGrazingSessionRecord({ sessionId: session.id, position: null })

    await expect(
      resumeGrazingSessionRecord({ sessionId: session.id, position: null })
    ).rejects.toBeInstanceOf(InvalidSessionTransitionError)
    await expect(
      pauseGrazingSessionRecord({ sessionId: session.id, position: null })
    ).rejects.toBeInstanceOf(InvalidSessionTransitionError)

    expect((await db.sessions.get(session.id))?.status).toBe('finished')
    const events = await listSessionEvents(session.id)
    expect(events.filter((event) => event.type === 'resume')).toHaveLength(0)
    expect(events.filter((event) => event.type === 'pause')).toHaveLength(0)
  })

  it('rolls back the status change when lifecycle event persistence fails', async () => {
    const session = await startedSession()
    vi.spyOn(db.events, 'add').mockRejectedValueOnce(new Error('event write failed'))

    await expect(
      pauseGrazingSessionRecord({ sessionId: session.id, position: null })
    ).rejects.toThrow('event write failed')

    expect((await db.sessions.get(session.id))?.status).toBe('active')
    expect((await listSessionEvents(session.id)).filter((event) => event.type === 'pause')).toHaveLength(0)
  })
})
