import { create } from 'zustand'
import { shallow } from 'zustand/shallow'
import type { GpsState } from '@/lib/maps/map-core'
import type { SessionMetrics } from '@/lib/maps/grazing-session-map-helpers'
import type { PositionData } from '@/components/maps/grazing-session-map-types'
import type {
  Herd,
  MapBaseLayer,
  SessionEvent,
  SessionEventType,
  SessionStatus,
} from '@/types/domain'

/**
 * Per-screen store for the grazing-session map — the twin of the live-position store.
 * Panels read exactly the slice they need via selectors instead of receiving prop bags,
 * so a GPS tick (or a session-state change) only re-renders the components that display it.
 */
export type GrazingStatusSlice = {
  gpsState: GpsState
  gpsLabel: string
  gpsDetail: string
  gpsFilterDetail: string
  herdLabel: string
  statusLabel: string
  coordinatesLabel: string
  updateLabel: string
}

/** Values the canvas panel renders. Pushed from the screen hook (shallow-guarded). */
export type GrazingCanvasSlice = {
  editingSessionId: string | null
  safeCurrentTrackpointsLength: number
  currentDistanceM: number
  currentDurationS: number
  safeHerds: Herd[]
  selectedHerdId: string
  selectedAnimalCount: number | null
  sessionNotes: string
  currentSessionStatus: SessionStatus | null
  isSaving: boolean
  isEventSaving: boolean
  hasHerds: boolean
  eventNote: string
  eventStatus: string
  actionError: string
  currentMetrics: SessionMetrics | null
  safeCurrentSessionEvents: SessionEvent[]
  position: PositionData | null
  isBaseLayerMenuOpen: boolean
  baseLayer: MapBaseLayer
  showSurveyAreas: boolean
  showSessionEventsOnMap: boolean
  prefetchingMapArea: boolean
  prefetchStatus: string
  isAddingEditTrackpoint: boolean
  selectedEditTrackpointIndex: number | null
  editTrackpointsLength: number
}

/** Canvas panel callbacks. Stabilized via `useStableHandles`, so this object is set once. */
export type GrazingCanvasHandles = {
  onSelectedHerdIdChange: (value: string) => void
  onAdjustAnimalCount: (delta: number) => void | Promise<void>
  onSessionNotesChange: (value: string) => void
  onStartOrResumeSession: () => void | Promise<void>
  onPauseSession: () => void | Promise<void>
  onResumeSession: () => void | Promise<void>
  onStopSession: () => void | Promise<void>
  onEventNoteChange: (value: string) => void
  onAddSessionMarkerEvent: (type: SessionEventType, comment?: string) => void | Promise<void>
  onCenterMap: () => void
  onToggleBaseLayerMenu: () => void
  onUpdateBaseLayer: (nextBaseLayer: MapBaseLayer) => void | Promise<void>
  onToggleShowSurveyAreas: () => void
  onToggleShowSessionEventsOnMap: () => void
  onPrefetchVisibleMapArea: () => void | Promise<void>
  onStartAddEditTrackpoint: () => void
  onRemoveSelectedEditTrackpoint: () => void
  onSaveEditedSession: () => void | Promise<void>
  onCancelEditSession: () => void
}

const noop = () => {}

const initialStatusSlice: GrazingStatusSlice = {
  gpsState: 'idle',
  gpsLabel: '',
  gpsDetail: '',
  gpsFilterDetail: '',
  herdLabel: '',
  statusLabel: '',
  coordinatesLabel: '',
  updateLabel: '',
}

const initialCanvasSlice: GrazingCanvasSlice = {
  editingSessionId: null,
  safeCurrentTrackpointsLength: 0,
  currentDistanceM: 0,
  currentDurationS: 0,
  safeHerds: [],
  selectedHerdId: '',
  selectedAnimalCount: null,
  sessionNotes: '',
  currentSessionStatus: null,
  isSaving: false,
  isEventSaving: false,
  hasHerds: false,
  eventNote: '',
  eventStatus: '',
  actionError: '',
  currentMetrics: null,
  safeCurrentSessionEvents: [],
  position: null,
  isBaseLayerMenuOpen: false,
  baseLayer: 'south-tyrol-orthophoto-2023',
  showSurveyAreas: true,
  showSessionEventsOnMap: true,
  prefetchingMapArea: false,
  prefetchStatus: '',
  isAddingEditTrackpoint: false,
  selectedEditTrackpointIndex: null,
  editTrackpointsLength: 0,
}

const initialCanvasHandles: GrazingCanvasHandles = {
  onSelectedHerdIdChange: noop,
  onAdjustAnimalCount: noop,
  onSessionNotesChange: noop,
  onStartOrResumeSession: noop,
  onPauseSession: noop,
  onResumeSession: noop,
  onStopSession: noop,
  onEventNoteChange: noop,
  onAddSessionMarkerEvent: noop,
  onCenterMap: noop,
  onToggleBaseLayerMenu: noop,
  onUpdateBaseLayer: noop,
  onToggleShowSurveyAreas: noop,
  onToggleShowSessionEventsOnMap: noop,
  onPrefetchVisibleMapArea: noop,
  onStartAddEditTrackpoint: noop,
  onRemoveSelectedEditTrackpoint: noop,
  onSaveEditedSession: noop,
  onCancelEditSession: noop,
}

type GrazingSessionMapStore = {
  isLiveStatusOpen: boolean
  status: GrazingStatusSlice
  canvas: GrazingCanvasSlice
  canvasHandles: GrazingCanvasHandles
  toggleLiveStatus: () => void
  setStatus: (status: GrazingStatusSlice) => void
  setCanvas: (canvas: GrazingCanvasSlice) => void
  setCanvasHandles: (handles: GrazingCanvasHandles) => void
}

export const useGrazingSessionMapStore = create<GrazingSessionMapStore>((set) => ({
  isLiveStatusOpen: false,
  status: initialStatusSlice,
  canvas: initialCanvasSlice,
  canvasHandles: initialCanvasHandles,
  toggleLiveStatus: () => set((state) => ({ isLiveStatusOpen: !state.isLiveStatusOpen })),
  // Preserve the existing reference when nothing changed, so selector subscribers skip
  // re-rendering on unrelated screen updates.
  setStatus: (status) => set((state) => (shallow(state.status, status) ? state : { status })),
  setCanvas: (canvas) => set((state) => (shallow(state.canvas, canvas) ? state : { canvas })),
  // Handles are referentially stable, so this effectively runs once.
  setCanvasHandles: (handles) =>
    set((state) => (state.canvasHandles === handles ? state : { canvasHandles: handles })),
}))
