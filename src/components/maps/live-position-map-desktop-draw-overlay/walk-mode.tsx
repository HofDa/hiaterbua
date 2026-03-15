'use client'

import {
  formatAccuracy,
  formatArea,
  formatTimestamp,
} from '@/lib/maps/map-core'
import { formatPointTimestamp } from '@/lib/maps/live-position-map-helpers'
import {
  MobileMapToolbar,
  MobileMapToolbarButton,
  MobileMapToolbarStat,
} from '@/components/maps/mobile-map-toolbar'
import type { LivePositionMapDesktopWalkModeProps } from './types'

function LivePositionMapDesktopWalkPointsList({
  walkPoints,
  isWalkPointsOpen,
  selectedWalkPointIndex,
  selectedWalkPoint,
  onSelectedWalkPointIndexChange,
  onRemoveWalkPointAtIndex,
}: Pick<
  LivePositionMapDesktopWalkModeProps,
  | 'walkPoints'
  | 'isWalkPointsOpen'
  | 'selectedWalkPointIndex'
  | 'selectedWalkPoint'
  | 'onSelectedWalkPointIndexChange'
  | 'onRemoveWalkPointAtIndex'
>) {
  if (!isWalkPointsOpen || walkPoints.length === 0) {
    return null
  }

  return (
    <div className="rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-3 py-3">
      {selectedWalkPoint ? (
        <div className="rounded-2xl bg-[#efe4c8] px-3 py-2 text-sm text-[#17130f]">
          Aktiv: Punkt {selectedWalkPointIndex !== null ? selectedWalkPointIndex + 1 : ''} um{' '}
          {formatPointTimestamp(selectedWalkPoint.timestamp)} mit{' '}
          {formatAccuracy(selectedWalkPoint.accuracy)}.
        </div>
      ) : null}
      <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
        {walkPoints.map((point, index) => (
          <div
            key={`${point.timestamp}-${index}`}
            className={[
              'grid grid-cols-[1fr_auto] gap-3 rounded-2xl px-3 py-3 text-sm',
              selectedWalkPointIndex === index ? 'bg-[#efe4c8]' : 'bg-neutral-50',
            ].join(' ')}
          >
            <button
              type="button"
              onClick={() => onSelectedWalkPointIndexChange(index)}
              className="text-left"
            >
              <div className="font-medium text-neutral-900">Punkt {index + 1}</div>
              <div className="mt-1 text-xs text-neutral-500">
                {formatPointTimestamp(point.timestamp)} · {formatAccuracy(point.accuracy)}
              </div>
            </button>
            <button
              type="button"
              onClick={() => onRemoveWalkPointAtIndex(index)}
              className="rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-3 py-2 text-xs font-medium text-neutral-900"
            >
              Entfernen
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function LivePositionMapDesktopWalkMode({
  walkPoints,
  walkAreaM2,
  isWalking,
  isDrawing,
  isWalkPointsOpen,
  selectedWalkPointIndex,
  selectedWalkPoint,
  walkName,
  walkNotes,
  walkError,
  isWalkSaving,
  onToggleWalkPoints,
  onSelectedWalkPointIndexChange,
  onStartWalkMode,
  onStopWalkMode,
  onUndoLastWalkPoint,
  onRemoveWalkPointAtIndex,
  onDiscardWalkMode,
  onWalkNameChange,
  onWalkNotesChange,
  onSaveWalkEnclosure,
}: LivePositionMapDesktopWalkModeProps) {
  const walkHint = isWalking
    ? 'GPS-Aufnahme läuft entlang des Pferchs.'
    : isDrawing
      ? 'Zeichnen ist aktiv. Erst beenden, dann GPS starten.'
      : 'Pferch mit GPS-Punkten abgehen.'
  const averageAccuracy =
    walkPoints.length > 0
      ? walkPoints.reduce((sum, point) => sum + point.accuracy, 0) / walkPoints.length
      : null
  const latestPoint = walkPoints.length > 0 ? walkPoints[walkPoints.length - 1] : null

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2 xl:gap-3">
        <MobileMapToolbar>
          <MobileMapToolbarStat>
            {walkPoints.length} P · {formatArea(walkAreaM2)}
          </MobileMapToolbarStat>
          <MobileMapToolbarButton
            aria-label="GPS-Walk starten"
            title="GPS-Walk starten"
            onClick={onStartWalkMode}
            disabled={isWalking || isDrawing}
            variant="primary"
            label="Start"
          >
            +
          </MobileMapToolbarButton>
          <MobileMapToolbarButton
            aria-label="GPS-Walk beenden"
            title="GPS-Walk beenden"
            onClick={onStopWalkMode}
            disabled={!isWalking}
            label="Fertig"
          >
            ✓
          </MobileMapToolbarButton>
          <MobileMapToolbarButton
            aria-label="Letzten GPS-Punkt löschen"
            title="Letzten GPS-Punkt löschen"
            onClick={onUndoLastWalkPoint}
            disabled={walkPoints.length === 0}
            label="Zurück"
          >
            ↶
          </MobileMapToolbarButton>
          <MobileMapToolbarButton
            aria-label="Ausgewählten GPS-Punkt löschen"
            title="Ausgewählten GPS-Punkt löschen"
            onClick={() => {
              if (selectedWalkPointIndex !== null) {
                onRemoveWalkPointAtIndex(selectedWalkPointIndex)
              }
            }}
            disabled={selectedWalkPointIndex === null}
            label="Punkt -"
          >
            -
          </MobileMapToolbarButton>
          <MobileMapToolbarButton
            aria-label="GPS-Entwurf verwerfen"
            title="GPS-Entwurf verwerfen"
            onClick={onDiscardWalkMode}
            disabled={walkPoints.length === 0 && !isWalking}
            label="Abbruch"
          >
            ×
          </MobileMapToolbarButton>
        </MobileMapToolbar>

        <div className="min-w-[10rem] flex-1 px-1 text-xs font-medium text-neutral-700">
          {walkHint}
        </div>
      </div>

      <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div className="rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-600">
            Genauigkeit
          </div>
          <div className="mt-1 font-medium text-neutral-900">
            {averageAccuracy !== null ? formatAccuracy(averageAccuracy) : 'noch keine Daten'}
          </div>
        </div>
        <div className="rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-600">
            Letzter Punkt
          </div>
          <div className="mt-1 font-medium text-neutral-900">
            {latestPoint ? formatTimestamp(latestPoint.timestamp) : 'noch keiner'}
          </div>
        </div>
        {walkPoints.length > 0 ? (
          <button
            type="button"
            onClick={onToggleWalkPoints}
            aria-expanded={isWalkPointsOpen}
            className="h-full min-h-11 rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-semibold text-neutral-950"
          >
            {isWalkPointsOpen ? 'Punkte zu' : 'Punkte'}
          </button>
        ) : null}
      </div>

      <LivePositionMapDesktopWalkPointsList
        walkPoints={walkPoints}
        isWalkPointsOpen={isWalkPointsOpen}
        selectedWalkPointIndex={selectedWalkPointIndex}
        selectedWalkPoint={selectedWalkPoint}
        onSelectedWalkPointIndexChange={onSelectedWalkPointIndexChange}
        onRemoveWalkPointAtIndex={onRemoveWalkPointAtIndex}
      />

      <form className="flex flex-wrap items-center gap-2 xl:gap-3" onSubmit={onSaveWalkEnclosure}>
        <label htmlFor="desktop-walk-enclosure-name" className="sr-only">
          Pferchname
        </label>
        <input
          id="desktop-walk-enclosure-name"
          className="h-11 min-w-[11rem] flex-[1_1_12rem] rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-4 text-sm text-neutral-950 outline-none placeholder:text-neutral-500 focus:border-[#5a5347]"
          value={walkName}
          onChange={(event) => onWalkNameChange(event.target.value)}
          placeholder="Pferchname"
        />

        <label htmlFor="desktop-walk-enclosure-notes" className="sr-only">
          Notiz
        </label>
        <input
          id="desktop-walk-enclosure-notes"
          className="h-11 min-w-[13rem] flex-[1.2_1_15rem] rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-4 text-sm text-neutral-950 outline-none placeholder:text-neutral-500 focus:border-[#5a5347]"
          value={walkNotes}
          onChange={(event) => onWalkNotesChange(event.target.value)}
          placeholder="Notiz optional"
        />

        <button
          type="submit"
          disabled={isWalkSaving || walkPoints.length < 3}
          className="h-11 shrink-0 rounded-2xl border border-[#5a5347] bg-[#f1efeb] px-4 text-sm font-semibold text-[#17130f] disabled:opacity-50"
        >
          {isWalkSaving ? 'Speichert ...' : 'GPS-Pferch speichern'}
        </button>

        {walkError ? (
          <div className="basis-full rounded-2xl bg-red-50 px-4 py-2 text-xs font-medium text-red-700">
            {walkError}
          </div>
        ) : null}
      </form>
    </div>
  )
}
