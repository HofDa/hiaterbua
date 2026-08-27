import { formatTimestamp, type GpsState, type PositionDecision } from '@/lib/maps/map-core'
import { buildGpsStatusText } from '@/lib/maps/gps-status-text'
import type { PositionData } from '@/components/maps/grazing-session-map-types'
import type { AppSettings, Herd, SessionStatus } from '@/types/domain'

type UseGrazingSessionMapPresentationOptions = {
  gpsState: GpsState
  position: PositionData | null
  lastPositionDecision: PositionDecision | null
  effectiveSettings: AppSettings
  safeHerds: Herd[]
  selectedHerdId: string
  currentSessionStatus: SessionStatus | null
}

export function useGrazingSessionMapPresentation({
  gpsState,
  position,
  lastPositionDecision,
  effectiveSettings,
  safeHerds,
  selectedHerdId,
  currentSessionStatus,
}: UseGrazingSessionMapPresentationOptions) {
  const { gpsLabel, gpsDetail, gpsFilterDetail } = buildGpsStatusText({
    gpsState,
    position,
    lastPositionDecision,
    settings: effectiveSettings,
    acceptedFilterDetail: 'Letzter Punkt wurde für den Weidegang akzeptiert.',
  })

  const selectedHerd = safeHerds.find((herd) => herd.id === selectedHerdId) ?? null
  const statusLabel =
    currentSessionStatus === 'active'
      ? 'Läuft'
      : currentSessionStatus === 'paused'
        ? 'Pausiert'
        : 'Bereit'

  return {
    gpsLabel,
    gpsDetail,
    gpsFilterDetail,
    herdLabel: selectedHerd?.name ?? 'noch nicht gewählt',
    statusLabel,
    coordinatesLabel: position
      ? `${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`
      : 'Noch keine Position',
    updateLabel: position ? formatTimestamp(position.timestamp) : 'Warte auf GPS',
  }
}
