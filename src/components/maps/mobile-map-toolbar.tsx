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
    <div className="pointer-events-auto flex items-center gap-2 overflow-x-auto rounded-[1.35rem] border-2 border-[#3a342a] bg-[#fff8ea] px-2 py-2 shadow-[0_12px_30px_rgba(40,34,26,0.12)]">
      {children}
    </div>
  )
}

export function MobileMapToolbarStat({ children }: MobileMapToolbarStatProps) {
  return (
    <div className="shrink-0 rounded-full border border-[#ccb98a] bg-[#fffdf6] px-3 py-2 text-[11px] font-semibold text-neutral-950 shadow-sm">
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
      ? 'border-[#5a5347] bg-[#f1efeb] text-[#17130f] disabled:bg-[#e1ddd7] disabled:text-neutral-500'
      : 'border-[#ccb98a] bg-[#fffdf6] text-neutral-950 disabled:bg-[#f3eee4] disabled:text-neutral-400'

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
