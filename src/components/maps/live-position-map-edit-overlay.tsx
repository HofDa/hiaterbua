'use client'

import { MobileMapFloatingCard } from '@/components/maps/mobile-map-ui'

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
    <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2 sm:p-4">
      <MobileMapFloatingCard>
        <div className="flex items-center justify-between gap-2 px-1 pb-2 sm:gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-neutral-900 sm:text-sm">
              Pferch bearbeiten
            </div>
            <div className="text-[11px] text-neutral-800 sm:hidden">
              {isAddingEditPoint
                ? 'Neuer Punkt: nächster Tap auf Karte.'
                : selectedEditPointIndex !== null
                  ? `Punkt ${selectedEditPointIndex + 1} aktiv.`
                  : 'Punkt antippen oder Aktion wählen.'}
            </div>
            <div className="mt-1 hidden text-xs text-neutral-800 sm:block">
              {isAddingEditPoint
                ? 'Nächster Kartenklick setzt einen neuen Punkt.'
                : selectedEditPointIndex !== null
                  ? `Punkt ${selectedEditPointIndex + 1} ist zum Verschieben ausgewählt.`
                  : 'Punkt antippen und neu setzen oder unten Aktion wählen.'}
            </div>
          </div>
          <div className="shrink-0 rounded-full border border-[#ccb98a] bg-[#fffdf6] px-2 py-1 text-[11px] font-medium text-[#17130f] sm:px-3 sm:text-xs">
            {editGeometryPointsLength} Punkte
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={onStartAddEditPoint}
            className="rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-2 py-2.5 text-xs font-medium text-[#17130f] sm:px-3 sm:py-3 sm:text-sm"
          >
            Punkt +
          </button>
          <button
            type="button"
            onClick={onRemoveSelectedEditPoint}
            disabled={selectedEditPointIndex === null || editGeometryPointsLength <= 3}
            className="rounded-2xl bg-[#f1efeb] px-2 py-2.5 text-xs font-semibold text-neutral-950 disabled:opacity-50 sm:px-3 sm:py-3 sm:text-sm"
          >
            Punkt -
          </button>
          <button
            type="button"
            onClick={() => void onPersistEditedEnclosure()}
            disabled={isEditing}
            className="rounded-2xl border border-[#5a5347] bg-[#f1efeb] px-2 py-2.5 text-xs font-semibold text-[#17130f] disabled:opacity-50 sm:px-3 sm:py-3 sm:text-sm"
          >
            {isEditing ? '...' : 'Pferch speichern'}
          </button>
          <button
            type="button"
            onClick={onCancelEditEnclosure}
            className="rounded-2xl bg-[#f1efeb] px-2 py-2.5 text-xs font-semibold text-neutral-950 sm:px-3 sm:py-3 sm:text-sm"
          >
            Schließen
          </button>
        </div>
      </MobileMapFloatingCard>
    </div>
  )
}
