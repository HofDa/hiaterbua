import type { StateCreator } from 'zustand'
import { shallowGuardedSetter } from '@/components/maps/hooks/store-slice-helpers'
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
  setStatus: shallowGuardedSetter(set, 'status'),
})
