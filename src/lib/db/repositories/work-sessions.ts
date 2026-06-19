import { db } from '@/lib/db/dexie'
import {
  getWorkSessionStatusEventType,
  getWorkSessionStatusPatch,
} from '@/lib/db/repositories/work-session-rules'
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
    const updatedCount = await db.workSessions.update(activeSession.id, patch)
    if (updatedCount === 0) {
      throw new Error('Arbeitseinsatz wurde nicht gefunden.')
    }

    await addWorkEvent(activeSession.id, eventType)
  })
}

/** Persist edited work-session fields and log an edit note. Throws when missing. */
export async function saveEditedWorkSessionRecord(
  sessionId: string,
  patch: Partial<WorkSession>,
): Promise<void> {
  await db.transaction('rw', db.workSessions, db.workEvents, async () => {
    const updatedCount = await db.workSessions.update(sessionId, patch)
    if (updatedCount === 0) {
      throw new Error('Arbeitseinsatz konnte nicht aktualisiert werden.')
    }

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
  })
  await addWorkEvent(sessionId, 'note', message)
}

export async function deleteWorkSessionRecord(sessionId: string): Promise<void> {
  await db.transaction('rw', db.workSessions, db.workEvents, async () => {
    await db.workEvents.where('workSessionId').equals(sessionId).delete()
    await db.workSessions.delete(sessionId)
  })
}
