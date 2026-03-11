'use client'

import { formatArea } from '@/lib/maps/map-core'
import {
  CloseIcon,
  PlayIcon,
  StopIcon,
  UndoIcon,
} from '@/components/maps/map-toolbar-icons'
import {
  MobileMapToolbar,
  MobileMapToolbarButton,
  MobileMapToolbarStat,
} from '@/components/maps/mobile-map-toolbar'

type LivePositionMapMobileWalkToolbarProps = {
  walkPointsLength: number
  walkAreaM2: number
  isWalking: boolean
  isDrawing: boolean
  onStartWalkMode: () => void | Promise<void>
  onStopWalkMode: () => void
  onUndoLastWalkPoint: () => void | Promise<void>
  onDiscardWalkMode: () => void | Promise<void>
}

export function LivePositionMapMobileWalkToolbar({
  walkPointsLength,
  walkAreaM2,
  isWalking,
  isDrawing,
  onStartWalkMode,
  onStopWalkMode,
  onUndoLastWalkPoint,
  onDiscardWalkMode,
}: LivePositionMapMobileWalkToolbarProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-2 lg:hidden">
      <MobileMapToolbar>
        <MobileMapToolbarStat>
          {walkPointsLength} P · {formatArea(walkAreaM2)}
        </MobileMapToolbarStat>
        <MobileMapToolbarButton
          aria-label="Walk starten"
          title="Walk starten"
          onClick={() => void onStartWalkMode()}
          disabled={isWalking || isDrawing}
          variant="primary"
          label="Start"
        >
          <PlayIcon />
        </MobileMapToolbarButton>
        <MobileMapToolbarButton
          aria-label="Walk beenden"
          title="Walk beenden"
          onClick={onStopWalkMode}
          disabled={!isWalking}
          label="Stop"
        >
          <StopIcon />
        </MobileMapToolbarButton>
        <MobileMapToolbarButton
          aria-label="Letzten Walk-Punkt löschen"
          title="Letzten Walk-Punkt löschen"
          onClick={() => void onUndoLastWalkPoint()}
          disabled={walkPointsLength === 0}
          label="Zurück"
        >
          <UndoIcon />
        </MobileMapToolbarButton>
        <MobileMapToolbarButton
          aria-label="Walk verwerfen"
          title="Walk verwerfen"
          onClick={() => void onDiscardWalkMode()}
          disabled={walkPointsLength === 0 && !isWalking}
          label="Abbruch"
        >
          <CloseIcon />
        </MobileMapToolbarButton>
      </MobileMapToolbar>
    </div>
  )
}
