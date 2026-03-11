'use client'

import type { FormEvent } from 'react'
import { formatArea } from '@/lib/maps/map-core'

type LivePositionDrawWorkspaceProps = {
  isDrawing: boolean
  isWalking: boolean
  draftPointsCount: number
  draftAreaM2: number
  name: string
  notes: string
  saveError: string
  isSaving: boolean
  showControls: boolean
  showStatusText: boolean
  onStartDrawing: () => void
  onFinishDrawing: () => void
  onUndoLastPoint: () => void
  onClearDraft: () => void
  onNameChange: (value: string) => void
  onNotesChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function LivePositionDrawWorkspace({
  isDrawing,
  isWalking,
  draftPointsCount,
  draftAreaM2,
  name,
  notes,
  saveError,
  isSaving,
  showControls,
  showStatusText,
  onStartDrawing,
  onFinishDrawing,
  onUndoLastPoint,
  onClearDraft,
  onNameChange,
  onNotesChange,
  onSubmit,
}: LivePositionDrawWorkspaceProps) {
  const drawStatusText = isDrawing
    ? 'Jeder Klick auf die Karte setzt einen neuen Punkt.'
    : isWalking
      ? 'Der GPS-Walk läuft noch. Erst beenden, dann zeichnen.'
      : 'Zeichnen starten und die Ecken direkt auf der Karte setzen.'

  return (
    <>
      {showStatusText ? (
        <p className="mt-2 text-sm text-neutral-700">{drawStatusText}</p>
      ) : null}

      {showControls ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onStartDrawing}
            className="rounded-[1.1rem] border border-[#5a5347] bg-[#f1efeb] px-3 py-3 text-sm font-semibold text-[#17130f] disabled:opacity-50 sm:px-4 sm:py-4"
            disabled={isDrawing || isWalking}
          >
            Start
          </button>
          <button
            type="button"
            onClick={onFinishDrawing}
            className="rounded-[1.1rem] bg-[#f1efeb] px-3 py-3 text-sm font-semibold text-neutral-950 disabled:opacity-50 sm:px-4 sm:py-4"
            disabled={!isDrawing}
          >
            Ende
          </button>
          <button
            type="button"
            onClick={onUndoLastPoint}
            className="rounded-[1.1rem] bg-[#f1efeb] px-3 py-3 text-sm font-semibold text-neutral-950 disabled:opacity-50 sm:px-4 sm:py-4"
            disabled={draftPointsCount === 0}
          >
            Letzter Punkt
          </button>
          <button
            type="button"
            onClick={onClearDraft}
            className="rounded-[1.1rem] bg-[#f1efeb] px-3 py-3 text-sm font-semibold text-neutral-950 disabled:opacity-50 sm:px-4 sm:py-4"
            disabled={draftPointsCount === 0}
          >
            Verwerfen
          </button>
        </div>
      ) : null}

      <div className="mt-4 rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm text-neutral-800 shadow-sm">
        Punkte gesetzt: <span className="font-medium text-neutral-900">{draftPointsCount}</span>
        <span className="ml-2">
          · Fläche <span className="font-medium text-neutral-900">{formatArea(draftAreaM2)}</span>
        </span>
      </div>

      <form className="mt-4 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium">Pferchname</label>
          <input
            className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="z. B. Nordhang 1"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Notiz</label>
          <textarea
            className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
            rows={3}
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="optionale Bemerkungen zum Pferch"
          />
        </div>

        {saveError ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {saveError}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSaving || draftPointsCount < 3}
          className="w-full rounded-2xl border border-[#5a5347] bg-[#f1efeb] px-4 py-4 font-medium text-[#17130f] disabled:opacity-50"
        >
          {isSaving ? 'Speichert ...' : 'Pferch speichern'}
        </button>
      </form>
    </>
  )
}
