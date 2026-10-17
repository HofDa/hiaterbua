import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db/dexie'
import {
  createWorkSessionRecord,
  reopenFinishedWorkSessionRecord,
  updateWorkSessionStatusRecord,
} from '@/lib/db/repositories/work-sessions'

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
})

async function startAndFinish() {
  const session = await createWorkSessionRecord({
    type: 'herding',
    activityId: null,
    herdId: null,
    enclosureId: null,
    reminderIntervalMin: 0,
    notes: '',
  })
  await updateWorkSessionStatusRecord(session, 'finished')
  const finished = await db.workSessions.get(session.id)
  return { sessionId: session.id, finishedAt: finished!.endTime! }
}

describe('reopenFinishedWorkSessionRecord', () => {
  it('reopens the just-finished session as active and drops the stop event', async () => {
    const { sessionId, finishedAt } = await startAndFinish()

    await reopenFinishedWorkSessionRecord({ sessionId, finishedAt, previousStatus: 'active' })

    const reopened = await db.workSessions.get(sessionId)
    expect(reopened?.status).toBe('active')
    expect(reopened?.endTime).toBeNull()
    expect(reopened?.activeSince).toBeTruthy()
    const types = (await db.workEvents.where('workSessionId').equals(sessionId).toArray()).map(
      (event) => event.type
    )
    expect(types).not.toContain('stop')
  })

  it('reopens a session that was paused as paused', async () => {
    const { sessionId, finishedAt } = await startAndFinish()

    await reopenFinishedWorkSessionRecord({ sessionId, finishedAt, previousStatus: 'paused' })

    const reopened = await db.workSessions.get(sessionId)
    expect(reopened?.status).toBe('paused')
    expect(reopened?.activeSince).toBeNull()
  })

  it('refuses after the undo window', async () => {
    const { sessionId, finishedAt } = await startAndFinish()
    const late = new Date(Date.parse(finishedAt) + 5 * 60_000).toISOString()

    await expect(
      reopenFinishedWorkSessionRecord({ sessionId, finishedAt, previousStatus: 'active', now: late })
    ).rejects.toThrow()
    expect((await db.workSessions.get(sessionId))?.status).toBe('finished')
  })
})
