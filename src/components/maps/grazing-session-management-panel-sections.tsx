import { useEffect, useRef, useState } from 'react'
import { formatAccuracy } from '@/lib/maps/map-core'
import { FormField, FormLabel, FormSelect, FormTextarea, FormButton } from '@/components/ui/form'
import {
  FlowCountCard,
  FlowEmptyState,
  FlowOptionGrid,
  FlowPrimaryAction,
  FlowSecondaryAction,
  FlowSelectableTile,
  FlowStepperButton,
  FlowStepHeader,
} from '@/components/ui/mobile-flow'
import { MetaLabel } from '@/components/ui/typography'
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
            <FlowEmptyState>Noch keine Herde angelegt.</FlowEmptyState>
          ) : (
            <FlowOptionGrid>
              {safeHerds.map((herd) => {
                const isSelected = selectedHerdId === herd.id

                return (
                  <FlowSelectableTile
                    key={herd.id}
                    onClick={() => onSelectedHerdIdChange(herd.id)}
                    disabled={currentSessionStatus !== null}
                    pressed={isSelected}
                    idleClassName="border-border bg-surface-raised text-ink-strong"
                    className="min-h-20 rounded-[1.4rem] py-4 shadow-sm"
                  >
                    <div className="[overflow-wrap:anywhere]">{herd.name}</div>
                    <MetaLabel weight="medium" tracking="compact" className="mt-2">
                      {isSelected ? 'Ausgewählt' : 'Zum Start wählen'}
                    </MetaLabel>
                  </FlowSelectableTile>
                )
              })}
            </FlowOptionGrid>
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
        <MetaLabel weight="medium" tracking="compact">
          Herde
        </MetaLabel>
        <div className="mt-2 text-sm font-semibold leading-tight text-ink-strong [overflow-wrap:anywhere]">
          {selectedHerd?.name ?? 'Nicht gewählt'}
        </div>
      </div>
      <div className="rounded-[1.25rem] border-2 border-border bg-surface-raised px-4 py-4 text-center shadow-sm">
        <MetaLabel weight="medium" tracking="compact">
          Tiere
        </MetaLabel>
        <div className="mt-2 text-2xl font-semibold text-ink-strong">
          {selectedAnimalCount ?? 0}
        </div>
      </div>
    </div>
  )
}

function MetricItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 app-surface-row px-4 py-3">
      <div className="text-xs leading-tight text-ink-muted">{label}</div>
      <div className="mt-1 font-medium text-ink">{value}</div>
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
            <FlowEmptyState>Noch keine Herde angelegt.</FlowEmptyState>
          ) : (
            <FlowOptionGrid>
              {safeHerds.map((herd) => {
                const isSelected = selectedHerdId === herd.id

                return (
                  <FlowSelectableTile
                    key={herd.id}
                    onClick={() => {
                      setHasStartedFlow(true)
                      onSelectedHerdIdChange(herd.id)
                      setIsDetailsOpen(false)
                      setInternalStep('count')
                    }}
                    pressed={isSelected}
                    idleClassName="border-border bg-surface-raised text-ink-strong"
                    className="min-h-[4.75rem] rounded-[1.35rem] py-4"
                  >
                    {herd.name}
                  </FlowSelectableTile>
                )
              })}
            </FlowOptionGrid>
          )}
        </>
      ) : null}

      {mobileStep === 'count' ? (
        <>
          <FlowStepHeader
            label={selectedHerd?.name ?? 'Herde wählen'}
            sublabel="Tiere im Weidegang"
            onBack={() => { setHasStartedFlow(true); setInternalStep('herd') }}
          />

          <div className="grid grid-cols-2 gap-3">
            <FlowCountCard label="Tiere" value={animalCount} />

            <FlowStepperButton
              onClick={() => void onAdjustAnimalCount(-1)}
              disabled={animalCount <= 0}
            >
              −
            </FlowStepperButton>
            <FlowStepperButton onClick={() => void onAdjustAnimalCount(1)}>
              +
            </FlowStepperButton>

            <FlowPrimaryAction
              onClick={() => {
                setHasStartedFlow(true)
                setInternalStep('confirm')
              }}
              className="col-span-2"
            >
              Weiter
            </FlowPrimaryAction>
          </div>
        </>
      ) : null}

      {mobileStep === 'confirm' ? (
        <>
          <FlowStepHeader
            label={selectedHerd?.name ?? 'Herde wählen'}
            sublabel={`${animalCount} Tiere bereit`}
            onBack={() => { setHasStartedFlow(true); setInternalStep('count') }}
          />

          <FlowPrimaryAction
            onClick={() => void onStartSession()}
            disabled={isSaving || !selectedHerdId}
          >
            {isSaving ? 'Startet ...' : 'Weidegang starten'}
          </FlowPrimaryAction>

          <FlowSecondaryAction
            onClick={() => {
              setHasStartedFlow(true)
              setIsDetailsOpen((currentValue) => !currentValue)
            }}
            aria-expanded={isDetailsOpen}
          >
            {isDetailsOpen ? 'Details ausblenden' : 'Details'}
          </FlowSecondaryAction>

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
        className="rounded-[1.1rem] bg-surface-muted px-4 py-4 text-sm font-semibold text-ink-strong disabled:opacity-50"
      >
        Pausieren
      </button>
      <button
        type="button"
        onClick={() => void onResumeSession()}
        disabled={isSaving || currentSessionStatus !== 'paused'}
        className="rounded-[1.1rem] bg-surface-muted px-4 py-4 text-sm font-semibold text-ink-strong disabled:opacity-50"
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

  const stopButton = (
    <FlowStepperButton
      onClick={() => void onStopSession()}
      disabled={stopDisabled}
      className="text-base disabled:opacity-50"
    >
      Stop
    </FlowStepperButton>
  )

  return (
    <div className="mt-4 space-y-3 lg:hidden">
      {currentSessionStatus === null ? (
        <FlowPrimaryAction
          onClick={() => void onStartSession()}
          disabled={isSaving || safeHerdsLength === 0}
        >
          Weidegang starten
        </FlowPrimaryAction>
      ) : null}

      {currentSessionStatus === 'active' ? (
        <div className="grid grid-cols-2 gap-3">
          <FlowStepperButton
            onClick={() => void onPauseSession()}
            disabled={isSaving}
            className="text-base disabled:opacity-50"
          >
            Pause
          </FlowStepperButton>
          {stopButton}
        </div>
      ) : null}

      {currentSessionStatus === 'paused' ? (
        <div className="grid grid-cols-2 gap-3">
          <FlowStepperButton
            onClick={() => void onResumeSession()}
            disabled={isSaving}
            className="text-base disabled:opacity-50"
          >
            Fortsetzen
          </FlowStepperButton>
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
        <h3 className="text-sm font-semibold text-ink-strong">Ereignisse erfassen</h3>
        <div className="text-xs font-medium text-ink-soft">mit aktueller Position</div>
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
        <MetaLabel>
          Letzte Ereignisse
        </MetaLabel>
        {safeCurrentSessionEvents.length === 0 ? (
          <div className="mt-2 text-sm text-ink-muted">Noch keine Ereignisse erfasst.</div>
        ) : (
          <div className="mt-2 space-y-2">
            {safeCurrentSessionEvents.slice(0, 5).map((sessionEvent) => (
              <div
                key={sessionEvent.id}
                className="rounded-[1rem] border border-border bg-surface-raised px-3 py-3 text-sm text-ink-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium text-ink-strong">
                    {getSessionEventLabel(sessionEvent.type)}
                  </div>
                  <div className="text-xs text-ink-soft">
                    {formatDateTime(sessionEvent.timestamp)}
                  </div>
                </div>
                {sessionEvent.comment ? (
                  <div className="mt-1 text-sm text-ink-muted">{sessionEvent.comment}</div>
                ) : null}
                {typeof sessionEvent.lat === 'number' && typeof sessionEvent.lon === 'number' ? (
                  <div className="mt-1 text-xs text-ink-soft">
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
