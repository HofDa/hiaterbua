import {
  formatAccuracy,
  MAX_REASONABLE_POSITION_SPEED_MPS,
  type GpsState,
  type PositionDecision,
} from '@/lib/maps/map-core'
import type { GpsPosition } from '@/lib/maps/position-types'
import type { AppSettings } from '@/types/domain'

export type GpsStatusText = {
  /** Short headline for the status card, e.g. "GPS aktiv". */
  gpsLabel: string
  /** One line explaining the current GPS state, including the last known accuracy. */
  gpsDetail: string
  /** Why the last fix was accepted or rejected by the configured GPS filter. */
  gpsFilterDetail: string
}

export type BuildGpsStatusTextOptions = {
  gpsState: GpsState
  position: GpsPosition | null
  lastPositionDecision: PositionDecision | null
  settings: AppSettings
  /**
   * What an accepted fix was used for. The only wording that differs between the
   * screens — the enclosure map tracks the map itself, the grazing map a session.
   */
  acceptedFilterDetail: string
}

/**
 * The GPS status wording shared by the enclosure and grazing-session maps. Both
 * screens render the same status card from the same geolocation state, so the
 * thresholds quoted back to the user must stay identical — this is the single
 * place those sentences are written.
 */
export function buildGpsStatusText({
  gpsState,
  position,
  lastPositionDecision,
  settings,
  acceptedFilterDetail,
}: BuildGpsStatusTextOptions): GpsStatusText {
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
        ? `Letzter Punkt verworfen: Genauigkeit schlechter als ${settings.gpsAccuracyThresholdM} m.`
        : lastPositionDecision.reason === 'time'
          ? `Letzter Punkt verworfen: Mindestzeit von ${settings.gpsMinTimeS} s noch nicht erreicht.`
          : lastPositionDecision.reason === 'distance'
            ? `Letzter Punkt verworfen: Mindestdistanz von ${settings.gpsMinDistanceM} m noch nicht erreicht.`
            : `Letzter Punkt verworfen: schneller als ${settings.gpsMaxSpeedMps ?? MAX_REASONABLE_POSITION_SPEED_MPS} m/s.`
      : lastPositionDecision?.accepted
        ? acceptedFilterDetail
        : 'GPS-Filter noch ohne Entscheidung.'

  return { gpsLabel, gpsDetail, gpsFilterDetail }
}
