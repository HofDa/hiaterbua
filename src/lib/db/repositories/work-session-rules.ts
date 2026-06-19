import type { WorkSession, WorkStatus } from '@/types/domain'

/**
 * Builds the patch for moving an active/paused work session to `nextStatus`.
 * Duration only accrues while the session was actually running (status 'active'
 * with an `activeSince` mark): pausing banks the elapsed seconds, resuming
 * re-arms `activeSince` (and the reminder clock), and finishing stamps `endTime`.
 */
export function getWorkSessionStatusPatch(
  activeSession: WorkSession,
  nextStatus: WorkStatus,
  timestamp: string,
): Partial<WorkSession> {
  const currentTimeMs = new Date(timestamp).getTime()
  const activeSinceMs = activeSession.activeSince
    ? new Date(activeSession.activeSince).getTime()
    : null

  let nextDurationS = activeSession.durationS

  if (
    activeSession.status === 'active' &&
    activeSinceMs !== null &&
    Number.isFinite(activeSinceMs)
  ) {
    nextDurationS += Math.max(0, Math.round((currentTimeMs - activeSinceMs) / 1000))
  }

  const nextPatch: Partial<WorkSession> = {
    status: nextStatus,
    durationS: nextDurationS,
    updatedAt: timestamp,
  }

  if (nextStatus === 'paused') {
    nextPatch.activeSince = null
  }

  if (nextStatus === 'active') {
    nextPatch.activeSince = timestamp
    nextPatch.lastReminderAt = activeSession.reminderIntervalMin ? timestamp : null
  }

  if (nextStatus === 'finished') {
    nextPatch.activeSince = null
    nextPatch.endTime = timestamp
  }

  return nextPatch
}

/** Maps a status transition to the work event it should log. */
export function getWorkSessionStatusEventType(
  nextStatus: WorkStatus,
): 'pause' | 'resume' | 'stop' {
  return nextStatus === 'paused' ? 'pause' : nextStatus === 'active' ? 'resume' : 'stop'
}
