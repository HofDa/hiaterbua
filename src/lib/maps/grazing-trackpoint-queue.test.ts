import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/lib/db/dexie'
import {
  appendSessionTrackpoint,
  createGrazingSessionRecord,
  listSessionEvents,
  listSessionTrackpoints,
  SessionNotRecordingError,
  stopGrazingSessionRecord,
} from '@/lib/db/repositories/sessions'
import { withSessionRecordingLock } from '@/lib/db/session-recording-lock'
import {
  createTrackpointQueue,
  type TrackpointQueueDeps,
} from '@/lib/maps/grazing-trackpoint-queue'
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

function startedSession() {
  return createGrazingSessionRecord({
    herdId: 'herd_1',
    animalCount: null,
    notes: '',
    position: null,
  })
}

/**
 * Wires the queue to the real repository and lock, mirroring what the recorder
 * hook does — minus the React shell — so these exercise the production write
 * path rather than a stand-in.
 */
function createDeps(overrides: Partial<TrackpointQueueDeps> = {}): TrackpointQueueDeps {
  return {
    appendTrackpoint: appendSessionTrackpoint,
    withLock: withSessionRecordingLock,
    getLastTimestamp: () => null,
    onPersisted: () => {},
    onWriteFailed: () => {},
    onRejected: () => {},
    onHealthy: () => {},
    ...overrides,
  }
}

/**
 * The controller's pause/stop sequence: close intake, take the lock, flush
 * everything queued, and only then persist the transition.
 */
async function runStopTransition(
  queue: ReturnType<typeof createTrackpointQueue>,
  deps: TrackpointQueueDeps,
  sessionId: string
) {
  queue.suspendIntake()

  try {
    await withSessionRecordingLock(sessionId, async () => {
      await queue.flushAssumingLock(deps)
      await stopGrazingSessionRecord({ sessionId, position: null })
    })
  } catch (error) {
    queue.resumeIntake()
    throw error
  }
}

beforeEach(async () => {
  await clearAllTables()
})

describe('pending points and stop', () => {
  it('persists a pending point before the stop transition runs', async () => {
    const session = await startedSession()
    const queue = createTrackpointQueue()
    const deps = createDeps()

    // Queued but never flushed — exactly the state a GPS fix is in when the
    // user taps Stop while a write is still outstanding.
    queue.enqueue(session.id, position({ timestamp: Date.parse('2026-06-01T08:00:10.000Z') }))
    expect(queue.size()).toBe(1)
    expect(await listSessionTrackpoints(session.id)).toHaveLength(0)

    await runStopTransition(queue, deps, session.id)

    expect(queue.size()).toBe(0)
    expect(await listSessionTrackpoints(session.id)).toHaveLength(1)
    expect((await db.sessions.get(session.id))?.status).toBe('finished')
  })

  it('closes intake so no point joins the queue once stop begins', async () => {
    const session = await startedSession()
    const queue = createTrackpointQueue()

    queue.suspendIntake()

    expect(queue.enqueue(session.id, position())).toBe(false)
    expect(queue.size()).toBe(0)
  })

  it('reopens intake after a resume', async () => {
    const session = await startedSession()
    const queue = createTrackpointQueue()

    queue.suspendIntake()
    expect(queue.enqueue(session.id, position())).toBe(false)

    queue.resumeIntake()
    expect(queue.enqueue(session.id, position())).toBe(true)
    expect(queue.size()).toBe(1)
  })
})

describe('failed pending flush', () => {
  it('prevents the stop and keeps the point recoverable', async () => {
    const session = await startedSession()
    const queue = createTrackpointQueue()

    const writeError = new Error('QuotaExceededError')
    const appendTrackpoint = vi.fn().mockRejectedValue(writeError)
    const onWriteFailed = vi.fn()
    const deps = createDeps({ appendTrackpoint, onWriteFailed })

    const pendingPosition = position({ timestamp: Date.parse('2026-06-01T08:00:10.000Z') })
    queue.enqueue(session.id, pendingPosition)

    await expect(runStopTransition(queue, deps, session.id)).rejects.toThrow(writeError)

    // The transition must not have happened...
    expect((await db.sessions.get(session.id))?.status).toBe('active')
    expect(await listSessionEvents(session.id)).toHaveLength(1)

    // ...and the point must still be queued, not silently dropped.
    expect(queue.size()).toBe(1)
    expect(queue.snapshot()[0].position.timestamp).toBe(pendingPosition.timestamp)
    expect(onWriteFailed).toHaveBeenCalledOnce()

    // Intake reopened, so recording continues while the user frees storage.
    expect(queue.isAcceptingPositions()).toBe(true)

    // Recovery: once writes succeed the queued point lands and stop can finish.
    const healthyDeps = createDeps()
    await runStopTransition(queue, healthyDeps, session.id)

    expect(queue.size()).toBe(0)
    expect(await listSessionTrackpoints(session.id)).toHaveLength(1)
    expect((await db.sessions.get(session.id))?.status).toBe('finished')
  })

  it('drops a point its session can no longer accept, but reports it', async () => {
    const session = await startedSession()
    await stopGrazingSessionRecord({ sessionId: session.id, position: null })

    const queue = createTrackpointQueue()
    const onRejected = vi.fn()
    const deps = createDeps({ onRejected })

    queue.enqueue(session.id, position())
    await queue.flush(session.id, deps)

    // Dropped rather than retried forever — but loudly, via onRejected.
    expect(queue.size()).toBe(0)
    expect(onRejected).toHaveBeenCalledOnce()
    expect(onRejected.mock.calls[0][1]).toBeInstanceOf(SessionNotRecordingError)
  })

  it('keeps a later point queued behind a failing one, preserving order', async () => {
    const session = await startedSession()
    const queue = createTrackpointQueue()

    const deps = createDeps({
      appendTrackpoint: vi.fn().mockRejectedValue(new Error('disk full')),
    })

    queue.enqueue(session.id, position({ timestamp: Date.parse('2026-06-01T08:00:10.000Z') }))
    queue.enqueue(session.id, position({ timestamp: Date.parse('2026-06-01T08:00:20.000Z') }))

    await queue.flush(session.id, deps)

    expect(queue.snapshot().map((entry) => entry.position.timestamp)).toEqual([
      Date.parse('2026-06-01T08:00:10.000Z'),
      Date.parse('2026-06-01T08:00:20.000Z'),
    ])
  })
})

describe('concurrent append and stop', () => {
  it('serializes through the session lock with a deterministic outcome', async () => {
    const session = await startedSession()
    const order: string[] = []

    const appendPromise = withSessionRecordingLock(session.id, async () => {
      order.push('append:start')
      await appendSessionTrackpoint({
        sessionId: session.id,
        lastTimestamp: null,
        nextPosition: position({ timestamp: Date.parse('2026-06-01T08:00:10.000Z') }),
      })
      order.push('append:end')
    })

    const stopPromise = withSessionRecordingLock(session.id, async () => {
      order.push('stop:start')
      await stopGrazingSessionRecord({ sessionId: session.id, position: null })
      order.push('stop:end')
    })

    await Promise.all([appendPromise, stopPromise])

    // The two critical sections never interleave; the append, requested first,
    // completes before the stop begins.
    expect(order).toEqual(['append:start', 'append:end', 'stop:start', 'stop:end'])

    // And the stop metrics therefore include that final point.
    const stopped = await db.sessions.get(session.id)
    expect(stopped?.status).toBe('finished')
    expect(await listSessionTrackpoints(session.id)).toHaveLength(1)
    expect(stopped?.avgAccuracyM).toBe(5)
  })

  it('rejects an append that loses the race to stop, leaving the track intact', async () => {
    const session = await startedSession()

    const stopPromise = withSessionRecordingLock(session.id, () =>
      stopGrazingSessionRecord({ sessionId: session.id, position: null })
    )
    const appendPromise = withSessionRecordingLock(session.id, () =>
      appendSessionTrackpoint({
        sessionId: session.id,
        lastTimestamp: null,
        nextPosition: position({ timestamp: Date.parse('2026-06-01T08:00:10.000Z') }),
      })
    )

    await stopPromise
    // Losing the race is a rejection, never a point written into a finished
    // session behind the stop's back.
    await expect(appendPromise).rejects.toBeInstanceOf(SessionNotRecordingError)

    expect(await listSessionTrackpoints(session.id)).toHaveLength(0)
    expect((await db.sessions.get(session.id))?.status).toBe('finished')
  })
})
