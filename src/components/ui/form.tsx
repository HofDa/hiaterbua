import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils/cn'
import { Loader2 } from 'lucide-react'
import { FlowSelectableTile } from '@/components/ui/mobile-flow'

// ---------------------------------------------------------------------------
// Form-aware primitive wrappers
// ---------------------------------------------------------------------------

// `text-base` (16px) on every breakpoint is intentional: iOS Safari auto-zooms
// when a focused input's font-size is below 16px, which causes a jarring jump on
// mobile. Keeping inputs at 16px avoids it.
const formInputBase =
  'min-h-11 w-full rounded-[1rem] border-2 border-border bg-surface-raised px-3.5 py-2.5 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 sm:rounded-[1.1rem] sm:px-4 sm:py-3'

type FormInputProps = ComponentProps<'input'> & {
  error?: boolean
}

export function FormInput({ className, error, ...props }: FormInputProps) {
  return (
    <input
      className={cn(
        formInputBase,
        error && 'border-error-border ring-error-surface focus:border-error-border',
        className,
      )}
      {...props}
    />
  )
}

export function FormSelect({
  className,
  error,
  ...props
}: ComponentProps<'select'> & { error?: boolean }) {
  return (
    <select
      className={cn(
        formInputBase,
        error && 'border-error-border focus:border-error-border',
        className,
      )}
      {...props}
    />
  )
}

export function FormTextarea({
  className,
  error,
  ...props
}: ComponentProps<'textarea'> & { error?: boolean }) {
  return (
    <textarea
      className={cn(
        formInputBase,
        'min-h-[5rem] resize-y',
        error && 'border-error-border focus:border-error-border',
        className,
      )}
      {...props}
    />
  )
}

type FormButtonVariant = 'primary' | 'secondary' | 'danger'

type FormButtonProps = ComponentProps<'button'> & {
  variant?: FormButtonVariant
  isLoading?: boolean
}

const formButtonVariants: Record<FormButtonVariant, string> = {
  // Filled dark green: reserved for the one main action of a step.
  primary:
    'border-primary bg-primary text-primary-foreground app-shadow-action hover:bg-chrome-strong disabled:border-dashed disabled:border-border-soft disabled:bg-surface-disabled-strong disabled:text-ink-muted disabled:shadow-none disabled:opacity-100',
  secondary:
    'border-border bg-surface-raised text-ink-strong',
  danger:
    'border-error-border bg-error-surface text-error-ink',
}

export function FormButton({
  className,
  variant = 'primary',
  isLoading,
  children,
  disabled,
  ...props
}: FormButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-[1.1rem] border px-4 py-3 text-sm font-semibold shadow-sm transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50',
        formButtonVariants[variant],
        className,
      )}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// ToggleButton — repeated selected/unselected card-style toggle
// ---------------------------------------------------------------------------

type ToggleButtonProps = ComponentProps<'button'> & {
  /** Omit for navigation tiles; see FlowSelectableTile. */
  pressed?: boolean
}

/** Same look and selected state as FlowSelectableTile (one selection language). */
export function ToggleButton({ children, ...props }: ToggleButtonProps) {
  return (
    <FlowSelectableTile {...props}>
      <span className="block hyphens-auto break-words">{children}</span>
    </FlowSelectableTile>
  )
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

export function FormField({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('space-y-2', className)} {...props} />
}

export function FormLabel({ className, ...props }: ComponentProps<'label'>) {
  return <label className={cn('text-sm font-medium', className)} {...props} />
}
