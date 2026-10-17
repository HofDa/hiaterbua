import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { ChevronRight } from 'lucide-react'
import { FormField, FormLabel, FormTextarea } from '@/components/ui/form'
import {
  FlowEmptyState,
  FlowOptionGrid,
  FlowPrimaryAction,
  FlowSecondaryAction,
  FlowSelectableTile,
  FlowStepperButton,
  FlowStepHeader,
} from '@/components/ui/mobile-flow'
import { CountStepper } from '@/components/ui/count-stepper'
import { MetaLabel } from '@/components/ui/typography'
import type { Herd, SessionStatus } from '@/types/domain'

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
  const [internalStep, setInternalStep] = useState<'herd' | 'setup'>('herd')
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [hasStartedFlow, setHasStartedFlow] = useState(false)
  const mobileStep = selectedHerdId ? internalStep : 'herd'
  const animalCount = selectedAnimalCount ?? 0
  const selectedHerd = safeHerds.find((herd) => herd.id === selectedHerdId) ?? null

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
    <div ref={flowRef} className="space-y-4 lg:hidden">
      {mobileStep === 'herd' ? (
        <>
          {safeHerds.length === 0 ? (
            <FlowEmptyState>Noch keine Herde angelegt.</FlowEmptyState>
          ) : (
            <FlowOptionGrid layout="single">
              {safeHerds.map((herd) => {
                const isSelected = selectedHerdId === herd.id

                return (
                  <FlowSelectableTile
                    key={herd.id}
                    onClick={() => {
                      setHasStartedFlow(true)
                      onSelectedHerdIdChange(herd.id)
                      setIsDetailsOpen(false)
                      setInternalStep('setup')
                    }}
                    pressed={isSelected}
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
  const stopDisabled =
    isSaving ||
    (currentSessionStatus !== 'active' && currentSessionStatus !== 'paused')

  // Kept apart from Pause/Fortsetzen and styled as destructive: the two used
  // to sit side by side at equal weight, one glove slip from ending the track.
  // stopSession also asks for confirmation.
  const stopButton = (
    <button
      type="button"
      onClick={() => void onStopSession()}
      disabled={stopDisabled}
      className="mt-2 flex min-h-12 w-full items-center justify-center rounded-[1.1rem] border-2 border-error-border bg-surface-raised px-4 py-3 text-base font-semibold text-error-ink transition-colors hover:bg-error-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50"
    >
      Weidegang beenden
    </button>
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
        <div>
          <FlowStepperButton
            onClick={() => void onPauseSession()}
            disabled={isSaving}
            className="w-full text-base disabled:opacity-50"
          >
            Pause
          </FlowStepperButton>
          {stopButton}
        </div>
      ) : null}

      {currentSessionStatus === 'paused' ? (
        <div>
          <FlowPrimaryAction onClick={() => void onResumeSession()} disabled={isSaving}>
            Fortsetzen
          </FlowPrimaryAction>
          {stopButton}
        </div>
      ) : null}
    </div>
  )
}
