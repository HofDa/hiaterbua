import { create } from 'zustand'
import { shallow } from 'zustand/shallow'
import type { GpsState } from '@/lib/maps/map-core'
import type { PositionData } from '@/components/maps/live-position-map-types'

/**
 * Per-screen store for the live-position map. This is the replacement for the panel-prop
 * bags: components read exactly the slice they need via selectors, so a GPS tick only
 * re-renders the status card instead of the whole panel tree.
 *
 * First migrated slice: the live-status card — the highest-frequency consumer.
 */
export type LivePositionStatusSlice = {
  gpsState: GpsState
  gpsLabel: string
  gpsDetail: string
  gpsFilterDetail: string
  position: PositionData | null
}

const initialStatusSlice: LivePositionStatusSlice = {
  gpsState: 'idle',
  gpsLabel: '',
  gpsDetail: '',
  gpsFilterDetail: '',
  position: null,
}

type LivePositionMapStore = {
  isLiveStatusOpen: boolean
  status: LivePositionStatusSlice
  toggleLiveStatus: () => void
  setStatus: (status: LivePositionStatusSlice) => void
}

export const useLivePositionMapStore = create<LivePositionMapStore>((set) => ({
  isLiveStatusOpen: false,
  status: initialStatusSlice,
  toggleLiveStatus: () => set((state) => ({ isLiveStatusOpen: !state.isLiveStatusOpen })),
  // Preserve the existing `status` reference when nothing changed, so selector
  // subscribers (the status card) skip re-rendering on unrelated screen updates.
  setStatus: (status) => set((state) => (shallow(state.status, status) ? state : { status })),
}))
