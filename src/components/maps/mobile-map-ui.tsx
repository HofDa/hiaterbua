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

type OverlaySheetProps = {
  children: ReactNode
  onClose: () => void
  title: string
}

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

export function MobileMapOverlaySheet({ children, onClose, title }: OverlaySheetProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-neutral-950/28 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-x-3 bottom-3 z-40 mx-auto max-h-[calc(100vh-1.5rem)] w-[min(28rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.75rem] border border-white/80 bg-[rgba(255,252,246,0.98)] shadow-[0_22px_60px_rgba(23,20,18,0.28)]">
        <div className="flex items-center justify-between gap-3 border-b border-stone-200/80 px-4 py-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Karte
            </div>
            <div className="text-sm font-semibold text-neutral-950">{title}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-200 text-lg text-neutral-900"
            aria-label="Menü schließen"
          >
            ×
          </button>
        </div>
        <div className="max-h-[calc(100vh-7rem)] overflow-y-auto px-3 py-3">
          <div className="grid gap-2">{children}</div>
        </div>
      </div>
    </>
  )
}
