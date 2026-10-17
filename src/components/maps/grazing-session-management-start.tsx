import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { ChevronRight } from 'lucide-react'
import { FormField, FormLabel, FormTextarea } from '@/components/ui/form'
import {
  FlowEmptyState,
  FlowOptionGrid,
  FlowPrimaryAction,
  FlowSecondaryAction,
  FlowSelectableTile,
  FlowStepHeader,
} from '@/components/ui/mobile-flow'
import { CountStepper } from '@/components/ui/count-stepper'
import { RecordingControls } from '@/components/ui/recording-controls'
import type { Herd, SessionStatus } from '@/types/domain'

type HerdStartIntent = { herdId: string; start: boolean; started: boolean; at: number }
let herdStartIntent: HerdStartIntent | null = null

/**
 * Reads `?herd=…&start=1` once, removes it from the URL right away, and keeps
 * it briefly so every mounted copy of the panel sees the same intent.
 */
function takeHerdStartIntent(): HerdStartIntent | null {
  const url = new URL(window.location.href)
  const herdId = url.searchParams.get('herd')
  if (herdId) {
    herdStartIntent = {
      herdId,
      start: url.searchParams.get('start') === '1',
      started: false,
      at: Date.now(),
    }
    url.searchParams.delete('herd')
    url.searchParams.delete('start')
    window.history.replaceState(window.history.state, '', url.pathname + url.search)
  }
  if (herdStartIntent && Date.now() - herdStartIntent.at > 5000) herdStartIntent = null
  return herdStartIntent
}

export function GrazingSessionActiveSummary({
  safeHerds,
  selectedHerdId,
  selectedAnimalCount,
  onAdjustAnimalCount,
}: {
  safeHerds: Herd[]
  selectedHerdId: string
  selectedAnimalCount: number | null
  onAdjustAnimalCount: (delta: number) => void | Promise<void>
}) {
  const selectedHerd = safeHerds.find((herd) => herd.id === selectedHerdId) ?? null
  const [isEditingCount, setIsEditingCount] = useState(false)
  const count = selectedAnimalCount ?? 0

  // Read-only facts as plain text; the count stays correctable here, because a
  // one-tap start from Start skips the count step.
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-lg font-bold leading-snug text-ink-strong [overflow-wrap:anywhere]">
          {selectedHerd?.name ?? 'Herde nicht gewählt'}
          <span className="font-semibold text-ink-muted">
            {' · '}
            {count} {count === 1 ? 'Tier' : 'Tiere'}
          </span>
        </p>
        <button
          type="button"
          onClick={() => setIsEditingCount((current) => !current)}
          aria-expanded={isEditingCount}
          className="min-h-11 rounded-full border-2 border-border-strong px-4 text-sm font-semibold text-ink-strong"
        >
          {isEditingCount ? 'Fertig' : 'Tiere ändern'}
        </button>
      </div>
      {isEditingCount ? (
        <CountStepper
          label="Tiere"
          value={count}
          onChange={(next) => void onAdjustAnimalCount(next - count)}
        />
      ) : null}
    </div>
  )
}

export function GrazingSessionMobileStartFlow({
  safeHerds,
  selectedHerdId,
  selectedAnimalCount,
  lastAnimalCount,
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
  lastAnimalCount: number | null
  sessionNotes: string
  isSaving: boolean
  onSelectedHerdIdChange: (value: string) => void
  onAdjustAnimalCount: (delta: number) => void | Promise<void>
  onSessionNotesChange: (value: string) => void
  onStartSession: (herdId?: string) => void | Promise<void>
}) {
  const flowRef = useRef<HTMLDivElement | null>(null)
  const [internalStep, setInternalStep] = useState<'herd' | 'setup'>('herd')
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [hasStartedFlow, setHasStartedFlow] = useState(false)
  const mobileStep = selectedHerdId ? internalStep : 'herd'
  const animalCount = selectedAnimalCount ?? 0
  const selectedHerd = safeHerds.find((herd) => herd.id === selectedHerdId) ?? null

  // Coming from Start's "Starten" on a herd row: start right away with that
  // herd's default count (editable on the running screen). `?herd=` alone only
  // preselects and opens the count step. The panel is mounted twice (phone and
  // desktop layout), so the intent is read once into module state, the URL is
  // cleared at once, and the start itself can only fire one time.
  useEffect(() => {
    const intent = takeHerdStartIntent()
    if (!intent || !safeHerds.some((herd) => herd.id === intent.herdId)) return
    const timer = window.setTimeout(() => {
      if (intent.start) {
        if (!intent.started) {
          intent.started = true
          void onStartSession(intent.herdId)
        }
      } else {
        onSelectedHerdIdChange(intent.herdId)
        setInternalStep('setup')
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [safeHerds, onSelectedHerdIdChange, onStartSession])

  useEffect(() => {
    if (!hasStartedFlow || typeof window === 'undefined') return
    if (!window.matchMedia('(max-width: 1023px)').matches) return

    const card = flowRef.current?.closest('[data-grazing-session-management-card="true"]')
    if (!(card instanceof HTMLElement)) return

    const rafId = window.requestAnimationFrame(() => {
      card.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    })

    return () => window.cancelAnimationFrame(rafId)
  }, [hasStartedFlow, isDetailsOpen, mobileStep])

  return (
    <div ref={flowRef} className="space-y-4">
      {mobileStep === 'herd' ? (
        <>
          {safeHerds.length === 0 ? (
            <FlowEmptyState>Noch keine Herde angelegt.</FlowEmptyState>
          ) : (
            <FlowOptionGrid layout="single">
              {safeHerds.map((herd) => {
                return (
                  <FlowSelectableTile
                    key={herd.id}
                    onClick={() => {
                      setHasStartedFlow(true)
                      onSelectedHerdIdChange(herd.id)
                      setIsDetailsOpen(false)
                      setInternalStep('setup')
                    }}
                    idleClassName="border-border bg-surface-raised text-ink-strong"
                    className="min-h-16 rounded-[1.35rem]"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="min-w-0 text-base leading-snug [overflow-wrap:anywhere]">
                        {herd.name}
                      </span>
                      <ChevronRight
                        aria-hidden="true"
                        className="h-5 w-5 shrink-0 text-ink-muted"
                      />
                    </span>
                  </FlowSelectableTile>
                )
              })}
            </FlowOptionGrid>
          )}
        </>
      ) : null}

      {mobileStep === 'setup' ? (
        <>
          <FlowStepHeader
            label={selectedHerd?.name ?? 'Herde wählen'}
            sublabel="Tiere im Weidegang"
            onBack={() => {
              setHasStartedFlow(true)
              setInternalStep('herd')
            }}
          />

          <CountStepper
            label="Tiere"
            value={animalCount}
            hint={lastAnimalCount !== null && lastAnimalCount === animalCount ? 'wie beim letzten Weidegang' : undefined}
            onChange={(next) => void onAdjustAnimalCount(next - animalCount)}
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
            {isDetailsOpen ? 'Notiz ausblenden' : 'Notiz hinzufügen'}
          </FlowSecondaryAction>

          {isDetailsOpen ? (
            <div className="space-y-4">
              <FormField>
                <FormLabel>Notiz zum Weidegang</FormLabel>
                <FormTextarea
                  rows={3}
                  value={sessionNotes}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    onSessionNotesChange(event.target.value)
                  }
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
  return (
    <div className="mt-4 space-y-3">
      {currentSessionStatus === null ? (
        <FlowPrimaryAction
          onClick={() => void onStartSession()}
          disabled={isSaving || safeHerdsLength === 0}
        >
          Weidegang starten
        </FlowPrimaryAction>
      ) : null}

      {currentSessionStatus === 'active' || currentSessionStatus === 'paused' ? (
        <RecordingControls
          status={currentSessionStatus}
          isSaving={isSaving}
          stopLabel="Weidegang beenden"
          onPause={onPauseSession}
          onResume={onResumeSession}
          onStop={onStopSession}
        />
      ) : null}
    </div>
  )
}
