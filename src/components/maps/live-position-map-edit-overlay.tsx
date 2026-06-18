'use client'

import { MapEditActionOverlay } from '@/components/maps/map-edit-action-overlay'

type LivePositionMapEditOverlayProps = {
  editGeometryPointsLength: number
  selectedEditPointIndex: number | null
  isAddingEditPoint: boolean
  isEditing: boolean
  onStartAddEditPoint: () => void
  onRemoveSelectedEditPoint: () => void
  onPersistEditedEnclosure: () => void | Promise<void>
  onCancelEditEnclosure: () => void
}

export function LivePositionMapEditOverlay({
  editGeometryPointsLength,
  selectedEditPointIndex,
  isAddingEditPoint,
  isEditing,
  onStartAddEditPoint,
  onRemoveSelectedEditPoint,
  onPersistEditedEnclosure,
  onCancelEditEnclosure,
}: LivePositionMapEditOverlayProps) {
  return (
    <MapEditActionOverlay
      title="Pferch bearbeiten"
      pointCount={editGeometryPointsLength}
      selectedPointIndex={selectedEditPointIndex}
      isAddingPoint={isAddingEditPoint}
      isSaving={isEditing}
      minPointCount={3}
      saveLabel="Pferch speichern"
      addingMessage="Neuer Punkt: nächster Tap auf Karte."
      selectedPointMessage={(pointNumber) => `Punkt ${pointNumber} aktiv.`}
      idleMessage="Punkt antippen oder Aktion wählen."
      addingWideMessage="Nächster Kartenklick setzt einen neuen Punkt."
      selectedPointWideMessage={(pointNumber) =>
        `Punkt ${pointNumber} ist zum Verschieben ausgewählt.`
      }
      idleWideMessage="Punkt antippen und neu setzen oder unten Aktion wählen."
      onStartAddPoint={onStartAddEditPoint}
      onRemoveSelectedPoint={onRemoveSelectedEditPoint}
      onSave={onPersistEditedEnclosure}
      onCancel={onCancelEditEnclosure}
    />
  )
}
