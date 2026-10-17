'use client'

import { useState, type KeyboardEvent } from 'react'
import { MetaLabel } from '@/components/ui/typography'
import { cn } from '@/lib/utils/cn'

type CountStepperProps = {
  label: string
  value: number
  onChange: (next: number) => void
  max?: number
  disabled?: boolean
  className?: string
}

const stepButtonClassName =
  'min-h-14 rounded-[1.1rem] border-2 border-border-strong bg-surface-muted px-2 text-xl font-semibold tabular-nums text-ink app-shadow-action transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-40'

/**
 * A count control that works with gloves: the number itself is a button that
 * opens the numeric keypad, and ±10 steps sit beside ±1. Herds of 40+ animals
 * made "+"-only steppers a 40-tap chore.
 */
export function CountStepper({
  label,
  value,
  onChange,
  max = 9999,
  disabled = false,
  className,
}: CountStepperProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const isEditing = draft !== null

  function clamp(next: number) {
    return Math.min(max, Math.max(0, Math.round(next)))
  }

  function step(delta: number) {
    const next = clamp(value + delta)
    if (next !== value) onChange(next)
  }

  function commitDraft() {
    if (draft === null) return
    const parsed = Number.parseInt(draft, 10)
    setDraft(null)
    if (Number.isFinite(parsed)) {
      const next = clamp(parsed)
      if (next !== value) onChange(next)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitDraft()
    } else if (event.key === 'Escape') {
      setDraft(null)
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="rounded-[1.35rem] border-2 border-border bg-surface-raised px-4 py-3 text-center app-shadow-action">
        <MetaLabel weight="medium" tracking="compact">
          {label}
        </MetaLabel>
        {isEditing ? (
          <input
            autoFocus
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            enterKeyHint="done"
            aria-label={`${label} eingeben`}
            value={draft}
            onChange={(event) => setDraft(event.target.value.replace(/\D/g, '').slice(0, 4))}
            onBlur={commitDraft}
            onKeyDown={handleKeyDown}
            className="mt-1 w-full rounded-[0.9rem] border-2 border-ring bg-surface px-3 py-1 text-center text-4xl font-semibold tabular-nums text-ink-strong focus-visible:outline-none"
          />
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setDraft(String(value))}
            aria-label={`${label}: ${value}. Tippen zum Eingeben`}
            className="mt-1 w-full rounded-[0.9rem] px-3 py-1 text-4xl font-semibold tabular-nums text-ink-strong underline decoration-border-strong decoration-dotted decoration-2 underline-offset-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {value}
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => step(-10)}
          disabled={disabled || value <= 0}
          aria-label={`${label} um 10 verringern`}
          className={stepButtonClassName}
        >
          −10
        </button>
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={disabled || value <= 0}
          aria-label={`${label} um 1 verringern`}
          className={cn(stepButtonClassName, 'text-3xl')}
        >
          −
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={disabled || value >= max}
          aria-label={`${label} um 1 erhöhen`}
          className={cn(stepButtonClassName, 'text-3xl')}
        >
          +
        </button>
        <button
          type="button"
          onClick={() => step(10)}
          disabled={disabled || value >= max}
          aria-label={`${label} um 10 erhöhen`}
          className={stepButtonClassName}
        >
          +10
        </button>
      </div>
    </div>
  )
}
