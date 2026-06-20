import type { ReactNode } from 'react'
import { MetaLabel } from '@/components/ui/typography'
import { cn } from '@/lib/utils/cn'

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
      <div className={cn('pointer-events-auto w-44 max-w-[calc(100vw-2rem)]', className)}>
        {children}
      </div>
    </div>
  )
}

export function MobileMapFloatingCard({ children, className = '' }: FloatingPanelProps) {
  return (
    <div
      className={cn(
        'pointer-events-auto rounded-[1.35rem] border-2 border-border-ink bg-surface p-2 shadow-lg sm:rounded-[1.75rem] sm:p-3',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function MobileMapSectionCard({ children, className = '' }: SectionCardProps) {
  return (
    <div className={cn('app-map-surface p-4', className)}>
      {children}
    </div>
  )
}

export function MobileMapSegmentedControl({ children }: SegmentedControlProps) {
  return (
    <div className="app-map-surface p-2 lg:hidden">
      {/* auto-cols-fr keeps every tab equal width regardless of how many there are */}
      <div className="grid auto-cols-fr grid-flow-col gap-2">{children}</div>
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
      className={cn(
        'rounded-2xl px-3 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        active
          ? 'border border-border-strong bg-surface-muted text-ink'
          : 'border border-border bg-surface-raised text-ink-strong',
        className,
      )}
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
        className="fixed inset-0 z-30 bg-map-scrim backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-x-3 bottom-3 z-40 mx-auto max-h-[calc(100vh-1.5rem)] w-[min(28rem,calc(100vw-1.5rem))] overflow-hidden app-floating-panel">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <MetaLabel size="micro" tracking="wide">
              Karte
            </MetaLabel>
            <div className="text-sm font-semibold text-ink-strong">{title}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-raised text-lg text-ink"
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
