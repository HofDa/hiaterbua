import {
  formatAccuracy,
  formatTimestamp,
  type GpsState,
  type PositionDecision,
} from '@/lib/maps/map-core'
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
  const gpsLabel =
    gpsState === 'tracking'
      ? 'GPS aktiv'
      : gpsState === 'requesting'
        ? 'GPS wird angefragt'
        : gpsState === 'denied'
          ? 'GPS nicht erlaubt'
          : gpsState === 'unsupported'
            ? 'GPS nicht verfügbar'
            : gpsState === 'error'
              ? 'GPS Fehler'
              : 'GPS bereit'

  const gpsAccuracySuffix = position
    ? ` Letzte Genauigkeit: ${formatAccuracy(position.accuracy)}.`
    : ''

  const gpsDetail =
    gpsState === 'tracking' && position
      ? `Genauigkeit ca. ${formatAccuracy(position.accuracy)}`
      : gpsState === 'denied'
        ? `Standortfreigabe im Browser oder auf dem Gerät aktivieren.${gpsAccuracySuffix}`
        : gpsState === 'unsupported'
          ? `Dieses Gerät unterstützt keine Geolocation.${gpsAccuracySuffix}`
          : gpsState === 'error'
            ? `Standort konnte nicht ermittelt werden.${gpsAccuracySuffix}`
            : `Warte auf Standortdaten.${gpsAccuracySuffix}`

  const gpsFilterDetail =
    lastPositionDecision?.accepted === false
      ? lastPositionDecision.reason === 'accuracy'
        ? `Letzter Punkt verworfen: Genauigkeit schlechter als ${effectiveSettings.gpsAccuracyThresholdM} m.`
        : lastPositionDecision.reason === 'time'
          ? `Letzter Punkt verworfen: Mindestzeit von ${effectiveSettings.gpsMinTimeS} s noch nicht erreicht.`
          : `Letzter Punkt verworfen: Mindestdistanz von ${effectiveSettings.gpsMinDistanceM} m noch nicht erreicht.`
      : lastPositionDecision?.accepted
        ? 'Letzter Punkt wurde für den Weidegang akzeptiert.'
        : 'GPS-Filter noch ohne Entscheidung.'

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
