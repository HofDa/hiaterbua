'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/dexie'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type {
  Enclosure,
  Herd,
  WorkEvent,
  WorkSession,
  WorkStatus,
  WorkType,
} from '@/types/domain'

const workTypeOptions: { value: WorkType; label: string }[] = [
  { value: 'herding', label: 'Hüten' },
  { value: 'driving', label: 'Treiben' },
  { value: 'fence', label: 'Zaunbau' },
  { value: 'control', label: 'Kontrolle' },
  { value: 'water', label: 'Wasser' },
  { value: 'transport', label: 'Transport' },
  { value: 'other', label: 'Sonstiges' },
]

const reminderOptions = [
  { value: '0', label: 'Keine Erinnerung' },
  { value: '15', label: 'Alle 15 min' },
  { value: '30', label: 'Alle 30 min' },
  { value: '60', label: 'Alle 60 min' },
  { value: '90', label: 'Alle 90 min' },
]

function getWorkTypeLabel(type: WorkType) {
  return workTypeOptions.find((option) => option.value === type)?.label ?? type
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'unbekannt'
  return new Date(value).toLocaleString('de-DE')
}

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':')
}

function getLiveDurationS(session: WorkSession, nowMs: number) {
  if (!session.activeSince) return session.durationS

  const activeSinceMs = new Date(session.activeSince).getTime()
  if (!Number.isFinite(activeSinceMs)) return session.durationS

  return session.durationS + Math.max(0, Math.round((nowMs - activeSinceMs) / 1000))
}

function getNextReminderMs(session: WorkSession) {
  if (!session.reminderIntervalMin || session.reminderIntervalMin <= 0) return null

  const baseTime = session.lastReminderAt ?? session.activeSince ?? session.startTime
  const baseMs = new Date(baseTime).getTime()
  if (!Number.isFinite(baseMs)) return null

  return baseMs + session.reminderIntervalMin * 60 * 1000
}

async function addWorkEvent(
  workSessionId: string,
  type: WorkEvent['type'],
  comment?: string
) {
  await db.workEvents.add({
    id: createId('work_event'),
    workSessionId,
    timestamp: nowIso(),
    type,
    comment: comment?.trim() || undefined,
  })
}

export default function WorkPage() {
  const workSessions = useLiveQuery(
    () => db.workSessions.orderBy('updatedAt').reverse().limit(12).toArray(),
    []
  )
  const herds = useLiveQuery(() => db.herds.orderBy('name').toArray(), [])
  const enclosures = useLiveQuery(() => db.enclosures.orderBy('name').toArray(), [])

  const [workType, setWorkType] = useState<WorkType>('herding')
  const [selectedHerdId, setSelectedHerdId] = useState('')
  const [selectedEnclosureId, setSelectedEnclosureId] = useState('')
  const [reminderIntervalMin, setReminderIntervalMin] = useState('0')
  const [notes, setNotes] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [activeReminderMessage, setActiveReminderMessage] = useState('')
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editWorkType, setEditWorkType] = useState<WorkType>('herding')
  const [editSelectedHerdId, setEditSelectedHerdId] = useState('')
  const [editSelectedEnclosureId, setEditSelectedEnclosureId] = useState('')
  const [editReminderIntervalMin, setEditReminderIntervalMin] = useState('0')
  const [editNotes, setEditNotes] = useState('')
  const reminderTriggerRef = useRef<string | null>(null)

  const safeSessions = useMemo(() => workSessions ?? [], [workSessions])
  const safeHerds = useMemo(() => herds ?? [], [herds])
  const safeEnclosures = useMemo(() => enclosures ?? [], [enclosures])

  const activeSession = useMemo(
    () =>
      safeSessions.find(
        (session) => session.status === 'active' || session.status === 'paused'
      ) ?? null,
    [safeSessions]
  )

  const herdsById = useMemo(
    () => new Map(safeHerds.map((herd) => [herd.id, herd])),
    [safeHerds]
  )
  const enclosuresById = useMemo(
    () => new Map(safeEnclosures.map((enclosure) => [enclosure.id, enclosure])),
    [safeEnclosures]
  )

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
    const message = `${getWorkTypeLabel(activeSession.type)}: Erinnerung nach ${activeSession.reminderIntervalMin} min.`

    void db.workSessions.update(activeSession.id, {
      lastReminderAt: reminderTimestamp,
      updatedAt: reminderTimestamp,
    })

    void addWorkEvent(activeSession.id, 'note', message)

    setActiveReminderMessage(message)
    setStatusMessage('Erinnerung ausgelöst.')

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([180, 120, 180])
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (window.Notification.permission === 'granted') {
        void new window.Notification('Hiaterbua 1.0 Erinnerung', {
          body: message,
        })
      }
    }
  }, [activeSession, nextReminderMs, nowMs])

  useEffect(() => {
    if (!activeSession) {
      reminderTriggerRef.current = null
    }
  }, [activeSession])

  if (workSessions === undefined || herds === undefined || enclosures === undefined) {
    return <div className="rounded-[1.75rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)]">Lade Daten ...</div>
  }

  async function startWorkSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (activeSession) {
      setError('Es läuft bereits ein Arbeitseinsatz.')
      return
    }

    setIsSaving(true)
    setError('')
    setStatusMessage('')

    try {
      const timestamp = nowIso()
      const sessionId = createId('work_session')
      const parsedReminderIntervalMin = Number.parseInt(reminderIntervalMin, 10) || 0

      await db.workSessions.add({
        id: sessionId,
        type: workType,
        status: 'active',
        herdId: selectedHerdId || null,
        enclosureId: selectedEnclosureId || null,
        startTime: timestamp,
        endTime: null,
        activeSince: timestamp,
        durationS: 0,
        reminderIntervalMin: parsedReminderIntervalMin > 0 ? parsedReminderIntervalMin : null,
        lastReminderAt: parsedReminderIntervalMin > 0 ? timestamp : null,
        notes: notes.trim() || undefined,
        createdAt: timestamp,
        updatedAt: timestamp,
      })

      await addWorkEvent(sessionId, 'start', notes)

      if (
        parsedReminderIntervalMin > 0 &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        window.Notification.permission === 'default'
      ) {
        void window.Notification.requestPermission()
      }

      setNotes('')
      setSelectedHerdId('')
      setSelectedEnclosureId('')
      setReminderIntervalMin('0')
      setActiveReminderMessage('')
      setStatusMessage('Arbeitseinsatz gestartet.')
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : 'Arbeitseinsatz konnte nicht gestartet werden.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function updateWorkSessionStatus(nextStatus: WorkStatus) {
    if (!activeSession) return

    setIsSaving(true)
    setError('')
    setStatusMessage('')

    try {
      const timestamp = nowIso()
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

      await db.workSessions.update(activeSession.id, nextPatch)

      const eventType =
        nextStatus === 'paused'
          ? 'pause'
          : nextStatus === 'active'
            ? 'resume'
            : 'stop'

      await addWorkEvent(activeSession.id, eventType)

      setStatusMessage(
        nextStatus === 'paused'
          ? 'Arbeitseinsatz pausiert.'
          : nextStatus === 'active'
            ? 'Arbeitseinsatz fortgesetzt.'
            : 'Arbeitseinsatz beendet.'
      )

      if (nextStatus !== 'active') {
        setActiveReminderMessage('')
      }

      if (nextStatus === 'finished') {
        reminderTriggerRef.current = null
      }
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : 'Status konnte nicht aktualisiert werden.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  function startEditingSession(session: WorkSession) {
    setEditingSessionId(session.id)
    setEditWorkType(session.type)
    setEditSelectedHerdId(session.herdId ?? '')
    setEditSelectedEnclosureId(session.enclosureId ?? '')
    setEditReminderIntervalMin(String(session.reminderIntervalMin ?? 0))
    setEditNotes(session.notes ?? '')
    setError('')
    setStatusMessage('')
  }

  function cancelEditingSession() {
    setEditingSessionId(null)
    setEditWorkType('herding')
    setEditSelectedHerdId('')
    setEditSelectedEnclosureId('')
    setEditReminderIntervalMin('0')
    setEditNotes('')
  }

  async function saveEditedSession(sessionId: string) {
    setIsSaving(true)
    setError('')
    setStatusMessage('')

    try {
      const reminderValue = Number.parseInt(editReminderIntervalMin, 10) || 0
      const existingSession = safeSessions.find((session) => session.id === sessionId)
      const timestamp = nowIso()

      await db.workSessions.update(sessionId, {
        type: editWorkType,
        herdId: editSelectedHerdId || null,
        enclosureId: editSelectedEnclosureId || null,
        reminderIntervalMin: reminderValue > 0 ? reminderValue : null,
        lastReminderAt:
          reminderValue > 0
            ? existingSession?.lastReminderAt ?? existingSession?.activeSince ?? timestamp
            : null,
        notes: editNotes.trim() || undefined,
        updatedAt: timestamp,
      })

      await addWorkEvent(sessionId, 'note', 'Arbeitseinsatz bearbeitet')

      cancelEditingSession()
      setStatusMessage('Arbeitseinsatz aktualisiert.')
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : 'Arbeitseinsatz konnte nicht aktualisiert werden.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteWorkSession(session: WorkSession) {
    const confirmed = window.confirm(
      `Arbeitseinsatz "${getWorkTypeLabel(session.type)}" wirklich löschen?`
    )

    if (!confirmed) return

    setIsSaving(true)
    setError('')
    setStatusMessage('')

    try {
      await db.transaction('rw', db.workSessions, db.workEvents, async () => {
        await db.workEvents.where('workSessionId').equals(session.id).delete()
        await db.workSessions.delete(session.id)
      })

      if (editingSessionId === session.id) {
        cancelEditingSession()
      }

      if (activeSession?.id === session.id) {
        reminderTriggerRef.current = null
        setActiveReminderMessage('')
      }

      setStatusMessage('Arbeitseinsatz gelöscht.')
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : 'Arbeitseinsatz konnte nicht gelöscht werden.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {activeReminderMessage ? (
        <section className="rounded-3xl border border-[#ccb98a] bg-[#fffdf6] p-4 shadow-[0_16px_30px_rgba(40,34,26,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5e5549]">
                Erinnerung aktiv
              </div>
              <div className="mt-1 text-base font-semibold text-[#17130f]">{activeReminderMessage}</div>
            </div>
            <button
              type="button"
              onClick={() => setActiveReminderMessage('')}
              className="rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-semibold text-neutral-900 shadow-sm"
            >
              Erledigt
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-[2rem] border-2 border-[#3a342a] bg-[#fff8ea] p-6 text-[#17130f] shadow-[0_24px_60px_rgba(40,34,26,0.1)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5e5549]">
          Arbeit
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Arbeitszeit und Tätigkeiten</h1>
        <p className="mt-3 text-sm text-[#4f473c]">
          Allgemeine Arbeit mit Start, Pause, Fortsetzen und Stop erfassen.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
          <h2 className="text-lg font-semibold tracking-[-0.02em]">Neuer Arbeitseinsatz</h2>

          {activeSession ? (
            <div className="mt-4 rounded-[1.5rem] border border-[#ccb98a] bg-[#fffdf6] p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5e5549]">
                Aktiver Einsatz
              </div>
              <div className="mt-1 text-xl font-semibold text-[#17130f]">
                {getWorkTypeLabel(activeSession.type)}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
                  <div className="text-sm text-neutral-700">Status</div>
                  <div className="mt-1 font-medium text-neutral-900">
                    {activeSession.status === 'active' ? 'Läuft' : 'Pausiert'}
                  </div>
                </div>
                <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
                  <div className="text-sm text-neutral-700">Beginn</div>
                  <div className="mt-1 font-medium text-neutral-900">
                    {formatDateTime(activeSession.startTime)}
                  </div>
                </div>
                <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
                  <div className="text-sm text-neutral-700">Dauer</div>
                  <div className="mt-1 font-medium text-neutral-900">
                    {formatDuration(getLiveDurationS(activeSession, nowMs))}
                  </div>
                </div>
              </div>

              {activeSession.reminderIntervalMin ? (
                <div className="mt-3 rounded-[1.1rem] border border-[#d2cbc0] bg-[#efe4c8] px-4 py-3 text-sm text-[#17130f] shadow-sm">
                  Erinnerung alle{' '}
                  <span className="font-medium text-neutral-900">
                    {activeSession.reminderIntervalMin} min
                  </span>
                  {nextReminderMs ? (
                    <span>
                      {' '}· nächste in{' '}
                      <span className="font-medium text-neutral-900">
                        {formatDuration(Math.max(0, Math.round((nextReminderMs - nowMs) / 1000)))}
                      </span>
                    </span>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-3 text-sm text-neutral-700">
                {activeSession.herdId ? (
                  <div>Herde: {herdsById.get(activeSession.herdId)?.name ?? 'Unbekannt'}</div>
                ) : null}
                {activeSession.enclosureId ? (
                  <div>
                    Pferch: {enclosuresById.get(activeSession.enclosureId)?.name ?? 'Unbekannt'}
                  </div>
                ) : null}
                {activeSession.notes ? <div className="mt-1">{activeSession.notes}</div> : null}
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {activeSession.status === 'active' ? (
                  <button
                    type="button"
                    onClick={() => void updateWorkSessionStatus('paused')}
                    disabled={isSaving}
                    className="rounded-[1.1rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-4 text-base font-semibold text-[#17130f] shadow-[0_12px_24px_rgba(40,34,26,0.08)] disabled:opacity-50"
                  >
                    Pause setzen
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void updateWorkSessionStatus('active')}
                    disabled={isSaving}
                    className="rounded-[1.1rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-4 text-base font-semibold text-[#17130f] shadow-[0_12px_24px_rgba(40,34,26,0.08)] disabled:opacity-50"
                  >
                    Fortsetzen
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void updateWorkSessionStatus('finished')}
                  disabled={isSaving}
                  className="rounded-[1.1rem] border border-red-300 bg-[linear-gradient(135deg,#fff3f1,#ffd9d2)] px-4 py-4 text-base font-semibold text-red-900 shadow-[0_10px_20px_rgba(127,29,29,0.14)] disabled:opacity-50"
                >
                  Einsatz beenden
                </button>
              </div>
            </div>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={startWorkSession}>
              <div>
                <label className="mb-1 block text-sm font-medium">Tätigkeit</label>
                <select
                  className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
                  value={workType}
                  onChange={(event) => setWorkType(event.target.value as WorkType)}
                >
                  {workTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Herde</label>
                  <select
                    className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
                    value={selectedHerdId}
                    onChange={(event) => setSelectedHerdId(event.target.value)}
                  >
                    <option value="">Keine Zuordnung</option>
                    {safeHerds
                      .filter((herd) => !herd.isArchived)
                      .map((herd: Herd) => (
                        <option key={herd.id} value={herd.id}>
                          {herd.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Pferch</label>
                  <select
                    className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
                    value={selectedEnclosureId}
                    onChange={(event) => setSelectedEnclosureId(event.target.value)}
                  >
                    <option value="">Keine Zuordnung</option>
                    {safeEnclosures.map((enclosure: Enclosure) => (
                      <option key={enclosure.id} value={enclosure.id}>
                        {enclosure.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Notiz</label>
                <textarea
                  className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="optionale Bemerkung zum Einsatz"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Erinnerung</label>
                <select
                  className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
                  value={reminderIntervalMin}
                  onChange={(event) => setReminderIntervalMin(event.target.value)}
                >
                  {reminderOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs font-medium text-neutral-700">
                  Funktioniert als leichte In-App-Erinnerung, solange die App offen ist.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full rounded-[1.1rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-4 font-semibold text-[#17130f] shadow-[0_12px_24px_rgba(40,34,26,0.08)] disabled:opacity-50"
              >
                {isSaving ? 'Startet ...' : 'Arbeitseinsatz starten'}
              </button>
            </form>
          )}

          {error ? (
            <div className="mt-4 rounded-[1.1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {error}
            </div>
          ) : null}

          {statusMessage ? (
            <div className="mt-4 rounded-[1.1rem] border border-[#c5d3c8] bg-[#edf1ec] px-4 py-3 text-sm font-semibold text-[#243228]">
              {statusMessage}
            </div>
          ) : null}
        </div>

        <div className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
          <h2 className="text-lg font-semibold tracking-[-0.02em]">Übersicht</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
              <div className="text-neutral-700">Laufender Einsatz</div>
              <div className="mt-1 font-medium text-neutral-900">
                {activeSession ? getWorkTypeLabel(activeSession.type) : 'Keiner'}
              </div>
            </div>
            <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
              <div className="text-neutral-700">Letzter Status</div>
              <div className="mt-1 font-medium text-neutral-900">
                {activeSession
                  ? activeSession.status === 'active'
                    ? 'Läuft'
                    : 'Pausiert'
                  : 'Bereit'}
              </div>
            </div>
            <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
              <div className="text-neutral-700">Erfasste Einsaetze</div>
              <div className="mt-1 font-medium text-neutral-900">{safeSessions.length}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-[-0.02em]">Letzte Arbeitseinsaetze</h2>
          <span className="text-sm font-medium text-neutral-700">{safeSessions.length}</span>
        </div>

        {safeSessions.length === 0 ? (
          <div className="mt-4 rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm text-neutral-700 shadow-sm">
            Noch keine Arbeitseinsaetze erfasst.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {safeSessions.map((session) => (
              <article key={session.id} className="rounded-[1.15rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-neutral-900">
                      {getWorkTypeLabel(session.type)}
                    </div>
                    <div className="mt-1 text-sm text-neutral-700">
                      {formatDateTime(session.startTime)}
                      {session.endTime ? ` bis ${formatDateTime(session.endTime)}` : ' bis jetzt'}
                    </div>
                    <div className="mt-1 text-sm text-neutral-700">
                      Dauer{' '}
                      {formatDuration(
                        session.status === 'active'
                          ? getLiveDurationS(session, nowMs)
                          : session.durationS
                      )}
                      {session.herdId ? (
                        <> · Herde {herdsById.get(session.herdId)?.name ?? 'Unbekannt'}</>
                      ) : null}
                      {session.enclosureId ? (
                        <>
                          {' '}
                          · Pferch {enclosuresById.get(session.enclosureId)?.name ?? 'Unbekannt'}
                        </>
                      ) : null}
                    </div>
                    {session.notes ? (
                      <div className="mt-2 text-sm text-neutral-700">{session.notes}</div>
                    ) : null}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div
                      className={[
                        'rounded-full px-3 py-1 text-xs font-semibold',
                        session.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : session.status === 'paused'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-neutral-200 text-neutral-700',
                      ].join(' ')}
                    >
                      {session.status === 'active'
                        ? 'Läuft'
                        : session.status === 'paused'
                          ? 'Pausiert'
                          : 'Beendet'}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          editingSessionId === session.id
                            ? cancelEditingSession()
                            : startEditingSession(session)
                        }
                        className="rounded-full border border-[#ccb98a] bg-[#f1efeb] px-3 py-2 text-xs font-semibold text-neutral-950"
                      >
                        {editingSessionId === session.id ? 'Abbrechen' : 'Bearbeiten'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteWorkSession(session)}
                        disabled={isSaving}
                        className="rounded-full border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-900 disabled:opacity-50"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                </div>

                {editingSessionId === session.id ? (
                  <div className="mt-4 space-y-4 rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium">Tätigkeit</label>
                        <select
                          className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
                          value={editWorkType}
                          onChange={(event) => setEditWorkType(event.target.value as WorkType)}
                        >
                          {workTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Erinnerung</label>
                        <select
                          className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
                          value={editReminderIntervalMin}
                          onChange={(event) => setEditReminderIntervalMin(event.target.value)}
                        >
                          {reminderOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium">Herde</label>
                        <select
                          className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
                          value={editSelectedHerdId}
                          onChange={(event) => setEditSelectedHerdId(event.target.value)}
                        >
                          <option value="">Keine Zuordnung</option>
                          {safeHerds
                            .filter((herd) => !herd.isArchived)
                            .map((herd: Herd) => (
                              <option key={herd.id} value={herd.id}>
                                {herd.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium">Pferch</label>
                        <select
                          className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
                          value={editSelectedEnclosureId}
                          onChange={(event) => setEditSelectedEnclosureId(event.target.value)}
                        >
                          <option value="">Keine Zuordnung</option>
                          {safeEnclosures.map((enclosure: Enclosure) => (
                            <option key={enclosure.id} value={enclosure.id}>
                              {enclosure.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">Notiz</label>
                      <textarea
                        className="w-full rounded-[1.1rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-base shadow-sm"
                        rows={3}
                        value={editNotes}
                        onChange={(event) => setEditNotes(event.target.value)}
                        placeholder="optionale Bemerkung zum Einsatz"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void saveEditedSession(session.id)}
                        disabled={isSaving}
                        className="rounded-[1.1rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-3 text-sm font-semibold text-[#17130f] disabled:opacity-50"
                      >
                        {isSaving ? 'Speichert ...' : 'Änderungen speichern'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditingSession}
                        className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-semibold text-neutral-950"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
