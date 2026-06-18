import { useGrazingSessionMapScreenController } from '@/components/maps/hooks/use-grazing-session-map-screen-controller'
import { useGrazingSessionMapScreenData } from '@/components/maps/hooks/use-grazing-session-map-screen-data'
import { useGrazingSessionMapState } from '@/components/maps/hooks/use-grazing-session-map-state'
import { useWakeLock } from '@/hooks/use-wake-lock'

export function useGrazingSessionMapScreen() {
  const state = useGrazingSessionMapState()
  const screenData = useGrazingSessionMapScreenData(state)

  // Keep the screen awake while a session is actively recording.
  useWakeLock(state.session.currentSessionStatus === 'active')

  return useGrazingSessionMapScreenController({
    state,
    screenData,
  })
}
