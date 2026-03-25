'use client'

import type { FormEvent } from 'react'
import { formatArea } from '@/lib/maps/map-core'
import { Card, CardContent } from '@/components/ui/card'
import { FormField, FormLabel, FormInput, FormTextarea, FormButton } from '@/components/ui/form'
import { Alert, ErrorAlert } from '@/components/ui/alert'

type LivePositionEnclosureEditFormProps = {
  editName: string
  editNotes: string
  editError: string
  isEditing: boolean
  editGeometryPointsLength: number
  editAreaM2: number
  selectedEditPointIndex: number | null
  isAddingEditPoint: boolean
  onEditNameChange: (value: string) => void
  onEditNotesChange: (value: string) => void
  onStartAddEditPoint: () => void
  onRemoveSelectedEditPoint: () => void
  onSaveEditedEnclosure: (event: FormEvent<HTMLFormElement>) => void
  onCancelEditEnclosure: () => void
}

export function LivePositionEnclosureEditForm({
  editName,
  editNotes,
  editError,
  isEditing,
  editGeometryPointsLength,
  editAreaM2,
  selectedEditPointIndex,
  isAddingEditPoint,
  onEditNameChange,
  onEditNotesChange,
  onStartAddEditPoint,
  onRemoveSelectedEditPoint,
  onSaveEditedEnclosure,
  onCancelEditEnclosure,
}: LivePositionEnclosureEditFormProps) {
  return (
    <form className="mt-4 space-y-3" onSubmit={onSaveEditedEnclosure}>
      <FormField>
        <FormLabel>Pferchname</FormLabel>
        <FormInput
          value={editName}
          onChange={(event) => onEditNameChange(event.target.value)}
        />
      </FormField>

      <FormField>
        <FormLabel>Notiz</FormLabel>
        <FormTextarea
          rows={3}
          value={editNotes}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => onEditNotesChange(event.target.value)}
        />
      </FormField>

      <Alert variant="info" className="text-sm">
        Punkte auf der Karte antippen und danach die neue Position in der Karte klicken. Mit
        Hinzufügen setzt der nächste Kartenklick einen neuen Punkt. Aktuell:{' '}
        <span className="font-medium">{editGeometryPointsLength}</span> Punkte · Fläche{' '}
        {formatArea(editAreaM2)}
        {selectedEditPointIndex !== null ? (
          <span> · Punkt {selectedEditPointIndex + 1} zum Verschieben ausgewählt</span>
        ) : null}
        {isAddingEditPoint ? (
          <span> · Neuer Punkt wird mit dem nächsten Kartenklick gesetzt</span>
        ) : null}
      </Alert>

      <div className="grid grid-cols-2 gap-2">
        <FormButton
          type="button"
          onClick={onStartAddEditPoint}
          variant="secondary"
        >
          Punkt hinzufügen
        </FormButton>
        <FormButton
          type="button"
          onClick={onRemoveSelectedEditPoint}
          disabled={selectedEditPointIndex === null || editGeometryPointsLength <= 3}
          variant="secondary"
        >
          Ausgewählten Punkt entfernen
        </FormButton>
      </div>

      {editError && (
        <ErrorAlert>{editError}</ErrorAlert>
      )}

      <div className="grid grid-cols-2 gap-2">
        <FormButton
          type="submit"
          disabled={isEditing}
          variant="primary"
        >
          {isEditing ? 'Speichert ...' : 'Pferch speichern'}
        </FormButton>
        <FormButton
          type="button"
          onClick={onCancelEditEnclosure}
          variant="secondary"
        >
          Abbrechen
        </FormButton>
      </div>
    </form>
  )
}
