import type { ReactNode } from 'react'
import { metaLabelClassName } from '@/components/ui/typography'
import { cn } from '@/lib/utils/cn'

type MobileMapToolbarProps = {
  children: ReactNode
  /** Read-only pills (counts, timer) rendered above the buttons. */
  stats?: ReactNode
}

type MobileMapToolbarStatProps = {
  children: ReactNode
}

type MobileMapToolbarButtonProps = {
  children: ReactNode
  label?: string
  variant?: 'primary' | 'secondary'
} & React.ButtonHTMLAttributes<HTMLButtonElement>

/*
 * Stats and buttons live on separate rows: a single scrollable row hid the
 * rightmost actions (Stop/Abbruch) off-screen on phone widths with no scroll
 * affordance — every action must stay visible while recording in the field.
 */
export function MobileMapToolbar({ children, stats }: MobileMapToolbarProps) {
  return (
    <div className="pointer-events-auto space-y-2 app-map-toolbar px-2 py-2">
      {stats ? <div className="flex flex-wrap items-center gap-2">{stats}</div> : null}
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

export function MobileMapToolbarStat({ children }: MobileMapToolbarStatProps) {
  return (
    <div className="shrink-0 rounded-full border border-border bg-surface-raised px-3 py-2 text-[11px] font-semibold text-ink-strong shadow-sm">
      {children}
    </div>
  )
}

export function MobileMapToolbarButton({
  children,
  className = '',
  label,
  type = 'button',
  variant = 'secondary',
  ...props
}: MobileMapToolbarButtonProps) {
  const variantClass =
    variant === 'primary'
      ? 'border-border-strong bg-surface-muted text-ink disabled:bg-surface-disabled-strong disabled:text-ink-soft'
      : 'border-border bg-surface-raised text-ink-strong disabled:bg-surface-disabled disabled:text-ink-soft'

  return (
    <button
      type={type}
      className={cn(
        'flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl border px-2 text-sm font-semibold transition-colors lg:min-w-[4.4rem] lg:flex-none lg:px-3',
        variantClass,
        className,
      )}
      {...props}
    >
      {children}
      {label ? (
        <span className={metaLabelClassName({ size: 'micro', tracking: 'compact', tone: 'inherit' })}>
          {label}
        </span>
      ) : null}
    </button>
  )
}
