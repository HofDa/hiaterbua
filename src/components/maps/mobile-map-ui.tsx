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
      className={`pointer-events-auto rounded-[1.35rem] border-2 border-[#3a342a] bg-[#fff8ea] p-2 shadow-lg sm:rounded-[1.75rem] sm:p-3 ${className}`.trim()}
    >
      {children}
    </div>
  )
}

export function MobileMapSectionCard({ children, className = '' }: SectionCardProps) {
  return (
    <div
      className={`rounded-[1.4rem] border-2 border-[#3a342a] bg-[#fff8ea] p-4 shadow-[0_12px_28px_rgba(40,34,26,0.1)] ${className}`.trim()}
    >
      {children}
    </div>
  )
}

export function MobileMapSegmentedControl({ children }: SegmentedControlProps) {
  return (
    <div className="rounded-[1.4rem] border-2 border-[#3a342a] bg-[#fff8ea] p-2 shadow-[0_12px_28px_rgba(40,34,26,0.1)] lg:hidden">
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
        active
          ? 'border border-[#5a5347] bg-[#f1efeb] text-[#17130f]'
          : 'border border-[#ccb98a] bg-[#fffdf6] text-neutral-950',
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
        className="fixed inset-0 z-30 bg-[rgba(70,60,46,0.18)] backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-x-3 bottom-3 z-40 mx-auto max-h-[calc(100vh-1.5rem)] w-[min(28rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.75rem] border-2 border-[#3a342a] bg-[rgba(255,248,234,0.98)] shadow-[0_22px_60px_rgba(40,34,26,0.16)]">
        <div className="flex items-center justify-between gap-3 border-b border-[#ccb98a] px-4 py-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-600">
              Karte
            </div>
            <div className="text-sm font-semibold text-neutral-950">{title}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ccb98a] bg-[#fffdf6] text-lg text-neutral-900"
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
