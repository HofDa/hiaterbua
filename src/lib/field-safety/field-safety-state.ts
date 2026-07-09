export type FieldOperationSource =
  | 'work-session'
  | 'grazing-session'
  | 'gps-recording'
  | 'session-recovery'

export type FieldSafetySnapshot = {
  activeWorkSession: boolean
  activeGrazingSession: boolean
  activeGpsRecording: boolean
  activeSessionRecovery: boolean
}

export const emptyFieldSafetySnapshot: FieldSafetySnapshot = {
  activeWorkSession: false,
  activeGrazingSession: false,
  activeGpsRecording: false,
  activeSessionRecovery: false,
}

export function isFieldOperationActive(snapshot: FieldSafetySnapshot) {
  return (
    snapshot.activeWorkSession ||
    snapshot.activeGrazingSession ||
    snapshot.activeGpsRecording ||
    snapshot.activeSessionRecovery
  )
}

export function buildFieldSafetySnapshot(
  sources: Iterable<FieldOperationSource>
): FieldSafetySnapshot {
  const snapshot = { ...emptyFieldSafetySnapshot }

  for (const source of sources) {
    if (source === 'work-session') {
      snapshot.activeWorkSession = true
    } else if (source === 'grazing-session') {
      snapshot.activeGrazingSession = true
    } else if (source === 'gps-recording') {
      snapshot.activeGpsRecording = true
    } else {
      snapshot.activeSessionRecovery = true
    }
  }

  return snapshot
}
