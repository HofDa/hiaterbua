'use client'

import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/dexie'
import {
  emptyFieldSafetySnapshot,
  isFieldOperationActive,
  type FieldSafetySnapshot,
} from '@/lib/field-safety/field-safety-state'
import { useTransientFieldSafetySnapshot } from '@/lib/field-safety/field-safety-store'

function mergeFieldSafetySnapshots(
  left: FieldSafetySnapshot,
  right: FieldSafetySnapshot
): FieldSafetySnapshot {
  return {
    activeWorkSession: left.activeWorkSession || right.activeWorkSession,
    activeGrazingSession: left.activeGrazingSession || right.activeGrazingSession,
    activeGpsRecording: left.activeGpsRecording || right.activeGpsRecording,
    activeSessionRecovery: left.activeSessionRecovery || right.activeSessionRecovery,
  }
}

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  )

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine)
    updateOnlineStatus()

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  return isOnline
}

export function useFieldSafety() {
  const transientSnapshot = useTransientFieldSafetySnapshot()
  const dbSnapshot = useLiveQuery<FieldSafetySnapshot>(async () => {
    const [activeGrazingSessionCount, activeWorkSessionCount] = await Promise.all([
      db.sessions.where('status').anyOf('active', 'paused').count(),
      db.workSessions.where('status').anyOf('active', 'paused').count(),
    ])

    return {
      ...emptyFieldSafetySnapshot,
      activeGrazingSession: activeGrazingSessionCount > 0,
      activeGpsRecording: activeGrazingSessionCount > 0,
      activeWorkSession: activeWorkSessionCount > 0,
    }
  }, [])
  const hasLoadedPersistedFieldState = dbSnapshot !== undefined
  const snapshot = mergeFieldSafetySnapshots(
    dbSnapshot ?? emptyFieldSafetySnapshot,
    transientSnapshot
  )
  const online = useOnlineStatus()
  const active = isFieldOperationActive(snapshot)

  return {
    isFieldOperationActive: active,
    isOnline: online,
    canShowDisruptivePrompt: hasLoadedPersistedFieldState && online && !active,
    snapshot,
  }
}
