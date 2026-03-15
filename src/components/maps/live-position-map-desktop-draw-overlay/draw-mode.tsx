'use client'

import { formatArea } from '@/lib/maps/map-core'
import {
  MobileMapToolbar,
  MobileMapToolbarButton,
  MobileMapToolbarStat,
} from '@/components/maps/mobile-map-toolbar'
import type { LivePositionMapDesktopDrawModeProps } from './types'

export function LivePositionMapDesktopDrawMode({
  draftPointsLength,
  draftAreaM2,
  isDrawing,
  isWalking,
  name,
  notes,
  saveError,
  isSaving,
  onStartDrawing,
  onFinishDrawing,
  onUndoLastPoint,
  onClearDraft,
  onNameChange,
  onNotesChange,
  onSaveEnclosure,
}: LivePositionMapDesktopDrawModeProps) {
  const drawHint = isDrawing
    ? 'Jeder Klick setzt einen Punkt.'
    : isWalking
      ? 'GPS-Walk läuft. Erst beenden, dann zeichnen.'
      : 'Pferch direkt auf der Karte setzen.'

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-2 xl:gap-3">
        <MobileMapToolbar>
          <MobileMapToolbarStat>
            {draftPointsLength} P · {formatArea(draftAreaM2)}
          </MobileMapToolbarStat>
          <MobileMapToolbarButton
            aria-label="Zeichnen starten"
            title="Zeichnen starten"
            onClick={onStartDrawing}
            disabled={isDrawing || isWalking}
            variant="primary"
            label="Start"
          >
            +
          </MobileMapToolbarButton>
          <MobileMapToolbarButton
            aria-label="Zeichnen beenden"
            title="Zeichnen beenden"
            onClick={onFinishDrawing}
            disabled={!isDrawing}
            label="Fertig"
          >
            ✓
          </MobileMapToolbarButton>
          <MobileMapToolbarButton
            aria-label="Letzten Punkt löschen"
            title="Letzten Punkt löschen"
            onClick={onUndoLastPoint}
            disabled={draftPointsLength === 0}
            label="Zurück"
          >
            ↶
          </MobileMapToolbarButton>
          <MobileMapToolbarButton
            aria-label="Entwurf verwerfen"
            title="Entwurf verwerfen"
            onClick={onClearDraft}
            disabled={draftPointsLength === 0}
            label="Abbruch"
          >
            ×
          </MobileMapToolbarButton>
        </MobileMapToolbar>

        <div className="min-w-[10rem] flex-1 px-1 text-xs font-medium text-neutral-700">
          {drawHint}
        </div>
      </div>

      <form className="mt-2 flex flex-wrap items-center gap-2 xl:gap-3" onSubmit={onSaveEnclosure}>
        <label htmlFor="desktop-draw-enclosure-name" className="sr-only">
          Pferchname
        </label>
        <input
          id="desktop-draw-enclosure-name"
          className="h-11 min-w-[11rem] flex-[1_1_12rem] rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-4 text-sm text-neutral-950 outline-none placeholder:text-neutral-500 focus:border-[#5a5347]"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Pferchname"
        />

        <label htmlFor="desktop-draw-enclosure-notes" className="sr-only">
          Notiz
        </label>
        <input
          id="desktop-draw-enclosure-notes"
          className="h-11 min-w-[13rem] flex-[1.2_1_15rem] rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-4 text-sm text-neutral-950 outline-none placeholder:text-neutral-500 focus:border-[#5a5347]"
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Notiz optional"
        />

        <button
          type="submit"
          disabled={isSaving || draftPointsLength < 3}
          className="h-11 shrink-0 rounded-2xl border border-[#5a5347] bg-[#f1efeb] px-4 text-sm font-semibold text-[#17130f] disabled:opacity-50"
        >
          {isSaving ? 'Speichert ...' : 'Pferch speichern'}
        </button>

        {saveError ? (
          <div className="basis-full rounded-2xl bg-red-50 px-4 py-2 text-xs font-medium text-red-700">
            {saveError}
          </div>
        ) : null}
      </form>
    </>
  )
}
