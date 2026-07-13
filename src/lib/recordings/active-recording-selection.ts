import type { GrazingSession, WorkSession } from '@/types/domain'

export type ActiveRecordingSource =
  | { kind: 'grazing'; recording: GrazingSession }
  | { kind: 'work'; recording: WorkSession }

type RecordingRow = {
  status: 'active' | 'paused' | 'finished'
  startTime: string
}

/** Active before paused, then most recently started within the same status. */
export function selectCurrentSession<T extends RecordingRow>(rows: readonly T[]): T | null {
  return (
    rows
      .filter((row) => row.status !== 'finished')
      .sort((left, right) => {
        if (left.status !== right.status) return left.status === 'active' ? -1 : 1
        return right.startTime.localeCompare(left.startTime)
      })[0] ?? null
  )
}

/**
 * Selects the recording that needs attention now. An active recording always
 * beats a paused one; when statuses match, grazing keeps priority because its
 * GPS recording is the more field-critical process.
 */
export function selectActiveRecordingSource(
  grazingSessions: GrazingSession[],
  workSessions: WorkSession[],
): ActiveRecordingSource | null {
  const grazing = selectCurrentSession(grazingSessions)
  const work = selectCurrentSession(workSessions)

  if (!grazing) return work ? { kind: 'work', recording: work } : null
  if (!work) return { kind: 'grazing', recording: grazing }

  if (grazing.status !== work.status) {
    return grazing.status === 'active'
      ? { kind: 'grazing', recording: grazing }
      : { kind: 'work', recording: work }
  }

  return { kind: 'grazing', recording: grazing }
}
