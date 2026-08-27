import { useEffect } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { type GpsState, type PositionDecision } from '@/lib/maps/map-core'
import { buildGpsStatusText } from '@/lib/maps/gps-status-text'
import type { PositionData } from '@/components/maps/live-position-map-types'
import type { AppSettings, Enclosure } from '@/types/domain'

type UseLivePositionMapPresentationOptions = {
  gpsState: GpsState
  position: PositionData | null
  lastPositionDecision: PositionDecision | null
  effectiveSettings: AppSettings
  safeEnclosures: Enclosure[]
  selectedEnclosureId: string | null
  openEnclosureDetailsRef: MutableRefObject<(enclosureId: string) => void>
  focusMapOnEnclosure: (enclosure: Enclosure) => void
  setSelectedEnclosureId: Dispatch<SetStateAction<string | null>>
  setShowSelectedTrack: Dispatch<SetStateAction<boolean>>
  setEditingEnclosureId: Dispatch<SetStateAction<string | null>>
}

export function useLivePositionMapPresentation({
  gpsState,
  position,
  lastPositionDecision,
  effectiveSettings,
  safeEnclosures,
  selectedEnclosureId,
  openEnclosureDetailsRef,
  focusMapOnEnclosure,
  setSelectedEnclosureId,
  setShowSelectedTrack,
  setEditingEnclosureId,
}: UseLivePositionMapPresentationOptions) {
  function focusEnclosure(enclosure: Enclosure) {
    setSelectedEnclosureId(enclosure.id)
    setShowSelectedTrack(false)
    focusMapOnEnclosure(enclosure)
  }

  function handleMobileSelectedEnclosureChange(nextId: string) {
    // Selection drives the inline row expansion on mobile — tapping the
    // expanded row again collapses it.
    if (selectedEnclosureId === nextId) {
      setSelectedEnclosureId(null)
      setShowSelectedTrack(false)
      return
    }

    const nextEnclosure = safeEnclosures.find((enclosure) => enclosure.id === nextId) ?? null
    if (!nextEnclosure) return

    focusEnclosure(nextEnclosure)
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

  const { gpsLabel, gpsDetail, gpsFilterDetail } = buildGpsStatusText({
    gpsState,
    position,
    lastPositionDecision,
    settings: effectiveSettings,
    acceptedFilterDetail: 'Letzter Punkt wurde für Karte und Tracking akzeptiert.',
  })

  return {
    gpsLabel,
    gpsDetail,
    gpsFilterDetail,
    focusEnclosure,
    handleMobileSelectedEnclosureChange,
  }
}
