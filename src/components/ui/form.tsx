import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils/cn'
import { Loader2 } from 'lucide-react'

// ---------------------------------------------------------------------------
// Form-aware primitive wrappers
// ---------------------------------------------------------------------------

const formInputBase =
  'w-full rounded-[1rem] border-2 border-border bg-surface-raised px-3.5 py-2.5 text-sm shadow-sm sm:rounded-[1.1rem] sm:px-4 sm:py-3 sm:text-base'

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
  primary:
    'border-border-strong bg-surface-muted text-ink app-shadow-action',
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
        'inline-flex items-center justify-center rounded-[1.1rem] border px-4 py-3 text-sm font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50',
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
  pressed: boolean
}

export function ToggleButton({ className, pressed, children, ...props }: ToggleButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        'min-h-[4.25rem] rounded-[1.25rem] border-2 px-4 py-3.5 text-left text-sm font-semibold leading-tight whitespace-normal app-shadow-action transition-colors',
        pressed
          ? 'border-border-strong bg-accent text-ink'
          : 'border-border bg-surface-raised text-ink',
        className,
      )}
      {...props}
    >
      <span className="block [overflow-wrap:anywhere]">{children}</span>
    </button>
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
