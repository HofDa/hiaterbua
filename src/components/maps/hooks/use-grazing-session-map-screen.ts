import { useGrazingSessionMapScreenController } from '@/components/maps/hooks/use-grazing-session-map-screen-controller'
import { useGrazingSessionMapScreenData } from '@/components/maps/hooks/use-grazing-session-map-screen-data'
import { useGrazingSessionMapState } from '@/components/maps/hooks/use-grazing-session-map-state'

export function useGrazingSessionMapScreen() {
  const state = useGrazingSessionMapState()
  const screenData = useGrazingSessionMapScreenData(state)

  return useGrazingSessionMapScreenController({
    state,
    screenData,
  })
}
