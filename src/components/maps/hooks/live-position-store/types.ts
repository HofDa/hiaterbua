import type { CanvasSlice } from './canvas-slice'
import type { SidebarSlice } from './sidebar-slice'
import type { StatusSlice } from './status-slice'
import type { WorkflowSlice } from './workflow-slice'

/** The composed live-position store: one slice per panel, plus the shared status toggle. */
export type LivePositionMapStore = StatusSlice & CanvasSlice & WorkflowSlice & SidebarSlice
