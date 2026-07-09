import type { StateCreator } from 'zustand'
import {
  identityGuardedSetter,
  shallowGuardedSetter,
} from '@/components/maps/hooks/store-slice-helpers'
import type { FormEvent } from 'react'
import type {
  MobilePanel,
  PositionData,
} from '@/components/maps/live-position-map-types'
import type { MapBaseLayer } from '@/types/domain'
import type { LivePositionMapStore } from './types'

/** Values the canvas panel renders. Pushed from the screen hook (shallow-guarded). */
export type LivePositionCanvasSlice = {
  mobilePanel: MobilePanel
  editingEnclosureId: string | null
  position: PositionData | null
  isBaseLayerMenuOpen: boolean
  baseLayer: MapBaseLayer
  showSurveyAreas: boolean
  prefetchingMapArea: boolean
  prefetchStatus: string
  mapReady: boolean
  mapLoadState: 'loading' | 'retrying' | 'ready' | 'failed'
  mapWarning: string
  isDrawing: boolean
  isWalking: boolean
  draftPointsLength: number
  draftAreaM2: number
  name: string
  notes: string
  saveError: string
  isSaving: boolean
  walkPoints: PositionData[]
  walkPointsLength: number
  walkAreaM2: number
  walkName: string
  walkNotes: string
  walkError: string
  isWalkSaving: boolean
  isWalkPointsOpen: boolean
  selectedWalkPointIndex: number | null
  selectedWalkPoint: PositionData | null
  editGeometryPointsLength: number
  selectedEditPointIndex: number | null
  isAddingEditPoint: boolean
  isEditing: boolean
}

/** Canvas panel callbacks. Stabilized via `useStableHandles`, so this object is set once. */
export type LivePositionCanvasHandles = {
  onCenterMap: () => void
  onToggleBaseLayerMenu: () => void
  onUpdateBaseLayer: (nextBaseLayer: MapBaseLayer) => void | Promise<void>
  onToggleShowSurveyAreas: () => void
  onPrefetchVisibleMapArea: () => void | Promise<void>
  onCancelPrefetchVisibleMapArea: () => void
  onStartDrawing: () => void
  onFinishDrawing: () => void
  onUndoLastPoint: () => void
  onClearDraft: () => void
  onNameChange: (value: string) => void
  onNotesChange: (value: string) => void
  onSaveEnclosure: (event: FormEvent<HTMLFormElement>) => void
  onMobilePanelChange: (panel: MobilePanel) => void
  onToggleWalkPoints: () => void
  onSelectedWalkPointIndexChange: (index: number | null) => void
  onStartWalkMode: () => void | Promise<void>
  onStopWalkMode: () => void
  onUndoLastWalkPoint: () => void | Promise<void>
  onRemoveWalkPointAtIndex: (index: number) => void | Promise<void>
  onDiscardWalkMode: () => void | Promise<void>
  onWalkNameChange: (value: string) => void
  onWalkNotesChange: (value: string) => void
  onSaveWalkEnclosure: (event: FormEvent<HTMLFormElement>) => void
  onStartAddEditPoint: () => void
  onRemoveSelectedEditPoint: () => void
  onPersistEditedEnclosure: () => void | Promise<void>
  onCancelEditEnclosure: () => void
}

const noop = () => {}

const initialCanvasSlice: LivePositionCanvasSlice = {
  mobilePanel: 'saved',
  editingEnclosureId: null,
  position: null,
  isBaseLayerMenuOpen: false,
  baseLayer: 'south-tyrol-orthophoto-2023',
  showSurveyAreas: true,
  prefetchingMapArea: false,
  prefetchStatus: '',
  mapReady: false,
  mapLoadState: 'loading',
  mapWarning: '',
  isDrawing: false,
  isWalking: false,
  draftPointsLength: 0,
  draftAreaM2: 0,
  name: '',
  notes: '',
  saveError: '',
  isSaving: false,
  walkPoints: [],
  walkPointsLength: 0,
  walkAreaM2: 0,
  walkName: '',
  walkNotes: '',
  walkError: '',
  isWalkSaving: false,
  isWalkPointsOpen: false,
  selectedWalkPointIndex: null,
  selectedWalkPoint: null,
  editGeometryPointsLength: 0,
  selectedEditPointIndex: null,
  isAddingEditPoint: false,
  isEditing: false,
}

// Seed handles so the canvas panel never reads `null` on its first render (before the
// screen hook's publish effect runs). Replaced once with the real, stable handles.
const initialCanvasHandles: LivePositionCanvasHandles = {
  onCenterMap: noop,
  onToggleBaseLayerMenu: noop,
  onUpdateBaseLayer: noop,
  onToggleShowSurveyAreas: noop,
  onPrefetchVisibleMapArea: noop,
  onCancelPrefetchVisibleMapArea: noop,
  onStartDrawing: noop,
  onFinishDrawing: noop,
  onUndoLastPoint: noop,
  onClearDraft: noop,
  onNameChange: noop,
  onNotesChange: noop,
  onSaveEnclosure: noop,
  onMobilePanelChange: noop,
  onToggleWalkPoints: noop,
  onSelectedWalkPointIndexChange: noop,
  onStartWalkMode: noop,
  onStopWalkMode: noop,
  onUndoLastWalkPoint: noop,
  onRemoveWalkPointAtIndex: noop,
  onDiscardWalkMode: noop,
  onWalkNameChange: noop,
  onWalkNotesChange: noop,
  onSaveWalkEnclosure: noop,
  onStartAddEditPoint: noop,
  onRemoveSelectedEditPoint: noop,
  onPersistEditedEnclosure: noop,
  onCancelEditEnclosure: noop,
}

export type CanvasSlice = {
  canvas: LivePositionCanvasSlice
  canvasHandles: LivePositionCanvasHandles
  setCanvas: (canvas: LivePositionCanvasSlice) => void
  setCanvasHandles: (handles: LivePositionCanvasHandles) => void
}

export const createCanvasSlice: StateCreator<LivePositionMapStore, [], [], CanvasSlice> = (
  set,
) => ({
  canvas: initialCanvasSlice,
  canvasHandles: initialCanvasHandles,
  setCanvas: shallowGuardedSetter(set, 'canvas'),
  setCanvasHandles: identityGuardedSetter(set, 'canvasHandles'),
})
