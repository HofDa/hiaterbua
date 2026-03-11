import { useEffect } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import {
  formatAccuracy,
  type GpsState,
  type PositionDecision,
} from '@/lib/maps/map-core'
import type { PositionData } from '@/components/maps/live-position-map-types'
import type { AppSettings, Enclosure } from '@/types/domain'

type UseLivePositionMapPresentationOptions = {
  gpsState: GpsState
  position: PositionData | null
  lastPositionDecision: PositionDecision | null
  effectiveSettings: AppSettings
  safeEnclosures: Enclosure[]
  openEnclosureDetailsRef: MutableRefObject<(enclosureId: string) => void>
  focusMapOnEnclosure: (enclosure: Enclosure) => void
  setSelectedEnclosureId: Dispatch<SetStateAction<string | null>>
  setShowSelectedTrack: Dispatch<SetStateAction<boolean>>
  setIsSelectedEnclosureInfoOpen: Dispatch<SetStateAction<boolean>>
  setEditingEnclosureId: Dispatch<SetStateAction<string | null>>
}

export function useLivePositionMapPresentation({
  gpsState,
  position,
  lastPositionDecision,
  effectiveSettings,
  safeEnclosures,
  openEnclosureDetailsRef,
  focusMapOnEnclosure,
  setSelectedEnclosureId,
  setShowSelectedTrack,
  setIsSelectedEnclosureInfoOpen,
  setEditingEnclosureId,
}: UseLivePositionMapPresentationOptions) {
  function focusEnclosure(enclosure: Enclosure) {
    setSelectedEnclosureId(enclosure.id)
    setShowSelectedTrack(false)
    focusMapOnEnclosure(enclosure)
  }

  function handleMobileSelectedEnclosureChange(nextId: string) {
    const nextEnclosure = safeEnclosures.find((enclosure) => enclosure.id === nextId) ?? null
    if (!nextEnclosure) return

    focusEnclosure(nextEnclosure)
    setIsSelectedEnclosureInfoOpen(true)
  }

  useEffect(() => {
    openEnclosureDetailsRef.current = (enclosureId: string) => {
      const enclosure = safeEnclosures.find(
        (currentEnclosure) => currentEnclosure.id === enclosureId
      )

      if (!enclosure) return

      setSelectedEnclosureId(enclosure.id)
      setShowSelectedTrack(false)
      focusMapOnEnclosure(enclosure)
      setEditingEnclosureId(enclosure.id)
    }
  }, [
    focusMapOnEnclosure,
    openEnclosureDetailsRef,
    safeEnclosures,
    setEditingEnclosureId,
    setSelectedEnclosureId,
    setShowSelectedTrack,
  ])

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
        ? 'Letzter Punkt wurde für Karte und Tracking akzeptiert.'
        : 'GPS-Filter noch ohne Entscheidung.'

  return {
    gpsLabel,
    gpsDetail,
    gpsFilterDetail,
    focusEnclosure,
    handleMobileSelectedEnclosureChange,
  }
}
