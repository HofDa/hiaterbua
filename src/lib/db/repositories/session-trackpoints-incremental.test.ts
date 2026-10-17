import { liveQuery } from 'dexie'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db/dexie'
import {
  appendSessionTrackpoint,
  createGrazingSessionRecord,
  getLastSessionTrackpoint,
  listFinishedSessionsByRecent,
  listSessionTrackpoints,
  loadSessionTrackpointsIncremental,
  saveEditedGrazingSessionRecord,
  stopGrazingSessionRecord,
} from '@/lib/db/repositories/sessions'
import type { GpsTrackPosition } from '@/lib/maps/position-types'

const START_MS = Date.parse('2026-06-01T08:00:00.000Z')

function fix(index: number): GpsTrackPosition {
  return {
    latitude: 46.5 + index * 0.0001,
    longitude: 11.0,
    accuracy: 5,
    timestamp: START_MS + index * 5_000,
    speed: null,
    heading: null,
  }
}

async function startSession() {
  return createGrazingSessionRecord({
    herdId: 'herd_1',
    animalCount: null,
    notes: '',
    position: null,
  })
}

async function appendFixes(sessionId: string, from: number, to: number) {
  for (let index = from; index < to; index += 1) {
    await appendSessionTrackpoint({ sessionId, lastTimestamp: null, nextPosition: fix(index) })
  }
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
})

describe('loadSessionTrackpointsIncremental', () => {
  it('appends only the new tail and matches a full read', async () => {
    const session = await startSession()
    await appendFixes(session.id, 0, 5)

    const first = await loadSessionTrackpointsIncremental(session.id, null)
    expect(first).toHaveLength(5)

    await appendFixes(session.id, 5, 8)
    const next = await loadSessionTrackpointsIncremental(session.id, first)

    expect(next).toEqual(await listSessionTrackpoints(session.id))
    expect(next.slice(0, 5)).toEqual(first)
    // Earlier points are reused, not re-read.
    expect(next[0]).toBe(first[0])
  })

  it('returns the same array when nothing changed', async () => {
    const session = await startSession()
    await appendFixes(session.id, 0, 3)

    const first = await loadSessionTrackpointsIncremental(session.id, null)
    const again = await loadSessionTrackpointsIncremental(session.id, first)

    expect(again).toBe(first)
  })

  it('falls back to a full read after a session edit rewrites the track', async () => {
    const session = await startSession()
    await appendFixes(session.id, 0, 4)
    const before = await loadSessionTrackpointsIncremental(session.id, null)
    await stopGrazingSessionRecord({ sessionId: session.id, position: null })
    const stopped = await db.sessions.get(session.id)

    // Drop the second point.
    await saveEditedGrazingSessionRecord({
      sessionId: session.id,
      editTrackpoints: before
        .filter((_, index) => index !== 1)
        .map((trackpoint) => ({
          lat: trackpoint.lat,
          lon: trackpoint.lon,
          timestamp: trackpoint.timestamp,
          accuracyM: trackpoint.accuracyM ?? null,
          speedMps: trackpoint.speedMps ?? null,
          headingDeg: trackpoint.headingDeg ?? null,
        })),
      editedStartTime: stopped!.startTime,
      editedEndTime: stopped!.endTime ?? null,
      existingTrackpoints: before,
    })

    const after = await loadSessionTrackpointsIncremental(session.id, before)
    expect(after).toEqual(await listSessionTrackpoints(session.id))
    expect(after).toHaveLength(3)
  })

  it('falls back to a full read when a middle point disappears', async () => {
    const session = await startSession()
    await appendFixes(session.id, 0, 4)
    const before = await loadSessionTrackpointsIncremental(session.id, null)

    await db.trackpoints.delete(before[1].id)
    await appendFixes(session.id, 4, 5)

    const after = await loadSessionTrackpointsIncremental(session.id, before)
    expect(after).toEqual(await listSessionTrackpoints(session.id))
    expect(after).toHaveLength(4)
  })

  it('ignores a cache that belongs to another session', async () => {
    const first = await startSession()
    await appendFixes(first.id, 0, 3)
    const cached = await loadSessionTrackpointsIncremental(first.id, null)
    await stopGrazingSessionRecord({ sessionId: first.id, position: null })

    const second = await startSession()
    await appendFixes(second.id, 10, 12)

    const result = await loadSessionTrackpointsIncremental(second.id, cached)
    expect(result.map((trackpoint) => trackpoint.sessionId)).toEqual([second.id, second.id])
  })
})

describe('getLastSessionTrackpoint', () => {
  it('returns the highest-seq point of the session', async () => {
    const session = await startSession()
    await appendFixes(session.id, 0, 3)

    const last = await getLastSessionTrackpoint(session.id)
    expect(last?.seq).toBe(3)
  })
})

describe('listFinishedSessionsByRecent live query', () => {
  it('is not re-run by GPS points written to the open session', async () => {
    const finished = await startSession()
    await stopGrazingSessionRecord({ sessionId: finished.id, position: null })
    const open = await startSession()

    let emissions = 0
    let latest: string[] = []
    const subscription = liveQuery(() => listFinishedSessionsByRecent()).subscribe({
      next: (sessions) => {
        emissions += 1
        latest = sessions.map((session) => session.id)
      },
    })

    const settle = () => new Promise((resolve) => setTimeout(resolve, 50))
    await settle()
    expect(latest).toEqual([finished.id])
    const baseline = emissions

    await appendFixes(open.id, 0, 5)
    await settle()
    expect(emissions).toBe(baseline)

    // Finishing the open session does change the result, and must emit.
    await stopGrazingSessionRecord({ sessionId: open.id, position: null })
    await settle()
    expect(latest).toContain(open.id)

    subscription.unsubscribe()
  })
})
