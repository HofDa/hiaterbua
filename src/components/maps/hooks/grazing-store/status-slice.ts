import type { StateCreator } from 'zustand'
import { shallowGuardedSetter } from '@/components/maps/hooks/store-slice-helpers'
import type { GpsState } from '@/lib/maps/map-core'
import type { GrazingSessionMapStore } from './types'

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

export type StatusSlice = {
  isLiveStatusOpen: boolean
  status: GrazingStatusSlice
  toggleLiveStatus: () => void
  setStatus: (status: GrazingStatusSlice) => void
}

export const createStatusSlice: StateCreator<GrazingSessionMapStore, [], [], StatusSlice> = (
  set,
) => ({
  isLiveStatusOpen: false,
  status: initialStatusSlice,
  toggleLiveStatus: () => set((state) => ({ isLiveStatusOpen: !state.isLiveStatusOpen })),
  setStatus: shallowGuardedSetter(set, 'status'),
})
