import type { MutableRefObject } from 'react'
import { useGrazingSessionMapHistoryEditController } from '@/components/maps/hooks/use-grazing-session-map-history-edit-controller'
import { useGrazingSessionMapSessionController } from '@/components/maps/hooks/use-grazing-session-map-session-controller'
import type { GrazingSessionMapState } from '@/components/maps/hooks/use-grazing-session-map-state'
import type { PositionData } from '@/components/maps/grazing-session-map-types'
import type {
  Animal,
  GrazingSession,
  Herd,
  TrackPoint,
} from '@/types/domain'

type UseGrazingSessionMapControllerOptions = {
  activeSession: GrazingSession | null
  selectedSession: GrazingSession | null
  groupedSessionHistory: Array<{ dayKey: string }>
  safeCurrentTrackpoints: TrackPoint[]
  safeSelectedTrackpoints: TrackPoint[]
  safeHerds: Herd[]
  animalsByHerdId: Map<string, Animal[]>
  acceptedPositionRef: MutableRefObject<PositionData | null>
  selection: GrazingSessionMapState['selection']
  session: GrazingSessionMapState['session']
  edit: GrazingSessionMapState['edit']
  history: GrazingSessionMapState['history']
}

export function useGrazingSessionMapController({
  activeSession,
  selectedSession,
  groupedSessionHistory,
  safeCurrentTrackpoints,
  safeSelectedTrackpoints,
  safeHerds,
  animalsByHerdId,
  acceptedPositionRef,
  selection,
  session,
  edit,
  history,
}: UseGrazingSessionMapControllerOptions) {
  const sessionController = useGrazingSessionMapSessionController({
    activeSession,
    safeCurrentTrackpoints,
    safeHerds,
    animalsByHerdId,
    acceptedPositionRef,
    selection,
    session,
  })

  const historyEditController = useGrazingSessionMapHistoryEditController({
    activeSession,
    selectedSession,
    groupedSessionHistory,
    safeSelectedTrackpoints,
    selection,
    session,
    edit,
    history,
  })

  return {
    ...sessionController,
    ...historyEditController,
  }
}
