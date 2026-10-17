'use client'

import { FlowPrimaryAction, FlowStepperButton } from '@/components/ui/mobile-flow'

/**
 * Pause / Fortsetzen / Beenden for any running recording (Weidegang, Arbeit).
 * One component so both modes share order, labels, sizes and emphasis — they
 * used to differ ("Pause" grey vs "Pause setzen" filled green, "Stop" vs
 * "Einsatz beenden"), which broke muscle memory between the two.
 *
 * Beenden is kept apart and styled destructive; callers confirm before ending.
 */
export function RecordingControls({
  status,
  isSaving,
  stopLabel,
  onPause,
  onResume,
  onStop,
}: {
  status: 'active' | 'paused'
  isSaving: boolean
  stopLabel: string
  onPause: () => void | Promise<void>
  onResume: () => void | Promise<void>
  onStop: () => void | Promise<void>
}) {
  return (
    <div>
      {status === 'active' ? (
        <FlowStepperButton
          onClick={() => void onPause()}
          disabled={isSaving}
          className="w-full text-xl disabled:opacity-50"
        >
          Pause
        </FlowStepperButton>
      ) : (
        <FlowPrimaryAction onClick={() => void onResume()} disabled={isSaving}>
          Fortsetzen
        </FlowPrimaryAction>
      )}
      <button
        type="button"
        onClick={() => void onStop()}
        disabled={isSaving}
        className="mt-2 flex min-h-12 w-full items-center justify-center rounded-[1.1rem] border-2 border-error-border bg-surface-raised px-4 py-3 text-base font-semibold text-error-ink transition-colors [@media(hover:hover)]:hover:bg-error-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50"
      >
        {stopLabel}
      </button>
    </div>
  )
}
