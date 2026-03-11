'use client'

import type { FormEvent } from 'react'
import { formatArea } from '@/lib/maps/map-core'

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
      <div>
        <label className="mb-1 block text-sm font-medium">Pferchname</label>
        <input
          className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
          value={editName}
          onChange={(event) => onEditNameChange(event.target.value)}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Notiz</label>
        <textarea
          className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
          rows={3}
          value={editNotes}
          onChange={(event) => onEditNotesChange(event.target.value)}
        />
      </div>

      <div className="rounded-2xl border border-[#d2cbc0] bg-[#efe4c8] px-4 py-3 text-sm text-[#17130f]">
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
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onStartAddEditPoint}
          className="rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-[#17130f]"
        >
          Punkt hinzufügen
        </button>
        <button
          type="button"
          onClick={onRemoveSelectedEditPoint}
          disabled={selectedEditPointIndex === null || editGeometryPointsLength <= 3}
          className="rounded-2xl bg-[#fffdf6] px-4 py-3 text-sm font-medium text-neutral-900 disabled:opacity-50"
        >
          Ausgewählten Punkt entfernen
        </button>
      </div>

      {editError ? (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{editError}</div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="submit"
          disabled={isEditing}
          className="rounded-2xl border border-[#5a5347] bg-[#f1efeb] px-4 py-4 text-sm font-medium text-[#17130f] disabled:opacity-50"
        >
          {isEditing ? 'Speichert ...' : 'Pferch speichern'}
        </button>
        <button
          type="button"
          onClick={onCancelEditEnclosure}
          className="rounded-2xl bg-[#fffdf6] px-4 py-4 text-sm font-medium text-neutral-900"
        >
          Abbrechen
        </button>
      </div>
    </form>
  )
}
