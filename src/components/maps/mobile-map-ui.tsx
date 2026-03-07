import type { ReactNode } from 'react'

type FloatingPanelProps = {
  children: ReactNode
  className?: string
}

type SectionCardProps = {
  children: ReactNode
  className?: string
}

type SegmentedControlProps = {
  children: ReactNode
}

type SegmentButtonProps = {
  active?: boolean
  children: ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>

export function MobileMapTopControls({ children, className = '' }: FloatingPanelProps) {
  return (
    <div className="pointer-events-none absolute left-2 top-2 z-10 sm:left-3 sm:top-3">
      <div className={`pointer-events-auto w-44 max-w-[calc(100vw-2rem)] ${className}`.trim()}>
        {children}
      </div>
    </div>
  )
}

export function MobileMapFloatingCard({ children, className = '' }: FloatingPanelProps) {
  return (
    <div
      className={`pointer-events-auto rounded-[1.35rem] border border-white bg-white p-2 shadow-lg sm:rounded-[1.75rem] sm:p-3 ${className}`.trim()}
    >
      {children}
    </div>
  )
}

export function MobileMapSectionCard({ children, className = '' }: SectionCardProps) {
  return (
    <div
      className={`rounded-[1.4rem] border border-white/70 bg-[rgba(255,252,246,0.9)] p-4 shadow-sm ${className}`.trim()}
    >
      {children}
    </div>
  )
}

export function MobileMapSegmentedControl({ children }: SegmentedControlProps) {
  return (
    <div className="rounded-[1.4rem] border border-white/70 bg-[rgba(255,252,246,0.94)] p-2 shadow-sm lg:hidden">
      <div className="grid grid-cols-3 gap-2">{children}</div>
    </div>
  )
}

export function MobileMapSegmentButton({
  active = false,
  children,
  className = '',
  type = 'button',
  ...props
}: SegmentButtonProps) {
  return (
    <button
      type={type}
      className={[
        'rounded-2xl px-3 py-3 text-sm font-medium',
        active ? 'bg-neutral-950 text-white' : 'bg-stone-200 text-neutral-950',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}
