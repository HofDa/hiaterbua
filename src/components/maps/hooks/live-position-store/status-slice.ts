import type { StateCreator } from 'zustand'
import { shallow } from 'zustand/shallow'
import type { GpsState } from '@/lib/maps/map-core'
import type { PositionData } from '@/components/maps/live-position-map-types'
import type { LivePositionMapStore } from './types'

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

export type StatusSlice = {
  isLiveStatusOpen: boolean
  status: LivePositionStatusSlice
  toggleLiveStatus: () => void
  setStatus: (status: LivePositionStatusSlice) => void
}

export const createStatusSlice: StateCreator<LivePositionMapStore, [], [], StatusSlice> = (
  set,
) => ({
  isLiveStatusOpen: false,
  status: initialStatusSlice,
  toggleLiveStatus: () => set((state) => ({ isLiveStatusOpen: !state.isLiveStatusOpen })),
  // Preserve the existing reference when nothing changed, so selector subscribers skip
  // re-rendering on unrelated screen updates.
  setStatus: (status) => set((state) => (shallow(state.status, status) ? state : { status })),
})
