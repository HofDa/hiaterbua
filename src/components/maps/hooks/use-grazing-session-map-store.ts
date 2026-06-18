import { create } from 'zustand'
import { createCanvasSlice } from '@/components/maps/hooks/grazing-store/canvas-slice'
import { createHistorySlice } from '@/components/maps/hooks/grazing-store/history-slice'
import { createManagementSlice } from '@/components/maps/hooks/grazing-store/management-slice'
import { createStatusSlice } from '@/components/maps/hooks/grazing-store/status-slice'
import type { GrazingSessionMapStore } from '@/components/maps/hooks/grazing-store/types'

/**
 * Per-screen store for the grazing-session map — the twin of the live-position store.
 * Panels read exactly the slice they need via selectors instead of receiving prop bags,
 * so a GPS tick (or a session-state change) only re-renders the components that display it.
 *
 * Each panel's slice lives in its own file under `grazing-store/`; this module composes them.
 */
export const useGrazingSessionMapStore = create<GrazingSessionMapStore>((...args) => ({
  ...createStatusSlice(...args),
  ...createCanvasSlice(...args),
  ...createManagementSlice(...args),
  ...createHistorySlice(...args),
}))

export type { GrazingStatusSlice } from '@/components/maps/hooks/grazing-store/status-slice'
export type {
  GrazingCanvasSlice,
  GrazingCanvasHandles,
} from '@/components/maps/hooks/grazing-store/canvas-slice'
export type {
  GrazingManagementSlice,
  GrazingManagementHandles,
} from '@/components/maps/hooks/grazing-store/management-slice'
export type {
  GrazingHistorySlice,
  GrazingHistoryHandles,
} from '@/components/maps/hooks/grazing-store/history-slice'
