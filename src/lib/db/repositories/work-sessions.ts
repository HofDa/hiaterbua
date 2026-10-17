import { assertUpdated } from '@/lib/db/assert-updated'
import { db } from '@/lib/db/dexie'
import {
  getWorkSessionStatusEventType,
  getWorkSessionStatusPatch,
} from '@/lib/db/repositories/work-session-rules'
import { buildLocalChangeMetadata, buildLocalChangePatch } from '@/lib/sync/local-metadata'
import { addWorkEvent } from '@/lib/work/work-session-persistence'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type {
  WorkActivityId,
  WorkEvent,
  WorkSession,
  WorkStatus,
  WorkType,
} from '@/types/domain'

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Every work session — for counts, backup and export. */
export function listAllWorkSessions(): Promise<WorkSession[]> {
  return db.workSessions.toArray()
}

/** Work sessions, most recently updated first. */
export function listWorkSessionsByRecent(): Promise<WorkSession[]> {
  return db.workSessions.orderBy('updatedAt').reverse().toArray()
}

export function countWorkSessions(): Promise<number> {
  return db.workSessions.count()
}

/** Every work event — for backup and export. */
export function listAllWorkEvents(): Promise<WorkEvent[]> {
  return db.workEvents.toArray()
}

export function countWorkEvents(): Promise<number> {
  return db.workEvents.count()
}

/** A single work session, or `undefined` when it does not exist. */
export function getWorkSession(sessionId: string): Promise<WorkSession | undefined> {
  return db.workSessions.get(sessionId)
}

/** Work sessions that are still running or paused — the recovery candidates. */
export function listUnfinishedWorkSessions(): Promise<WorkSession[]> {
  return db.workSessions.where('status').anyOf('active', 'paused').toArray()
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function createWorkSessionRecord(params: {
  type: WorkType
  activityId: WorkActivityId | null
  herdId: string | null
  enclosureId: string | null
  reminderIntervalMin: number
  notes: string
}): Promise<WorkSession> {
  const { type, activityId, herdId, enclosureId, reminderIntervalMin, notes } = params
  const timestamp = nowIso()
  const hasReminder = reminderIntervalMin > 0

  const session: WorkSession = {
    id: createId('work_session'),
    type,
    activityId,
    status: 'active',
    herdId,
    enclosureId,
    startTime: timestamp,
    endTime: null,
    activeSince: timestamp,
    durationS: 0,
    reminderIntervalMin: hasReminder ? reminderIntervalMin : null,
    lastReminderAt: hasReminder ? timestamp : null,
    notes: notes.trim() || undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...buildLocalChangeMetadata(timestamp),
  }

  await db.transaction('rw', db.workSessions, db.workEvents, async () => {
    await db.workSessions.add(session)
    await addWorkEvent(session.id, 'start', notes)
  })

  return session
}

/**
 * Transition an active/paused session to `nextStatus`, banking duration via the
 * pure status rules and logging the matching pause/resume/stop event. Throws when
 * the session no longer exists.
 */
export async function updateWorkSessionStatusRecord(
  activeSession: WorkSession,
  nextStatus: WorkStatus,
): Promise<void> {
  const timestamp = nowIso()
  const patch = getWorkSessionStatusPatch(activeSession, nextStatus, timestamp)
  const eventType = getWorkSessionStatusEventType(nextStatus)

  await db.transaction('rw', db.workSessions, db.workEvents, async () => {
    const updatedCount = await db.workSessions.update(activeSession.id, {
      ...patch,
      ...buildLocalChangePatch(timestamp),
    })
    assertUpdated(updatedCount, 'Arbeitseinsatz wurde nicht gefunden.')

    await addWorkEvent(activeSession.id, eventType)
  })
}

/** How long after ending an Arbeitseinsatz "Rückgängig" may reopen it. */
export const UNDO_WORK_FINISH_WINDOW_MS = 60_000

/**
 * Reopens a work session ended moments ago by mistake, in the status it had
 * before (paused, or active again from now). Only the exact end identified
 * by `finishedAt` and only within the undo window; the stop event is removed.
 */
export async function reopenFinishedWorkSessionRecord(params: {
  sessionId: string
  finishedAt: string
  previousStatus: 'active' | 'paused'
  now?: string
}): Promise<void> {
  const { sessionId, finishedAt, previousStatus } = params
  const timestamp = params.now ?? nowIso()

  await db.transaction('rw', db.workSessions, db.workEvents, async () => {
    const session = await db.workSessions.get(sessionId)
    if (!session) throw new Error('Arbeitseinsatz wurde nicht gefunden.')
    if (session.status !== 'finished' || session.endTime !== finishedAt) {
      throw new Error('Der Arbeitseinsatz kann nicht mehr fortgesetzt werden.')
    }
    if (Date.parse(timestamp) - Date.parse(finishedAt) > UNDO_WORK_FINISH_WINDOW_MS) {
      throw new Error('Rückgängig ist nur kurz nach dem Beenden möglich.')
    }

    const stopEvents = await db.workEvents
      .where('workSessionId')
      .equals(sessionId)
      .filter((event) => event.type === 'stop' && event.timestamp >= finishedAt)
      .primaryKeys()
    if (stopEvents.length > 0) await db.workEvents.bulkDelete(stopEvents)

    const updatedCount = await db.workSessions.update(sessionId, {
      status: previousStatus,
      endTime: null,
      activeSince: previousStatus === 'active' ? timestamp : null,
      updatedAt: timestamp,
      ...buildLocalChangePatch(timestamp),
    })
    assertUpdated(updatedCount, 'Arbeitseinsatz wurde nicht gefunden.')

    if (previousStatus === 'active') await addWorkEvent(sessionId, 'resume')
  })
}

/** Persist edited work-session fields and log an edit note. Throws when missing. */
export async function saveEditedWorkSessionRecord(
  sessionId: string,
  patch: Partial<WorkSession>,
): Promise<void> {
  const timestamp = nowIso()
  await db.transaction('rw', db.workSessions, db.workEvents, async () => {
    const updatedCount = await db.workSessions.update(sessionId, {
      ...patch,
      updatedAt: patch.updatedAt ?? timestamp,
      ...buildLocalChangePatch(patch.updatedAt ?? timestamp),
    })
    assertUpdated(updatedCount, 'Arbeitseinsatz konnte nicht aktualisiert werden.')

    await addWorkEvent(sessionId, 'note', 'Arbeitseinsatz bearbeitet')
  })
}

/** Record that a reminder fired: bump the reminder timestamp and log a note. */
export async function markWorkSessionReminded(
  sessionId: string,
  remindedAt: string,
  message: string,
): Promise<void> {
  await db.workSessions.update(sessionId, {
    lastReminderAt: remindedAt,
    updatedAt: remindedAt,
    ...buildLocalChangePatch(remindedAt),
  })
  await addWorkEvent(sessionId, 'note', message)
}

export async function deleteWorkSessionRecord(sessionId: string): Promise<void> {
  await db.transaction('rw', db.workSessions, db.workEvents, async () => {
    await db.workEvents.where('workSessionId').equals(sessionId).delete()
    await db.workSessions.delete(sessionId)
  })
}
