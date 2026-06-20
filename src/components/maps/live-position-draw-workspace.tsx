'use client'

import type { FormEvent } from 'react'
import { formatArea } from '@/lib/maps/map-core'
import { FormField, FormLabel, FormInput, FormTextarea, FormButton } from '@/components/ui/form'
import { Alert, ErrorAlert } from '@/components/ui/alert'

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
      ? 'Der Pferch wird noch per GPS abgelaufen. Erst beenden, dann zeichnen.'
      : 'Zeichnen starten und die Ecken direkt auf der Karte setzen.'

  return (
    <>
      {showStatusText ? (
        <p className="mt-2 text-sm text-ink-muted">{drawStatusText}</p>
      ) : null}

      {showControls ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
          <FormButton
            type="button"
            onClick={onStartDrawing}
            disabled={isDrawing || isWalking}
            variant="primary"
            className="py-3 px-3 sm:px-4 sm:py-4"
          >
            Start
          </FormButton>
          <FormButton
            type="button"
            onClick={onFinishDrawing}
            disabled={!isDrawing}
            variant="secondary"
            className="py-3 px-3 sm:px-4 sm:py-4"
          >
            Ende
          </FormButton>
          <FormButton
            type="button"
            onClick={onUndoLastPoint}
            disabled={draftPointsCount === 0}
            variant="secondary"
            className="py-3 px-3 sm:px-4 sm:py-4"
          >
            Letzter Punkt
          </FormButton>
          <FormButton
            type="button"
            onClick={onClearDraft}
            disabled={draftPointsCount === 0}
            variant="secondary"
            className="py-3 px-3 sm:px-4 sm:py-4"
          >
            Verwerfen
          </FormButton>
        </div>
      ) : null}

      <Alert variant="info" className="mt-4 text-sm">
        Punkte gesetzt: <span className="font-medium text-ink">{draftPointsCount}</span>
        <span className="ml-2">
          · Fläche <span className="font-medium text-ink">{formatArea(draftAreaM2)}</span>
        </span>
      </Alert>

      <form className="mt-4 space-y-4" onSubmit={onSubmit}>
        <FormField>
          <FormLabel>Pferchname</FormLabel>
          <FormInput
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="z. B. Nordhang 1"
          />
        </FormField>

        <FormField>
          <FormLabel>Notiz</FormLabel>
          <FormTextarea
            rows={3}
            value={notes}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => onNotesChange(event.target.value)}
            placeholder="optionale Bemerkungen zum Pferch"
          />
        </FormField>

        {saveError && (
          <ErrorAlert>{saveError}</ErrorAlert>
        )}

        <FormButton
          type="submit"
          disabled={isSaving || draftPointsCount < 3}
          variant="primary"
          className="w-full"
        >
          {isSaving ? 'Speichert ...' : 'Pferch speichern'}
        </FormButton>
      </form>
    </>
  )
}
