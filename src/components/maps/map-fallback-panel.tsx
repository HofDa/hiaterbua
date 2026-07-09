'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

type MapFallbackPosition = {
  latitude: number
  longitude: number
  accuracy?: number | null
}

type MapFallbackPanelProps = {
  title: string
  detail: string
  position: MapFallbackPosition | null
  statusLabel: string
  children: ReactNode
}

function formatCoordinate(value: number) {
  return value.toFixed(5)
}

export function MapFallbackPanel({
  title,
  detail,
  position,
  statusLabel,
  children,
}: MapFallbackPanelProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-surface-raised/90 p-4">
      <div className="pointer-events-auto w-full max-w-xl rounded-[1.2rem] border-2 border-border bg-surface p-4 text-ink-strong shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-warning-ink">
          Kartenansicht eingeschränkt
        </div>
        <h2 className="mt-1 text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm font-medium text-ink-muted">{detail}</p>

        <div className="mt-3 grid gap-2 text-sm font-medium text-ink-muted sm:grid-cols-2">
          <div>Status: {statusLabel}</div>
          <div>
            GPS:{' '}
            {position
              ? `${formatCoordinate(position.latitude)}, ${formatCoordinate(position.longitude)}${
                  typeof position.accuracy === 'number'
                    ? ` · ca. ${Math.round(position.accuracy)} m`
                    : ''
                }`
              : 'noch kein aktueller Standort'}
          </div>
        </div>

        <div className={cn('mt-4 grid gap-2', 'sm:grid-cols-2')}>{children}</div>
      </div>
    </div>
  )
}
