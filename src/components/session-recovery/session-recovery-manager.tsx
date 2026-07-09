'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/dexie'
import {
  pauseGrazingSessionRecord,
  resumeGrazingSessionRecord,
  stopGrazingSessionRecord,
  listSessionTrackpoints,
} from '@/lib/db/repositories/sessions'
import { updateWorkSessionStatusRecord } from '@/lib/db/repositories/work-sessions'
import { useTransientFieldOperation } from '@/lib/field-safety/field-safety-store'
import { formatDuration } from '@/lib/maps/grazing-session-map-helpers'
import { logSessionRecoveryEvent } from '@/lib/session-recovery/session-recovery-events'
import {
  buildGrazingRecoverableSession,
  buildWorkRecoverableSession,
  getCurrentRecoverableSession,
  getLiveRecoverableDurationS,
  pruneRecoveryMetadata,
  readRecoveryMetadata,
  SESSION_RECOVERY_METADATA_KEY,
  SESSION_RECOVERY_RECOVERED_KEY_PREFIX,
  shouldLogLongInactivityGap,
  writeRecoveryMetadata,
  type RecoverableSession,
  type RecoveryMetadata,
} from '@/lib/session-recovery/session-recovery-state'
import { getWorkLabel } from '@/lib/work/work-session-helpers'
import { FormButton } from '@/components/ui/form'
import { cn } from '@/lib/utils/cn'

function readStoredMetadata(): RecoveryMetadata {
  if (typeof window === 'undefined') return {}
  return readRecoveryMetadata(window.localStorage.getItem(SESSION_RECOVERY_METADATA_KEY))
}

function writeStoredMetadata(metadata: RecoveryMetadata) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SESSION_RECOVERY_METADATA_KEY, JSON.stringify(metadata))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getStatusLabel(status: RecoverableSession['status']) {
  return status === 'active' ? 'läuft' : 'pausiert'
}

function getSessionTypeLabel(kind: RecoverableSession['kind']) {
  return kind === 'grazing' ? 'Weidegang' : 'Arbeitseinsatz'
}

function getRecoveredSessionStorageKey(sessionKey: string) {
  return `${SESSION_RECOVERY_RECOVERED_KEY_PREFIX}${sessionKey}`
}

export function SessionRecoveryManager() {
  const router = useRouter()
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [dismissedSessionKey, setDismissedSessionKey] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const activeSessions = useLiveQuery<RecoverableSession[]>(async () => {
    const [grazingSessions, workSessions] = await Promise.all([
      db.sessions.where('status').anyOf('active', 'paused').toArray(),
      db.workSessions.where('status').anyOf('active', 'paused').toArray(),
    ])

    const herds = await db.herds.bulkGet(
      Array.from(new Set(grazingSessions.map((session) => session.herdId)))
    )
    const herdsById = new Map(
      herds
        .filter((herd): herd is NonNullable<typeof herd> => Boolean(herd))
        .map((herd) => [herd.id, herd])
    )

    return [
      ...grazingSessions.map((session) =>
        buildGrazingRecoverableSession({
          session,
          herdName: herdsById.get(session.herdId)?.name,
        })
      ),
      ...workSessions.map((session) =>
        buildWorkRecoverableSession({
          session,
          label: getWorkLabel(session),
        })
      ),
    ]
  }, [])
  const safeActiveSessions = useMemo(() => activeSessions ?? [], [activeSessions])
  const visibleSession = getCurrentRecoverableSession(
    safeActiveSessions.filter((session) => session.key !== dismissedSessionKey)
  )
  const activeSessionsRef = useRef<RecoverableSession[]>([])
  const runtimeLoggedEventsRef = useRef(new Set<string>())

  useTransientFieldOperation(
    'session-recovery-active',
    'session-recovery',
    safeActiveSessions.length > 0
  )

  useEffect(() => {
    activeSessionsRef.current = safeActiveSessions
  }, [safeActiveSessions])

  const logRecoveryEventOnce = useCallback(
    async (
      session: RecoverableSession,
      eventKey: string,
      message: string,
      metadataPatch: Partial<RecoveryMetadata[string]> = {}
    ) => {
      const dedupeKey = `${session.key}:${eventKey}`
      if (runtimeLoggedEventsRef.current.has(dedupeKey)) {
        return
      }
      runtimeLoggedEventsRef.current.add(dedupeKey)

      const nowIso = new Date().toISOString()
      try {
        await logSessionRecoveryEvent(session, message)
      } finally {
        const metadata = writeRecoveryMetadata(readStoredMetadata(), session, {
          lastSeenAt: nowIso,
          lastLocalSaveAt: nowIso,
          ...metadataPatch,
        })
        writeStoredMetadata(metadata)
      }
    },
    []
  )

  useEffect(() => {
    if (safeActiveSessions.length === 0) {
      setDismissedSessionKey(null)
      writeStoredMetadata({})
      return
    }

    const nowIso = new Date().toISOString()
    const activeSessionKeys = new Set(safeActiveSessions.map((session) => session.key))
    let metadata = pruneRecoveryMetadata(readStoredMetadata(), activeSessionKeys)

    safeActiveSessions.forEach((session) => {
      const previousMetadata = metadata[session.key]
      if (shouldLogLongInactivityGap({ metadata: previousMetadata, nowIso })) {
        void logRecoveryEventOnce(
          session,
          'long-gap',
          `Längere Inaktivität erkannt seit ${formatDateTime(previousMetadata!.lastSeenAt)}.`
        )
        metadata = writeRecoveryMetadata(metadata, session, {
          longInactivityDetectedAt: nowIso,
          lastLocalSaveAt: nowIso,
        })
      }

      if (typeof window !== 'undefined') {
        const recoveredKey = getRecoveredSessionStorageKey(session.key)
        if (!window.sessionStorage.getItem(recoveredKey)) {
          window.sessionStorage.setItem(recoveredKey, nowIso)
          void logRecoveryEventOnce(
            session,
            'recovered',
            'Aktive Sitzung nach App-Start oder Reload wiedergefunden.'
          )
          metadata = writeRecoveryMetadata(metadata, session, {
            lastLocalSaveAt: nowIso,
          })
        }
      }

      metadata = writeRecoveryMetadata(metadata, session, {
        lastSeenAt: nowIso,
        lastLocalSaveAt: previousMetadata?.lastLocalSaveAt ?? session.updatedAt,
      })
    })

    writeStoredMetadata(metadata)
  }, [logRecoveryEventOnce, safeActiveSessions])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  const markLifecycleForActiveSessions = useCallback(
    (
      eventKey: string,
      message: string,
      metadataPatch: Partial<RecoveryMetadata[string]> = {}
    ) => {
      const transitionKey = `${eventKey}:${Date.now()}`
      activeSessionsRef.current.forEach((session) => {
        void logRecoveryEventOnce(session, transitionKey, message, metadataPatch)
      })
    },
    [logRecoveryEventOnce]
  )

  useEffect(() => {
    function handleVisibilityChange() {
      const nowIso = new Date().toISOString()

      if (document.visibilityState === 'hidden') {
        markLifecycleForActiveSessions(
          'background',
          'App wurde während aktiver Sitzung in den Hintergrund gelegt.',
          {
            wasBackgrounded: true,
            backgroundedSince: nowIso,
          }
        )
        return
      }

      if (document.visibilityState === 'visible') {
        const metadata = readStoredMetadata()
        activeSessionsRef.current.forEach((session) => {
          const previousMetadata = metadata[session.key]
          if (shouldLogLongInactivityGap({ metadata: previousMetadata, nowIso })) {
            void logRecoveryEventOnce(
              session,
              `long-gap:${previousMetadata?.lastSeenAt}`,
              `Längere Inaktivität erkannt seit ${formatDateTime(previousMetadata!.lastSeenAt)}.`,
              { longInactivityDetectedAt: nowIso }
            )
          }
        })

        markLifecycleForActiveSessions(
          'foreground',
          'App ist während aktiver Sitzung wieder im Vordergrund.',
          {
            backgroundedSince: null,
          }
        )
      }
    }

    function handleOffline() {
      markLifecycleForActiveSessions(
        'offline',
        'Gerät ist während aktiver Sitzung offline gegangen.',
        {
          wasOffline: true,
          offlineSince: new Date().toISOString(),
        }
      )
    }

    function handleOnline() {
      markLifecycleForActiveSessions(
        'online',
        'Gerät ist während aktiver Sitzung wieder online.',
        {
          offlineSince: null,
        }
      )
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [logRecoveryEventOnce, markLifecycleForActiveSessions])

  async function continueSession(session: RecoverableSession) {
    setActionError('')
    setActionMessage('')
    setIsSaving(true)

    try {
      if (session.status === 'paused') {
        if (session.kind === 'work') {
          const storedSession = await db.workSessions.get(session.id)
          if (storedSession) {
            await updateWorkSessionStatusRecord(storedSession, 'active')
          }
        } else {
          await resumeGrazingSessionRecord({
            sessionId: session.id,
            position: null,
          })
        }
      }

      setDismissedSessionKey(session.key)
      router.push(session.href)
    } catch {
      setActionError('Sitzung konnte nicht weitergeführt werden.')
    } finally {
      setIsSaving(false)
    }
  }

  async function pauseSession(session: RecoverableSession) {
    if (session.status === 'paused') {
      setActionMessage('Sitzung ist bereits pausiert.')
      setDismissedSessionKey(session.key)
      return
    }

    setActionError('')
    setActionMessage('')
    setIsSaving(true)

    try {
      if (session.kind === 'work') {
        const storedSession = await db.workSessions.get(session.id)
        if (storedSession) {
          await updateWorkSessionStatusRecord(storedSession, 'paused')
        }
      } else {
        const storedSession = await db.sessions.get(session.id)
        if (storedSession) {
          await pauseGrazingSessionRecord({
            sessionId: session.id,
            startTime: storedSession.startTime,
            trackpoints: await listSessionTrackpoints(session.id),
            position: null,
          })
        }
      }

      setActionMessage('Pause eingetragen.')
      setDismissedSessionKey(session.key)
    } catch {
      setActionError('Pause konnte nicht eingetragen werden.')
    } finally {
      setIsSaving(false)
    }
  }

  async function finishSession(session: RecoverableSession) {
    setActionError('')
    setActionMessage('')
    setIsSaving(true)

    try {
      if (session.kind === 'work') {
        const storedSession = await db.workSessions.get(session.id)
        if (storedSession) {
          await updateWorkSessionStatusRecord(storedSession, 'finished')
        }
      } else {
        const storedSession = await db.sessions.get(session.id)
        if (storedSession) {
          await stopGrazingSessionRecord({
            sessionId: session.id,
            startTime: storedSession.startTime,
            trackpoints: await listSessionTrackpoints(session.id),
            position: null,
          })
        }
      }

      setActionMessage('Sitzung beendet.')
      setDismissedSessionKey(session.key)
    } catch {
      setActionError('Sitzung konnte nicht beendet werden.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!visibleSession) {
    return actionMessage || actionError ? (
      <div className="mx-auto max-w-6xl px-3 pt-3 md:px-4 xl:max-w-[88rem]">
        <div
          className={cn(
            'rounded-[1.1rem] border px-4 py-3 text-sm font-semibold',
            actionError
              ? 'border-error-border bg-error-surface text-error-ink'
              : 'border-success-border bg-success-surface text-success-ink'
          )}
        >
          {actionError || actionMessage}
        </div>
      </div>
    ) : null
  }

  const metadata = readStoredMetadata()[visibleSession.key]
  const liveDurationS = getLiveRecoverableDurationS(visibleSession, nowMs)
  const lastLocalSaveAt = metadata?.lastLocalSaveAt ?? visibleSession.updatedAt
  const interruptionStatus = [
    metadata?.wasOffline ? 'Offline-Unterbrechung erkannt' : 'keine Offline-Unterbrechung',
    metadata?.wasBackgrounded ? 'App war im Hintergrund' : 'keine Hintergrundphase erkannt',
  ]

  return (
    <section className="mx-auto max-w-6xl px-3 pt-3 md:px-4 xl:max-w-[88rem]">
      <div className="rounded-[1.2rem] border-2 border-border-ink bg-surface p-4 text-ink-strong shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Sitzung wiederhergestellt
            </div>
            <h2 className="mt-1 text-lg font-semibold">
              {getSessionTypeLabel(visibleSession.kind)} {getStatusLabel(visibleSession.status)}
            </h2>
            <p className="mt-1 text-sm font-medium text-ink-muted">
              {visibleSession.label}
            </p>
          </div>

          <div className="grid gap-2 text-sm font-medium text-ink-muted sm:grid-cols-2 lg:min-w-[28rem]">
            <div>Start: {formatDateTime(visibleSession.startTime)}</div>
            <div>Dauer: {formatDuration(liveDurationS)}</div>
            <div>Letzte lokale Speicherung: {formatDateTime(lastLocalSaveAt)}</div>
            <div>{interruptionStatus.join(' · ')}</div>
          </div>
        </div>

        {metadata?.longInactivityDetectedAt ? (
          <p className="mt-3 rounded-[1rem] border border-warning-border bg-warning-surface px-3 py-2 text-sm font-semibold text-warning-ink">
            Längere Inaktivität erkannt. Bitte prüfe kurz, ob die Sitzung noch stimmt.
          </p>
        ) : null}

        {actionError ? (
          <p className="mt-3 rounded-[1rem] border border-error-border bg-error-surface px-3 py-2 text-sm font-semibold text-error-ink">
            {actionError}
          </p>
        ) : null}

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <FormButton
            type="button"
            onClick={() => void continueSession(visibleSession)}
            disabled={isSaving}
            variant="primary"
            className="min-h-[3.5rem]"
          >
            Weiterführen
          </FormButton>
          <FormButton
            type="button"
            onClick={() => void pauseSession(visibleSession)}
            disabled={isSaving || visibleSession.status === 'paused'}
            variant="secondary"
            className="min-h-[3.5rem]"
          >
            Pause eintragen
          </FormButton>
          <FormButton
            type="button"
            onClick={() => void finishSession(visibleSession)}
            disabled={isSaving}
            variant="danger"
            className="min-h-[3.5rem]"
          >
            Beenden
          </FormButton>
        </div>
      </div>
    </section>
  )
}
