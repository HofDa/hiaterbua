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
      ? 'Der Pferch wird per GPS abgelaufen. Erst beenden, dann zeichnen.'
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

        <div className="min-w-[10rem] flex-1 px-1 text-xs font-medium text-ink-muted">
          {drawHint}
        </div>
      </div>

      <form className="mt-2 flex flex-wrap items-center gap-2 xl:gap-3" onSubmit={onSaveEnclosure}>
        <label htmlFor="desktop-draw-enclosure-name" className="sr-only">
          Pferchname
        </label>
        <input
          id="desktop-draw-enclosure-name"
          className="h-11 min-w-[11rem] flex-[1_1_12rem] rounded-2xl border border-border bg-surface-raised px-4 text-sm text-ink-strong outline-none placeholder:text-ink-soft focus:border-border-strong"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Pferchname"
        />

        <label htmlFor="desktop-draw-enclosure-notes" className="sr-only">
          Notiz
        </label>
        <input
          id="desktop-draw-enclosure-notes"
          className="h-11 min-w-[13rem] flex-[1.2_1_15rem] rounded-2xl border border-border bg-surface-raised px-4 text-sm text-ink-strong outline-none placeholder:text-ink-soft focus:border-border-strong"
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Notiz optional"
        />

        <button
          type="submit"
          disabled={isSaving || draftPointsLength < 3}
          className="h-11 shrink-0 rounded-2xl border border-border-strong bg-surface-muted px-4 text-sm font-semibold text-ink disabled:opacity-50"
        >
          {isSaving ? 'Speichert ...' : 'Pferch speichern'}
        </button>

        {saveError ? (
          <div className="basis-full rounded-2xl bg-error-surface px-4 py-2 text-xs font-medium text-error-ink">
            {saveError}
          </div>
        ) : null}
      </form>
    </>
  )
}
