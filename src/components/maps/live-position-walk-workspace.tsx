'use client'

import type { FormEvent } from 'react'
import { formatAccuracy, formatArea, formatTimestamp } from '@/lib/maps/map-core'
import { formatPointTimestamp } from '@/lib/maps/live-position-map-helpers'
import type { PositionData } from '@/components/maps/live-position-map-types'

type LivePositionWalkWorkspaceProps = {
  isDrawing: boolean
  isWalking: boolean
  walkPoints: PositionData[]
  walkAreaM2: number
  walkName: string
  walkNotes: string
  walkError: string
  isWalkSaving: boolean
  isWalkPointsOpen: boolean
  selectedWalkPointIndex: number | null
  selectedWalkPoint: PositionData | null
  showControls: boolean
  showStatusText: boolean
  showHint: boolean
  onToggleWalkPoints: () => void
  onSelectedWalkPointIndexChange: (index: number | null) => void
  onStartWalkMode: () => void
  onStopWalkMode: () => void
  onUndoLastWalkPoint: () => void
  onRemoveWalkPointAtIndex: (index: number) => void
  onDiscardWalkMode: () => void
  onWalkNameChange: (value: string) => void
  onWalkNotesChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function LivePositionWalkWorkspace({
  isDrawing,
  isWalking,
  walkPoints,
  walkAreaM2,
  walkName,
  walkNotes,
  walkError,
  isWalkSaving,
  isWalkPointsOpen,
  selectedWalkPointIndex,
  selectedWalkPoint,
  showControls,
  showStatusText,
  showHint,
  onToggleWalkPoints,
  onSelectedWalkPointIndexChange,
  onStartWalkMode,
  onStopWalkMode,
  onUndoLastWalkPoint,
  onRemoveWalkPointAtIndex,
  onDiscardWalkMode,
  onWalkNameChange,
  onWalkNotesChange,
  onSubmit,
}: LivePositionWalkWorkspaceProps) {
  const walkStatusText = isWalking
    ? 'GPS-Aufnahme laeuft. Punkte werden direkt auf der Karte markiert.'
    : 'Walk starten und den Pferch mit GPS-Punkten abgehen.'
  const averageAccuracy =
    walkPoints.length > 0
      ? walkPoints.reduce((sum, point) => sum + point.accuracy, 0) / walkPoints.length
      : null
  const latestPoint = walkPoints.length > 0 ? walkPoints[walkPoints.length - 1] : null

  return (
    <>
      {showStatusText ? (
        <p className="mt-2 text-sm text-neutral-700">{walkStatusText}</p>
      ) : null}
      {showHint ? (
        <p className="mt-2 text-xs font-medium text-neutral-700">
          Walk-Punkte können direkt auf der Karte angetippt und bearbeitet werden.
        </p>
      ) : null}

      {showControls ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onStartWalkMode}
            className="rounded-[1.1rem] border border-[#5a5347] bg-[#f1efeb] px-3 py-3 text-sm font-semibold text-[#17130f] disabled:opacity-50 sm:px-4 sm:py-4"
            disabled={isWalking || isDrawing}
          >
            Start
          </button>
          <button
            type="button"
            onClick={onStopWalkMode}
            className="rounded-[1.1rem] bg-[#f1efeb] px-3 py-3 text-sm font-semibold text-neutral-950 disabled:opacity-50 sm:px-4 sm:py-4"
            disabled={!isWalking}
          >
            Ende
          </button>
          <button
            type="button"
            onClick={onUndoLastWalkPoint}
            className="rounded-[1.1rem] bg-[#f1efeb] px-3 py-3 text-sm font-semibold text-neutral-950 disabled:opacity-50 sm:px-4 sm:py-4"
            disabled={walkPoints.length === 0}
          >
            Letzter Punkt
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedWalkPointIndex !== null) {
                onRemoveWalkPointAtIndex(selectedWalkPointIndex)
              }
            }}
            className="rounded-[1.1rem] bg-[#f1efeb] px-3 py-3 text-sm font-semibold text-neutral-950 disabled:opacity-50 sm:px-4 sm:py-4"
            disabled={selectedWalkPointIndex === null}
          >
            Ausgewählt
          </button>
          <button
            type="button"
            onClick={onDiscardWalkMode}
            className="col-span-2 rounded-[1.1rem] bg-[#f1efeb] px-3 py-3 text-sm font-semibold text-neutral-950 disabled:opacity-50 sm:px-4 sm:py-4"
            disabled={walkPoints.length === 0 && !isWalking}
          >
            Verwerfen
          </button>
        </div>
      ) : null}

      <div className="mt-4 rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm text-neutral-800 shadow-sm">
        Akzeptierte Walk-Punkte:{' '}
        <span className="font-medium text-neutral-900">{walkPoints.length}</span>
        <span className="ml-2">
          · Fläche <span className="font-medium text-neutral-900">{formatArea(walkAreaM2)}</span>
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-neutral-50 px-4 py-3">
          <div className="text-neutral-500">Mittlere Genauigkeit</div>
          <div className="mt-1 font-medium text-neutral-900">
            {averageAccuracy !== null ? formatAccuracy(averageAccuracy) : 'noch keine Daten'}
          </div>
        </div>
        <div className="rounded-2xl bg-neutral-50 px-4 py-3">
          <div className="text-neutral-500">Letzter akzeptierter Punkt</div>
          <div className="mt-1 font-medium text-neutral-900">
            {latestPoint ? formatTimestamp(latestPoint.timestamp) : 'noch keiner'}
          </div>
        </div>
      </div>

      {walkPoints.length > 0 ? (
        <div className="mt-4 rounded-2xl bg-neutral-50 px-4 py-3">
          <button
            type="button"
            onClick={onToggleWalkPoints}
            aria-expanded={isWalkPointsOpen}
            className="flex w-full items-start justify-between gap-3 text-left"
          >
            <div>
              <h3 className="text-sm font-medium text-neutral-900">Aufgenommene Weidegaenge</h3>
              <p className="mt-1 text-xs text-neutral-500">{walkPoints.length} Punkte gespeichert</p>
            </div>
            <span className="text-base text-neutral-900">{isWalkPointsOpen ? '−' : '+'}</span>
          </button>

          {isWalkPointsOpen ? (
            <>
              {selectedWalkPoint ? (
                <div className="mt-3 rounded-2xl border border-[#d2cbc0] bg-[#efe4c8] px-3 py-3 text-sm text-[#17130f]">
                  Ausgewaehlt: Punkt {selectedWalkPointIndex !== null ? selectedWalkPointIndex + 1 : ''}{' '}
                  um {formatPointTimestamp(selectedWalkPoint.timestamp)} mit{' '}
                  {formatAccuracy(selectedWalkPoint.accuracy)}.
                </div>
              ) : null}

              <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                {walkPoints.map((point, index) => (
                  <div
                    key={`${point.timestamp}-${index}`}
                    className={[
                      'grid grid-cols-[1fr_auto] gap-3 rounded-2xl px-3 py-3 text-sm',
                      selectedWalkPointIndex === index ? 'bg-[#efe4c8]' : 'bg-[#fffdf6]',
                    ].join(' ')}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectedWalkPointIndexChange(index)}
                      className="text-left"
                    >
                      <div className="font-medium text-neutral-900">Punkt {index + 1}</div>
                      <div className="mt-1 text-neutral-600">
                        {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">
                        {formatPointTimestamp(point.timestamp)} · Genauigkeit {formatAccuracy(point.accuracy)}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveWalkPointAtIndex(index)}
                      className="rounded-2xl bg-[#fffdf6] px-3 py-2 text-xs font-medium text-neutral-900"
                    >
                      Entfernen
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      <form className="mt-4 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium">Pferchname</label>
          <input
            className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
            value={walkName}
            onChange={(event) => onWalkNameChange(event.target.value)}
            placeholder="z. B. Weidekante Ost"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Notiz</label>
          <textarea
            className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
            rows={3}
            value={walkNotes}
            onChange={(event) => onWalkNotesChange(event.target.value)}
            placeholder="optionale Notiz zum abgelaufenen Pferch"
          />
        </div>

        {walkError ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {walkError}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isWalkSaving || walkPoints.length < 3}
          className="w-full rounded-2xl border border-[#5a5347] bg-[#f1efeb] px-4 py-4 font-medium text-[#17130f] disabled:opacity-50"
        >
          {isWalkSaving ? 'Speichert ...' : 'Abgelaufenen Pferch speichern'}
        </button>
      </form>
    </>
  )
}
