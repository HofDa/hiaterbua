'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useRecoveryNoticeStore } from '@/lib/session-recovery/recovery-notice-store'
import { useLiveQuery } from 'dexie-react-hooks'
import { getHerdsByIds } from '@/lib/db/repositories/herds'
import { withSessionRecordingLock } from '@/lib/db/session-recording-lock'
import {
  getGrazingSession,
  pauseGrazingSessionRecord,
  resumeGrazingSessionRecord,
  stopGrazingSessionRecord,
  listUnfinishedSessions,
} from '@/lib/db/repositories/sessions'
import {
  getWorkSession,
  listUnfinishedWorkSessions,
  updateWorkSessionStatusRecord,
} from '@/lib/db/repositories/work-sessions'
import { useTransientFieldOperation } from '@/lib/field-safety/field-safety-store'
import { formatDuration } from '@/lib/maps/grazing-session-map-helpers'
import { logSessionRecoveryEvent } from '@/lib/session-recovery/session-recovery-events'
import {
  buildGrazingRecoverableSession,
  buildWorkRecoverableSession,
  getCurrentRecoverableSession,
  getLiveRecoverableDurationS,
  getRecoverableSessionKey,
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
import { RotateCcw } from 'lucide-react'
import { useConfirm } from '@/components/ui/confirm-dialog'
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

function getSessionTypeLabel(kind: RecoverableSession['kind']) {
  return kind === 'grazing' ? 'Weidegang' : 'Arbeitseinsatz'
}

function getRecoveredSessionStorageKey(sessionKey: string) {
  return `${SESSION_RECOVERY_RECOVERED_KEY_PREFIX}${sessionKey}`
}

const DISMISSED_KEY_PREFIX = 'pastore:session-recovery-dismissed:'

function readDismissedSessionKey(sessionKey: string) {
  try {
    return window.sessionStorage.getItem(`${DISMISSED_KEY_PREFIX}${sessionKey}`) !== null
  } catch {
    return false
  }
}

function writeDismissedSessionKey(sessionKey: string) {
  try {
    window.sessionStorage.setItem(`${DISMISSED_KEY_PREFIX}${sessionKey}`, new Date().toISOString())
  } catch {
    // Private mode or blocked storage: the dismissal still holds in memory.
  }
}

/**
 * Keys of the sessions that were already open when this page loaded — the only
 * ones that were actually *recovered*. A session started in this page lifetime
 * is healthy and must not raise the recovery card or log a recovery event.
 */
async function loadSessionKeysOpenAtStart() {
  const [grazingSessions, workSessions] = await Promise.all([
    listUnfinishedSessions(),
    listUnfinishedWorkSessions(),
  ])
  return new Set([
    ...grazingSessions.map((session) => getRecoverableSessionKey('grazing', session.id)),
    ...workSessions.map((session) => getRecoverableSessionKey('work', session.id)),
  ])
}

export function SessionRecoveryManager() {
  const router = useRouter()
  const pathname = usePathname()
  const setPendingSessionKey = useRecoveryNoticeStore((state) => state.setPendingSessionKey)
  const confirm = useConfirm()
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [dismissedSessionKeys, setDismissedSessionKeys] = useState<ReadonlySet<string>>(
    () => new Set()
  )
  const [keysOpenAtStart, setKeysOpenAtStart] = useState<ReadonlySet<string> | null>(null)
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const activeSessions = useLiveQuery<RecoverableSession[]>(async () => {
    const [grazingSessions, workSessions] = await Promise.all([
      listUnfinishedSessions(),
      listUnfinishedWorkSessions(),
    ])

    const herds = await getHerdsByIds(
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
  const visibleSession = keysOpenAtStart
    ? getCurrentRecoverableSession(
        safeActiveSessions.filter(
          (session) =>
            keysOpenAtStart.has(session.key) &&
            !dismissedSessionKeys.has(session.key) &&
            !readDismissedSessionKey(session.key)
        )
      )
    : null
  const activeSessionsRef = useRef<RecoverableSession[]>([])
  const runtimeLoggedEventsRef = useRef(new Set<string>())

  useEffect(() => {
    let cancelled = false
    void loadSessionKeysOpenAtStart()
      .then((keys) => {
        if (!cancelled) setKeysOpenAtStart(keys)
      })
      .catch(() => {
        if (!cancelled) setKeysOpenAtStart(new Set())
      })
    return () => {
      cancelled = true
    }
  }, [])

  const dismissSession = useCallback((sessionKey: string) => {
    writeDismissedSessionKey(sessionKey)
    setDismissedSessionKeys((current) => new Set(current).add(sessionKey))
  }, [])

  const visibleSessionKey = visibleSession?.key ?? null
  useEffect(() => {
    setPendingSessionKey(visibleSessionKey)
  }, [setPendingSessionKey, visibleSessionKey])

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

      // Only sessions that were open when the page loaded were recovered.
      if (typeof window !== 'undefined' && keysOpenAtStart?.has(session.key)) {
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
  }, [keysOpenAtStart, logRecoveryEventOnce, safeActiveSessions])

  // The tick only drives the live duration of the visible recovery card, and
  // only an active session's duration moves. Without this gate the manager
  // re-rendered every second for the lifetime of the app.
  const tickNeeded = visibleSession?.status === 'active'
  useEffect(() => {
    if (!tickNeeded) return

    setNowMs(Date.now())
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [tickNeeded])

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
          const storedSession = await getWorkSession(session.id)
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

      dismissSession(session.key)
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
      dismissSession(session.key)
      return
    }

    setActionError('')
    setActionMessage('')
    setIsSaving(true)

    try {
      if (session.kind === 'work') {
        const storedSession = await getWorkSession(session.id)
        if (storedSession) {
          await updateWorkSessionStatusRecord(storedSession, 'paused')
        }
      } else {
        const storedSession = await getGrazingSession(session.id)
        if (storedSession) {
          // Through the recording lock: another tab may still be appending GPS
          // points to this session, and its metrics are recomputed from what is
          // actually stored.
          await withSessionRecordingLock(session.id, async () => {
            await pauseGrazingSessionRecord({ sessionId: session.id, position: null })
          })
        }
      }

      setActionMessage('Pause eingetragen.')
      dismissSession(session.key)
    } catch {
      setActionError('Pause konnte nicht eingetragen werden.')
    } finally {
      setIsSaving(false)
    }
  }

  async function finishSession(session: RecoverableSession) {
    const confirmed = await confirm({
      title: `${getSessionTypeLabel(session.kind)} beenden?`,
      description:
        session.kind === 'grazing'
          ? 'Die GPS-Aufzeichnung wird abgeschlossen und gespeichert. Danach zeichnet dieser Weidegang nicht mehr auf.'
          : 'Der Arbeitseinsatz wird abgeschlossen und gespeichert.',
      confirmLabel: 'Beenden',
      cancelLabel: 'Weiterlaufen lassen',
      destructive: true,
    })
    if (!confirmed) return

    setActionError('')
    setActionMessage('')
    setIsSaving(true)

    try {
      if (session.kind === 'work') {
        const storedSession = await getWorkSession(session.id)
        if (storedSession) {
          await updateWorkSessionStatusRecord(storedSession, 'finished')
        }
      } else {
        const storedSession = await getGrazingSession(session.id)
        if (storedSession) {
          await withSessionRecordingLock(session.id, async () => {
            await stopGrazingSessionRecord({ sessionId: session.id, position: null })
          })
        }
      }

      setActionMessage('Sitzung beendet.')
      dismissSession(session.key)
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

  // The full card belongs on Start and on the session's own screen; other
  // screens show the tinted recording bar (see RecordingStatusBar).
  const isOwnScreen = Boolean(pathname?.startsWith(visibleSession.href))
  if (pathname !== '/' && !isOwnScreen) return null

  // On the session's own screen the live panel already has Pause/Beenden;
  // the recovery only needs to say what happened, in one line.
  if (isOwnScreen) {
    return (
      <div className="mx-auto max-w-6xl px-3 pt-3 md:px-4 xl:max-w-[88rem]">
        <div
          role="status"
          className="flex items-center gap-3 rounded-[1.1rem] border-2 border-primary bg-surface px-4 py-2 text-ink-strong"
        >
          <RotateCcw aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" strokeWidth={2.6} />
          <p className="min-w-0 flex-1 text-sm font-semibold">
            {visibleSession.status === 'active'
              ? 'Nach Neustart fortgesetzt · nichts verloren'
              : 'Nach Neustart wiederhergestellt · pausiert'}
          </p>
          <button
            type="button"
            onClick={() => dismissSession(visibleSession.key)}
            className="min-h-11 shrink-0 rounded-full border-2 border-border-strong px-4 text-sm font-semibold"
          >
            OK
          </button>
        </div>
      </div>
    )
  }

  const metadata = readStoredMetadata()[visibleSession.key]
  const liveDurationS = getLiveRecoverableDurationS(visibleSession, nowMs)
  const lastLocalSaveAt = metadata?.lastLocalSaveAt ?? visibleSession.updatedAt
  const isActive = visibleSession.status === 'active'
  const statusLine = isActive
    ? `${getSessionTypeLabel(visibleSession.kind)} läuft weiter – nichts verloren. Zuletzt gespeichert: ${formatDateTime(lastLocalSaveAt)}.`
    : `${getSessionTypeLabel(visibleSession.kind)} ist pausiert. Zuletzt gespeichert: ${formatDateTime(lastLocalSaveAt)}.`

  return (
    <section className="mx-auto max-w-6xl px-3 pt-3 md:px-4 xl:max-w-[88rem]">
      <div className="rounded-[1.35rem] border-2 border-primary bg-surface p-4 text-ink-strong">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <RotateCcw aria-hidden="true" className="h-5 w-5" strokeWidth={2.6} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-tight">App wurde neu geöffnet</h2>
            <p className="mt-0.5 text-base font-semibold text-ink [overflow-wrap:anywhere]">
              {visibleSession.label} · <span className="tabular-nums">{formatDuration(liveDurationS)}</span>
            </p>
            <p className="mt-1 text-sm font-medium text-ink-muted">{statusLine}</p>
          </div>
        </div>

        {metadata?.longInactivityDetectedAt ? (
          <p className="mt-3 rounded-[1rem] border-2 border-warning-border bg-warning-surface px-3 py-2 text-sm font-semibold text-warning-ink">
            Die App war länger zu. Bitte prüfe kurz, ob die Aufzeichnung noch stimmt.
          </p>
        ) : null}

        {actionError ? (
          <p className="mt-3 rounded-[1rem] border border-error-border bg-error-surface px-3 py-2 text-sm font-semibold text-error-ink">
            {actionError}
          </p>
        ) : null}

        <div className="mt-4 grid gap-2">
          <FormButton
            type="button"
            onClick={() => void continueSession(visibleSession)}
            disabled={isSaving}
            variant="primary"
            className="min-h-14 text-base"
          >
            {isActive
              ? visibleSession.kind === 'grazing'
                ? 'Zum Weidegang'
                : 'Zum Arbeitseinsatz'
              : 'Fortsetzen'}
          </FormButton>
          <div className="grid grid-cols-2 gap-2">
            <FormButton
              type="button"
              onClick={() => void pauseSession(visibleSession)}
              disabled={isSaving || !isActive}
              variant="secondary"
              className="min-h-12"
            >
              Pause
            </FormButton>
            <FormButton
              type="button"
              onClick={() => void finishSession(visibleSession)}
              disabled={isSaving}
              variant="danger"
              className="min-h-12 border-2 bg-surface-raised"
            >
              Beenden
            </FormButton>
          </div>
        </div>
      </div>
    </section>
  )
}
