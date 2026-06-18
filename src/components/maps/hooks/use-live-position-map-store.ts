import { create } from 'zustand'
import { createCanvasSlice } from '@/components/maps/hooks/live-position-store/canvas-slice'
import { createSidebarSlice } from '@/components/maps/hooks/live-position-store/sidebar-slice'
import { createStatusSlice } from '@/components/maps/hooks/live-position-store/status-slice'
import { createWorkflowSlice } from '@/components/maps/hooks/live-position-store/workflow-slice'
import type { LivePositionMapStore } from '@/components/maps/hooks/live-position-store/types'

/**
 * Per-screen store for the live-position map. This is the replacement for the panel-prop
 * bags: components read exactly the slice they need via selectors, so a GPS tick only
 * re-renders the components that actually display the changed data — not the whole tree.
 *
 * Each panel's slice (values + stable handles + shallow-guarded setters) lives in its own
 * file under `live-position-store/`; this module just composes them into one store.
 */
export const useLivePositionMapStore = create<LivePositionMapStore>((...args) => ({
  ...createStatusSlice(...args),
  ...createCanvasSlice(...args),
  ...createWorkflowSlice(...args),
  ...createSidebarSlice(...args),
}))

export type { LivePositionStatusSlice } from '@/components/maps/hooks/live-position-store/status-slice'
export type {
  LivePositionCanvasSlice,
  LivePositionCanvasHandles,
} from '@/components/maps/hooks/live-position-store/canvas-slice'
export type {
  LivePositionWorkflowSlice,
  LivePositionWorkflowHandles,
} from '@/components/maps/hooks/live-position-store/workflow-slice'
export type {
  LivePositionSidebarSlice,
  LivePositionSidebarHandles,
} from '@/components/maps/hooks/live-position-store/sidebar-slice'
