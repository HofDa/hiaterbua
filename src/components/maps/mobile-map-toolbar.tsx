import type { ReactNode } from 'react'

type MobileMapToolbarProps = {
  children: ReactNode
}

type MobileMapToolbarStatProps = {
  children: ReactNode
}

type MobileMapToolbarButtonProps = {
  children: ReactNode
  label?: string
  variant?: 'primary' | 'secondary'
} & React.ButtonHTMLAttributes<HTMLButtonElement>

export function MobileMapToolbar({ children }: MobileMapToolbarProps) {
  return (
    <div className="pointer-events-auto flex items-center gap-2 overflow-x-auto app-map-toolbar px-2 py-2">
      {children}
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
      className={`flex h-11 min-w-[4.4rem] shrink-0 items-center justify-center gap-1.5 rounded-2xl border px-3 text-sm font-semibold transition-colors ${variantClass} ${className}`.trim()}
      {...props}
    >
      {children}
      {label ? <span className="text-[11px] font-semibold uppercase tracking-[0.08em]">{label}</span> : null}
    </button>
  )
}
