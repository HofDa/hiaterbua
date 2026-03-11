import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { db } from '@/lib/db/dexie'
import {
  addWorkEvent,
  getNextReminderMs,
  getWorkLabel,
} from '@/lib/work/work-session-helpers'
import { nowIso } from '@/lib/utils/time'
import type { WorkSession } from '@/types/domain'

type UseWorkPageRemindersOptions = {
  activeSession: WorkSession | null
  setStatusMessage: Dispatch<SetStateAction<string>>
}

export function useWorkPageReminders({
  activeSession,
  setStatusMessage,
}: UseWorkPageRemindersOptions) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [activeReminderMessage, setActiveReminderMessage] = useState('')
  const reminderTriggerRef = useRef<string | null>(null)

  const nextReminderMs = useMemo(
    () => (activeSession ? getNextReminderMs(activeSession) : null),
    [activeSession]
  )

  useEffect(() => {
    if (!activeSession || activeSession.status !== 'active') return

    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [activeSession])

  useEffect(() => {
    if (!activeSession || activeSession.status !== 'active') return
    if (!activeSession.reminderIntervalMin || activeSession.reminderIntervalMin <= 0) return
    if (!nextReminderMs || nowMs < nextReminderMs) return

    const reminderKey = `${activeSession.id}:${nextReminderMs}`
    if (reminderTriggerRef.current === reminderKey) return
    reminderTriggerRef.current = reminderKey

    const reminderTimestamp = nowIso()
    const message = `${getWorkLabel(activeSession)}: Erinnerung nach ${activeSession.reminderIntervalMin} min.`

    void db.workSessions.update(activeSession.id, {
      lastReminderAt: reminderTimestamp,
      updatedAt: reminderTimestamp,
    })

    void addWorkEvent(activeSession.id, 'note', message)

    queueMicrotask(() => {
      setActiveReminderMessage(message)
      setStatusMessage('Erinnerung ausgelöst.')
    })

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([180, 120, 180])
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (window.Notification.permission === 'granted') {
        void new window.Notification('Pastore 1.0 Erinnerung', {
          body: message,
        })
      }
    }
  }, [activeSession, nextReminderMs, nowMs, setStatusMessage])

  useEffect(() => {
    if (!activeSession) {
      reminderTriggerRef.current = null
    }
  }, [activeSession])

  function resetReminderTrigger() {
    reminderTriggerRef.current = null
  }

  return {
    nextReminderMs,
    nowMs,
    activeReminderMessage,
    setActiveReminderMessage,
    resetReminderTrigger,
  }
}
