import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db/dexie'
import {
  appendSessionTrackpoint,
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
      startTime: session.startTime,
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
      startTime: session.startTime,
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
      startTime: session.startTime,
    })
    expect(first?.nextSeq).toBe(1)

    const duplicateFromStaleTab = await appendSessionTrackpoint({
      sessionId: session.id,
      lastTimestamp: null,
      nextPosition: position({ timestamp: firstTimestamp }),
      startTime: session.startTime,
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
      startTime: session.startTime,
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
      startTime: session.startTime,
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

    await pauseGrazingSessionRecord({
      sessionId: session.id,
      startTime: session.startTime,
      trackpoints: [],
      position: null,
    })
    expect((await db.sessions.get(session.id))?.status).toBe('paused')

    await resumeGrazingSessionRecord({ sessionId: session.id, position: null })
    expect((await db.sessions.get(session.id))?.status).toBe('active')

    await stopGrazingSessionRecord({
      sessionId: session.id,
      startTime: session.startTime,
      trackpoints: [],
      position: null,
    })
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
      pauseGrazingSessionRecord({
        sessionId: 'does_not_exist',
        startTime: '2026-06-01T08:00:00.000Z',
        trackpoints: [],
        position: null,
      }),
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
    await stopGrazingSessionRecord({
      sessionId: session.id,
      startTime: session.startTime,
      trackpoints: [],
      position: position(),
    })

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
      startTime: session.startTime,
    })

    await deleteGrazingSessionRecord(session.id)

    expect(await db.sessions.get(session.id)).toBeUndefined()
    expect(await listSessionTrackpoints(session.id)).toHaveLength(0)
    expect(await listSessionEvents(session.id)).toHaveLength(0)
  })
})
