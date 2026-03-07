import type { ReactNode } from 'react'

type MobileMapToolbarProps = {
  children: ReactNode
}

type MobileMapToolbarStatProps = {
  children: ReactNode
}

type MobileMapToolbarButtonProps = {
  children: ReactNode
  variant?: 'primary' | 'secondary'
} & React.ButtonHTMLAttributes<HTMLButtonElement>

export function MobileMapToolbar({ children }: MobileMapToolbarProps) {
  return (
    <div className="pointer-events-auto flex items-center gap-2 overflow-x-auto rounded-[1.35rem] border border-white/80 bg-[rgba(255,252,246,0.94)] px-2 py-2 shadow-[0_12px_30px_rgba(23,20,18,0.18)] backdrop-blur">
      {children}
    </div>
  )
}

export function MobileMapToolbarStat({ children }: MobileMapToolbarStatProps) {
  return (
    <div className="shrink-0 rounded-full bg-white px-3 py-2 text-[11px] font-medium text-neutral-900 shadow-sm">
      {children}
    </div>
  )
}

export function MobileMapToolbarButton({
  children,
  className = '',
  type = 'button',
  variant = 'secondary',
  ...props
}: MobileMapToolbarButtonProps) {
  const variantClass =
    variant === 'primary'
      ? 'bg-neutral-950 text-white disabled:bg-neutral-300 disabled:text-white'
      : 'bg-stone-200 text-neutral-950 disabled:bg-stone-100 disabled:text-neutral-400'

  return (
    <button
      type={type}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-semibold transition-colors ${variantClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  )
}
