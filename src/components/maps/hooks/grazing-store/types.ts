import type { CanvasSlice } from './canvas-slice'
import type { HistorySlice } from './history-slice'
import type { ManagementSlice } from './management-slice'
import type { StatusSlice } from './status-slice'

/** The composed grazing-session store: one slice per panel, plus the shared status toggle. */
export type GrazingSessionMapStore = StatusSlice &
  CanvasSlice &
  ManagementSlice &
  HistorySlice
