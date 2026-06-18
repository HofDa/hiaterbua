import { useEffect, useRef, useState } from 'react'
import { formatAccuracy } from '@/lib/maps/map-core'
import { FormField, FormLabel, FormSelect, FormTextarea, FormButton } from '@/components/ui/form'
import { cn } from '@/lib/utils/cn'
import {
  formatDateTime,
  formatDistance,
  formatDuration,
  getSessionEventLabel,
  type SessionMetrics,
} from '@/lib/maps/grazing-session-map-helpers'
import type {
  Herd,
  SessionEvent,
  SessionEventType,
  SessionStatus,
} from '@/types/domain'

export function GrazingSessionManagementSetupFields({
  safeHerds,
  selectedHerdId,
  currentSessionStatus,
  onSelectedHerdIdChange,
}: {
  safeHerds: Herd[]
  selectedHerdId: string
  currentSessionStatus: SessionStatus | null
  onSelectedHerdIdChange: (value: string) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Herde</label>
        <div className="grid gap-3 lg:hidden">
          {safeHerds.length === 0 ? (
            <div className="rounded-[1.35rem] border-2 border-dashed border-border bg-surface-raised px-4 py-4 text-sm text-neutral-600">
              Noch keine Herde angelegt.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {safeHerds.map((herd) => {
                const isSelected = selectedHerdId === herd.id

                return (
                  <button
                    key={herd.id}
                    type="button"
                    onClick={() => onSelectedHerdIdChange(herd.id)}
                    disabled={currentSessionStatus !== null}
                    aria-pressed={isSelected}
                    className={[
                      'min-h-20 rounded-[1.4rem] border-2 px-4 py-4 text-left text-sm font-semibold leading-tight whitespace-normal shadow-sm transition-colors disabled:opacity-50',
                      isSelected
                        ? 'border-border-strong bg-accent text-ink'
                        : 'border-border bg-surface-raised text-neutral-950',
                    ].join(' ')}
                  >
                    <div className="[overflow-wrap:anywhere]">{herd.name}</div>
                    <div className="mt-2 text-xs font-medium uppercase tracking-[0.08em] text-neutral-600">
                      {isSelected ? 'Ausgewählt' : 'Zum Start wählen'}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <FormSelect
          value={selectedHerdId}
          onChange={(event) => onSelectedHerdIdChange(event.target.value)}
          disabled={currentSessionStatus !== null}
          className="hidden lg:block"
        >
          <option value="">Bitte wählen</option>
          {safeHerds.map((herd) => (
            <option key={herd.id} value={herd.id}>
              {herd.name}
            </option>
          ))}
        </FormSelect>
      </div>
    </div>
  )
}

export function GrazingSessionActiveSummary({
  safeHerds,
  selectedHerdId,
  selectedAnimalCount,
}: {
  safeHerds: Herd[]
  selectedHerdId: string
  selectedAnimalCount: number | null
}) {
  const selectedHerd = safeHerds.find((herd) => herd.id === selectedHerdId) ?? null

  return (
    <div className="grid grid-cols-2 gap-3 lg:hidden">
      <div className="rounded-[1.25rem] border-2 border-border bg-surface-raised px-4 py-4 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-[0.08em] text-neutral-600">
          Herde
        </div>
        <div className="mt-2 text-sm font-semibold leading-tight text-neutral-950 [overflow-wrap:anywhere]">
          {selectedHerd?.name ?? 'Nicht gewählt'}
        </div>
      </div>
      <div className="rounded-[1.25rem] border-2 border-border bg-surface-raised px-4 py-4 text-center shadow-sm">
        <div className="text-xs font-medium uppercase tracking-[0.08em] text-neutral-600">
          Tiere
        </div>
        <div className="mt-2 text-2xl font-semibold text-neutral-950">
          {selectedAnimalCount ?? 0}
        </div>
      </div>
    </div>
  )
}

function MobileFlowStepHeader({
  label,
  sublabel,
  onBack,
}: {
  label: string
  sublabel: string
  onBack: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-border-soft bg-surface-warm px-3.5 py-3 text-ink">
      <button
        type="button"
        onClick={onBack}
        className="shrink-0 rounded-full border border-border-strong bg-surface-raised px-3 py-1.5 text-sm font-semibold text-ink"
      >
        Zurück
      </button>
      <div className="min-w-0 text-right">
        <div className="text-sm font-semibold leading-tight [overflow-wrap:anywhere]">{label}</div>
        <div className="mt-0.5 text-xs font-medium leading-tight text-neutral-700">{sublabel}</div>
      </div>
    </div>
  )
}

function MetricItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-[1.1rem] border border-border bg-surface-raised px-4 py-3 shadow-sm">
      <div className="text-xs leading-tight text-neutral-700">{label}</div>
      <div className="mt-1 font-medium text-neutral-900">{value}</div>
    </div>
  )
}

export function GrazingSessionMobileStartFlow({
  safeHerds,
  selectedHerdId,
  selectedAnimalCount,
  sessionNotes,
  isSaving,
  onSelectedHerdIdChange,
  onAdjustAnimalCount,
  onSessionNotesChange,
  onStartSession,
}: {
  safeHerds: Herd[]
  selectedHerdId: string
  selectedAnimalCount: number | null
  sessionNotes: string
  isSaving: boolean
  onSelectedHerdIdChange: (value: string) => void
  onAdjustAnimalCount: (delta: number) => void | Promise<void>
  onSessionNotesChange: (value: string) => void
  onStartSession: () => void | Promise<void>
}) {
  const flowRef = useRef<HTMLDivElement | null>(null)
  const [internalStep, setInternalStep] = useState<'herd' | 'count' | 'confirm'>('herd')
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [hasStartedFlow, setHasStartedFlow] = useState(false)
  const mobileStep = selectedHerdId ? internalStep : 'herd'
  const animalCount = selectedAnimalCount ?? 0
  const selectedHerd = safeHerds.find((herd) => herd.id === selectedHerdId) ?? null

  useEffect(() => {
    if (!hasStartedFlow || typeof window === 'undefined') {
      return
    }

    if (!window.matchMedia('(max-width: 1023px)').matches) {
      return
    }

    const card = flowRef.current?.closest('[data-grazing-session-management-card="true"]')
    if (!(card instanceof HTMLElement)) {
      return
    }

    const rafId = window.requestAnimationFrame(() => {
      card.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    })

    return () => window.cancelAnimationFrame(rafId)
  }, [hasStartedFlow, isDetailsOpen, mobileStep])

  return (
    <div ref={flowRef} className="space-y-4 lg:hidden">
      {mobileStep === 'herd' ? (
        <>
          {safeHerds.length === 0 ? (
            <div className="rounded-[1.35rem] border-2 border-dashed border-border bg-surface-raised px-4 py-4 text-sm text-neutral-600">
              Noch keine Herde angelegt.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {safeHerds.map((herd) => {
                const isSelected = selectedHerdId === herd.id

                return (
                  <button
                    key={herd.id}
                    type="button"
                    onClick={() => {
                      setHasStartedFlow(true)
                      onSelectedHerdIdChange(herd.id)
                      setIsDetailsOpen(false)
                      setInternalStep('count')
                    }}
                    aria-pressed={isSelected}
                    className={[
                      'min-h-[4.75rem] rounded-[1.35rem] border-2 px-4 py-4 text-left text-sm font-semibold leading-tight whitespace-normal shadow-[0_12px_24px_rgba(40,34,26,0.08)] transition-colors',
                      isSelected
                        ? 'border-border-strong bg-accent text-ink'
                        : 'border-border bg-surface-raised text-neutral-950',
                    ].join(' ')}
                  >
                    <span className="block [overflow-wrap:anywhere]">{herd.name}</span>
                  </button>
                )
              })}
            </div>
          )}
        </>
      ) : null}

      {mobileStep === 'count' ? (
        <>
          <MobileFlowStepHeader
            label={selectedHerd?.name ?? 'Herde wählen'}
            sublabel="Tiere im Weidegang"
            onBack={() => { setHasStartedFlow(true); setInternalStep('herd') }}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 rounded-[1.35rem] border-2 border-border bg-surface-raised px-4 py-4 text-center shadow-[0_12px_24px_rgba(40,34,26,0.08)]">
              <div className="text-xs font-medium uppercase tracking-[0.08em] text-neutral-600">
                Tiere
              </div>
              <div className="mt-2 text-4xl font-semibold text-neutral-950">{animalCount}</div>
            </div>

            <button
              type="button"
              onClick={() => void onAdjustAnimalCount(-1)}
              disabled={animalCount <= 0}
              className="min-h-[4.75rem] rounded-[1.3rem] border-2 border-border-strong bg-surface-muted px-4 py-4 text-3xl font-semibold text-ink shadow-[0_12px_24px_rgba(40,34,26,0.08)] disabled:opacity-40"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => void onAdjustAnimalCount(1)}
              className="min-h-[4.75rem] rounded-[1.3rem] border-2 border-border-strong bg-surface-muted px-4 py-4 text-3xl font-semibold text-ink shadow-[0_12px_24px_rgba(40,34,26,0.08)]"
            >
              +
            </button>

            <button
              type="button"
              onClick={() => {
                setHasStartedFlow(true)
                setInternalStep('confirm')
              }}
              className="col-span-2 min-h-[4.75rem] rounded-[1.35rem] border-2 border-border-strong bg-surface-control-gradient px-4 py-4 text-lg font-semibold text-ink shadow-[0_16px_32px_rgba(40,34,26,0.14)]"
            >
              Weiter
            </button>
          </div>
        </>
      ) : null}

      {mobileStep === 'confirm' ? (
        <>
          <MobileFlowStepHeader
            label={selectedHerd?.name ?? 'Herde wählen'}
            sublabel={`${animalCount} Tiere bereit`}
            onBack={() => { setHasStartedFlow(true); setInternalStep('count') }}
          />

          <button
            type="button"
            onClick={() => void onStartSession()}
            disabled={isSaving || !selectedHerdId}
            className="w-full min-h-[4.75rem] rounded-[1.35rem] border-2 border-border-strong bg-surface-control-gradient px-4 py-4 text-lg font-semibold text-ink shadow-[0_16px_32px_rgba(40,34,26,0.14)] disabled:opacity-50"
          >
            {isSaving ? 'Startet ...' : 'Weidegang starten'}
          </button>

          <button
            type="button"
            onClick={() => {
              setHasStartedFlow(true)
              setIsDetailsOpen((currentValue) => !currentValue)
            }}
            className="w-full rounded-[1.1rem] border border-border bg-surface-raised px-4 py-3 text-sm font-semibold text-neutral-950"
            aria-expanded={isDetailsOpen}
          >
            {isDetailsOpen ? 'Details ausblenden' : 'Details'}
          </button>

          {isDetailsOpen ? (
            <div className="space-y-4">
              <FormField>
                <FormLabel>Notiz zum Weidegang</FormLabel>
                <FormTextarea
                  rows={3}
                  value={sessionNotes}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => onSessionNotesChange(event.target.value)}
                  placeholder="optionale Begleitnotiz"
                />
              </FormField>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

export function GrazingSessionDesktopControls({
  safeHerdsLength,
  currentSessionStatus,
  isSaving,
  onStartSession,
  onPauseSession,
  onResumeSession,
  onStopSession,
}: {
  safeHerdsLength: number
  currentSessionStatus: SessionStatus | null
  isSaving: boolean
  onStartSession: () => void | Promise<void>
  onPauseSession: () => void | Promise<void>
  onResumeSession: () => void | Promise<void>
  onStopSession: () => void | Promise<void>
}) {
  return (
    <div className="mt-4 hidden grid-cols-2 gap-3 lg:grid">
      <button
        type="button"
        onClick={() => void onStartSession()}
        disabled={isSaving || currentSessionStatus !== null || safeHerdsLength === 0}
        className="rounded-[1.1rem] border border-border-strong bg-surface-muted px-4 py-4 text-sm font-semibold text-ink disabled:opacity-50"
      >
        Weidegang starten
      </button>
      <button
        type="button"
        onClick={() => void onPauseSession()}
        disabled={isSaving || currentSessionStatus !== 'active'}
        className="rounded-[1.1rem] bg-surface-muted px-4 py-4 text-sm font-semibold text-neutral-950 disabled:opacity-50"
      >
        Pausieren
      </button>
      <button
        type="button"
        onClick={() => void onResumeSession()}
        disabled={isSaving || currentSessionStatus !== 'paused'}
        className="rounded-[1.1rem] bg-surface-muted px-4 py-4 text-sm font-semibold text-neutral-950 disabled:opacity-50"
      >
        Fortsetzen
      </button>
      <button
        type="button"
        onClick={() => void onStopSession()}
        disabled={isSaving || (currentSessionStatus !== 'active' && currentSessionStatus !== 'paused')}
        className="rounded-2xl border border-border-strong bg-surface-muted px-4 py-4 text-sm font-medium text-ink disabled:opacity-50"
      >
        Weidegang beenden
      </button>
    </div>
  )
}

export function GrazingSessionMobileControls({
  safeHerdsLength,
  currentSessionStatus,
  isSaving,
  onStartSession,
  onPauseSession,
  onResumeSession,
  onStopSession,
}: {
  safeHerdsLength: number
  currentSessionStatus: SessionStatus | null
  isSaving: boolean
  onStartSession: () => void | Promise<void>
  onPauseSession: () => void | Promise<void>
  onResumeSession: () => void | Promise<void>
  onStopSession: () => void | Promise<void>
}) {
  const stopDisabled =
    isSaving ||
    (currentSessionStatus !== 'active' && currentSessionStatus !== 'paused')

  const mobileControlBtn =
    'min-h-[4.75rem] rounded-[1.3rem] border-2 border-border-strong bg-surface-muted px-4 py-4 text-base font-semibold text-ink disabled:opacity-50'

  const stopButton = (
    <button type="button" onClick={() => void onStopSession()} disabled={stopDisabled} className={mobileControlBtn}>
      Stop
    </button>
  )

  return (
    <div className="mt-4 space-y-3 lg:hidden">
      {currentSessionStatus === null ? (
        <button
          type="button"
          onClick={() => void onStartSession()}
          disabled={isSaving || safeHerdsLength === 0}
          className="w-full min-h-[4.75rem] rounded-[1.35rem] border-2 border-border-strong bg-surface-control-gradient px-4 py-4 text-lg font-semibold text-ink shadow-[0_16px_32px_rgba(40,34,26,0.14)] disabled:opacity-50"
        >
          Weidegang starten
        </button>
      ) : null}

      {currentSessionStatus === 'active' ? (
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => void onPauseSession()} disabled={isSaving} className={mobileControlBtn}>
            Pause
          </button>
          {stopButton}
        </div>
      ) : null}

      {currentSessionStatus === 'paused' ? (
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => void onResumeSession()} disabled={isSaving} className={mobileControlBtn}>
            Fortsetzen
          </button>
          {stopButton}
        </div>
      ) : null}
    </div>
  )
}

type GrazingSessionEventCapturePanelProps = {
  isEventSaving: boolean
  eventNote: string
  eventStatus: string
  safeCurrentSessionEvents: SessionEvent[]
  onEventNoteChange: (value: string) => void
  onAddSessionMarkerEvent: (type: SessionEventType, comment?: string) => void | Promise<void>
}

const quickEventButtons: Array<{ type: SessionEventType; label: string }> = [
  { type: 'water', label: 'Wasser' },
  { type: 'rest', label: 'Rast-Ort' },
  { type: 'disturbance', label: 'Störung' },
  { type: 'move', label: 'Punkt' },
]

export function GrazingSessionEventCapturePanel({
  isEventSaving,
  eventNote,
  eventStatus,
  safeCurrentSessionEvents,
  onEventNoteChange,
  onAddSessionMarkerEvent,
}: GrazingSessionEventCapturePanelProps) {
  return (
    <div className="mt-4 rounded-[1.35rem] border border-border bg-surface-raised px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-neutral-950">Ereignisse erfassen</h3>
        <div className="text-xs font-medium text-neutral-500">mit aktueller Position</div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {quickEventButtons.map((eventButton) => (
          <button
            key={eventButton.type}
            type="button"
            onClick={() => void onAddSessionMarkerEvent(eventButton.type)}
            disabled={isEventSaving}
            className={cn(
              'rounded-[1.05rem] px-3 py-3 text-sm font-semibold disabled:opacity-50',
              eventButton.type === 'disturbance'
                ? 'bg-rose-100 text-rose-950'
                : 'border border-border bg-surface-raised text-ink',
            )}
          >
            {eventButton.label}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        <FormLabel>Freie Notiz</FormLabel>
        <FormTextarea
          rows={2}
          value={eventNote}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => onEventNoteChange(event.target.value)}
          placeholder="Bemerkung zum aktuellen Weidegang"
        />
        <FormButton
          type="button"
          onClick={() => void onAddSessionMarkerEvent('note', eventNote)}
          disabled={isEventSaving || !eventNote.trim()}
          variant="primary"
          className="w-full rounded-[1.05rem]"
        >
          Notiz speichern
        </FormButton>
      </div>

      {eventStatus ? (
        <div className="mt-3 rounded-2xl border border-success-border bg-success-surface px-4 py-3 text-sm text-success-ink">
          {eventStatus}
        </div>
      ) : null}

      <div className="mt-3 rounded-2xl bg-surface-raised px-4 py-3">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
          Letzte Ereignisse
        </div>
        {safeCurrentSessionEvents.length === 0 ? (
          <div className="mt-2 text-sm text-neutral-600">Noch keine Ereignisse erfasst.</div>
        ) : (
          <div className="mt-2 space-y-2">
            {safeCurrentSessionEvents.slice(0, 5).map((sessionEvent) => (
              <div
                key={sessionEvent.id}
                className="rounded-[1rem] border border-border bg-surface-raised px-3 py-3 text-sm text-neutral-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium text-neutral-950">
                    {getSessionEventLabel(sessionEvent.type)}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {formatDateTime(sessionEvent.timestamp)}
                  </div>
                </div>
                {sessionEvent.comment ? (
                  <div className="mt-1 text-sm text-neutral-700">{sessionEvent.comment}</div>
                ) : null}
                {typeof sessionEvent.lat === 'number' && typeof sessionEvent.lon === 'number' ? (
                  <div className="mt-1 text-xs text-neutral-500">
                    {sessionEvent.lat.toFixed(5)}, {sessionEvent.lon.toFixed(5)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function GrazingSessionMetricsGrid({
  safeCurrentTrackpointsLength,
  currentMetrics,
}: {
  safeCurrentTrackpointsLength: number
  currentMetrics: SessionMetrics | null
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
      <MetricItem label="Punkte" value={safeCurrentTrackpointsLength} />
      <MetricItem label="Distanz" value={formatDistance(currentMetrics?.distanceM ?? 0)} />
      <MetricItem label="Dauer" value={formatDuration(currentMetrics?.durationS ?? 0)} />
      <MetricItem label="Mittlere Genauigkeit" value={formatAccuracy(currentMetrics?.avgAccuracyM)} />
    </div>
  )
}
