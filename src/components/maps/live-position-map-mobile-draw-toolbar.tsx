'use client'

import { formatArea } from '@/lib/maps/map-core'
import {
  MobileMapToolbar,
  MobileMapToolbarButton,
  MobileMapToolbarStat,
} from '@/components/maps/mobile-map-toolbar'

type LivePositionMapMobileDrawToolbarProps = {
  draftPointsLength: number
  draftAreaM2: number
  isDrawing: boolean
  isWalking: boolean
  onStartDrawing: () => void
  onFinishDrawing: () => void
  onUndoLastPoint: () => void
  onClearDraft: () => void
}

export function LivePositionMapMobileDrawToolbar({
  draftPointsLength,
  draftAreaM2,
  isDrawing,
  isWalking,
  onStartDrawing,
  onFinishDrawing,
  onUndoLastPoint,
  onClearDraft,
}: LivePositionMapMobileDrawToolbarProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-2 lg:hidden">
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
    </div>
  )
}
