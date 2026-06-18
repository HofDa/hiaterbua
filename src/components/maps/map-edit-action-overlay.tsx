'use client'

import type { ButtonHTMLAttributes } from 'react'
import { MobileMapFloatingCard } from '@/components/maps/mobile-map-ui'
import { cn } from '@/lib/utils/cn'

type MapEditActionOverlayProps = {
  title: string
  pointCount: number
  selectedPointIndex: number | null
  isAddingPoint: boolean
  isSaving: boolean
  minPointCount: number
  saveLabel: string
  addingMessage: string
  selectedPointMessage: (pointNumber: number) => string
  idleMessage: string
  addingWideMessage?: string
  selectedPointWideMessage?: (pointNumber: number) => string
  idleWideMessage?: string
  savingLabel?: string
  onStartAddPoint: () => void
  onRemoveSelectedPoint: () => void
  onSave: () => void | Promise<void>
  onCancel: () => void
}

function MapEditActionButton({
  children,
  className,
  variant = 'secondary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet'
}) {
  const variantClass =
    variant === 'primary'
      ? 'border border-border-strong bg-surface-muted text-ink'
      : variant === 'quiet'
        ? 'bg-surface-muted text-ink-strong'
        : 'border border-border bg-surface-raised text-ink'

  return (
    <button
      type="button"
      className={cn(
        variantClass,
        'rounded-2xl px-2 py-2.5 text-xs font-semibold disabled:opacity-50 sm:px-3 sm:py-3 sm:text-sm',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function MapEditActionOverlay({
  title,
  pointCount,
  selectedPointIndex,
  isAddingPoint,
  isSaving,
  minPointCount,
  saveLabel,
  addingMessage,
  selectedPointMessage,
  idleMessage,
  addingWideMessage = addingMessage,
  selectedPointWideMessage = selectedPointMessage,
  idleWideMessage = idleMessage,
  savingLabel = '...',
  onStartAddPoint,
  onRemoveSelectedPoint,
  onSave,
  onCancel,
}: MapEditActionOverlayProps) {
  const selectedPointNumber =
    selectedPointIndex === null ? null : selectedPointIndex + 1
  const compactMessage = isAddingPoint
    ? addingMessage
    : selectedPointNumber !== null
      ? selectedPointMessage(selectedPointNumber)
      : idleMessage
  const wideMessage = isAddingPoint
    ? addingWideMessage
    : selectedPointNumber !== null
      ? selectedPointWideMessage(selectedPointNumber)
      : idleWideMessage

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2 sm:p-4">
      <MobileMapFloatingCard>
        <div className="flex items-center justify-between gap-2 px-1 pb-2 sm:gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-ink sm:text-sm">{title}</div>
            <div className="text-[11px] text-ink-soft sm:hidden">{compactMessage}</div>
            <div className="mt-1 hidden text-xs text-ink-soft sm:block">
              {wideMessage}
            </div>
          </div>
          <div className="shrink-0 rounded-full border border-border bg-surface-raised px-2 py-1 text-[11px] font-medium text-ink sm:px-3 sm:text-xs">
            {pointCount} Punkte
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <MapEditActionButton onClick={onStartAddPoint}>
            Punkt +
          </MapEditActionButton>
          <MapEditActionButton
            onClick={onRemoveSelectedPoint}
            disabled={selectedPointIndex === null || pointCount <= minPointCount}
            variant="quiet"
          >
            Punkt -
          </MapEditActionButton>
          <MapEditActionButton
            onClick={() => void onSave()}
            disabled={isSaving}
            variant="primary"
          >
            {isSaving ? savingLabel : saveLabel}
          </MapEditActionButton>
          <MapEditActionButton onClick={onCancel} variant="quiet">
            Schließen
          </MapEditActionButton>
        </div>
      </MobileMapFloatingCard>
    </div>
  )
}
