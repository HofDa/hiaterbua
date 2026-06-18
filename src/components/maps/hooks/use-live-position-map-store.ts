import { create } from 'zustand'
import { shallow } from 'zustand/shallow'
import type { FormEvent } from 'react'
import type { GpsState } from '@/lib/maps/map-core'
import type {
  MobilePanel,
  PositionData,
} from '@/components/maps/live-position-map-types'
import type { MapBaseLayer } from '@/types/domain'

/**
 * Per-screen store for the live-position map. This is the replacement for the panel-prop
 * bags: components read exactly the slice they need via selectors, so a GPS tick only
 * re-renders the components that actually display the changed data — not the whole tree.
 *
 * Migrated so far: the live-status card and the map canvas panel.
 */
export type LivePositionStatusSlice = {
  gpsState: GpsState
  gpsLabel: string
  gpsDetail: string
  gpsFilterDetail: string
  position: PositionData | null
}

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

const initialStatusSlice: LivePositionStatusSlice = {
  gpsState: 'idle',
  gpsLabel: '',
  gpsDetail: '',
  gpsFilterDetail: '',
  position: null,
}

const noop = () => {}

// Seed handles so the canvas panel never reads `null` on its first render (before the
// screen hook's publish effect runs). Replaced once with the real, stable handles.
const initialCanvasHandles: LivePositionCanvasHandles = {
  onCenterMap: noop,
  onToggleBaseLayerMenu: noop,
  onUpdateBaseLayer: noop,
  onToggleShowSurveyAreas: noop,
  onPrefetchVisibleMapArea: noop,
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

const initialCanvasSlice: LivePositionCanvasSlice = {
  mobilePanel: 'saved',
  editingEnclosureId: null,
  position: null,
  isBaseLayerMenuOpen: false,
  baseLayer: 'south-tyrol-orthophoto-2023',
  showSurveyAreas: true,
  prefetchingMapArea: false,
  prefetchStatus: '',
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

type LivePositionMapStore = {
  isLiveStatusOpen: boolean
  status: LivePositionStatusSlice
  canvas: LivePositionCanvasSlice
  canvasHandles: LivePositionCanvasHandles
  toggleLiveStatus: () => void
  setStatus: (status: LivePositionStatusSlice) => void
  setCanvas: (canvas: LivePositionCanvasSlice) => void
  setCanvasHandles: (handles: LivePositionCanvasHandles) => void
}

export const useLivePositionMapStore = create<LivePositionMapStore>((set) => ({
  isLiveStatusOpen: false,
  status: initialStatusSlice,
  canvas: initialCanvasSlice,
  canvasHandles: initialCanvasHandles,
  toggleLiveStatus: () => set((state) => ({ isLiveStatusOpen: !state.isLiveStatusOpen })),
  // Preserve the existing reference when nothing changed, so selector subscribers skip
  // re-rendering on unrelated screen updates.
  setStatus: (status) => set((state) => (shallow(state.status, status) ? state : { status })),
  setCanvas: (canvas) => set((state) => (shallow(state.canvas, canvas) ? state : { canvas })),
  // The handles are referentially stable, so this effectively runs once.
  setCanvasHandles: (handles) =>
    set((state) => (state.canvasHandles === handles ? state : { canvasHandles: handles })),
}))
