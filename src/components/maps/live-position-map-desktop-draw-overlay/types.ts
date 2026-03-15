import type { FormEvent } from 'react'
import type { MobilePanel, PositionData } from '@/components/maps/live-position-map-types'

export type LivePositionMapDesktopDrawOverlayProps = {
  mobilePanel: MobilePanel
  draftPointsLength: number
  draftAreaM2: number
  isDrawing: boolean
  name: string
  notes: string
  saveError: string
  isSaving: boolean
  isWalking: boolean
  walkPoints: PositionData[]
  walkAreaM2: number
  walkName: string
  walkNotes: string
  walkError: string
  isWalkSaving: boolean
  isWalkPointsOpen: boolean
  selectedWalkPointIndex: number | null
  selectedWalkPoint: PositionData | null
  onModeChange: (panel: MobilePanel) => void
  onStartDrawing: () => void
  onFinishDrawing: () => void
  onUndoLastPoint: () => void
  onClearDraft: () => void
  onNameChange: (value: string) => void
  onNotesChange: (value: string) => void
  onSaveEnclosure: (event: FormEvent<HTMLFormElement>) => void
  onToggleWalkPoints: () => void
  onSelectedWalkPointIndexChange: (index: number | null) => void
  onStartWalkMode: () => void
  onStopWalkMode: () => void
  onUndoLastWalkPoint: () => void
  onRemoveWalkPointAtIndex: (index: number) => void
  onDiscardWalkMode: () => void
  onWalkNameChange: (value: string) => void
  onWalkNotesChange: (value: string) => void
  onSaveWalkEnclosure: (event: FormEvent<HTMLFormElement>) => void
}

export type LivePositionMapDesktopDrawModeProps = Pick<
  LivePositionMapDesktopDrawOverlayProps,
  | 'draftPointsLength'
  | 'draftAreaM2'
  | 'isDrawing'
  | 'isWalking'
  | 'name'
  | 'notes'
  | 'saveError'
  | 'isSaving'
  | 'onStartDrawing'
  | 'onFinishDrawing'
  | 'onUndoLastPoint'
  | 'onClearDraft'
  | 'onNameChange'
  | 'onNotesChange'
  | 'onSaveEnclosure'
>

export type LivePositionMapDesktopWalkModeProps = Pick<
  LivePositionMapDesktopDrawOverlayProps,
  | 'walkPoints'
  | 'walkAreaM2'
  | 'isWalking'
  | 'isDrawing'
  | 'isWalkPointsOpen'
  | 'selectedWalkPointIndex'
  | 'selectedWalkPoint'
  | 'walkName'
  | 'walkNotes'
  | 'walkError'
  | 'isWalkSaving'
  | 'onToggleWalkPoints'
  | 'onSelectedWalkPointIndexChange'
  | 'onStartWalkMode'
  | 'onStopWalkMode'
  | 'onUndoLastWalkPoint'
  | 'onRemoveWalkPointAtIndex'
  | 'onDiscardWalkMode'
  | 'onWalkNameChange'
  | 'onWalkNotesChange'
  | 'onSaveWalkEnclosure'
>
