import { useLivePositionMapScreenController } from '@/components/maps/hooks/use-live-position-map-screen-controller'
import { useLivePositionMapScreenData } from '@/components/maps/hooks/use-live-position-map-screen-data'
import { useLivePositionMapState } from '@/components/maps/hooks/use-live-position-map-state'
import { useWakeLock } from '@/hooks/use-wake-lock'

export function useLivePositionMapScreen() {
  const state = useLivePositionMapState()
  const screenData = useLivePositionMapScreenData(state)

  // Keep the screen awake while a walk is being recorded with GPS.
  useWakeLock(state.walk.isWalking)

  return useLivePositionMapScreenController({
    state,
    screenData,
  })
}
