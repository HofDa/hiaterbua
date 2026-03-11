import { useLivePositionMapScreenController } from '@/components/maps/hooks/use-live-position-map-screen-controller'
import { useLivePositionMapScreenData } from '@/components/maps/hooks/use-live-position-map-screen-data'
import { useLivePositionMapState } from '@/components/maps/hooks/use-live-position-map-state'

export function useLivePositionMapScreen() {
  const state = useLivePositionMapState()
  const screenData = useLivePositionMapScreenData(state)

  return useLivePositionMapScreenController({
    state,
    screenData,
  })
}
