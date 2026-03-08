import { useEffect } from 'react'
import type { MutableRefObject } from 'react'
import { getPositionDecision, type GpsState, type PositionDecision } from '@/lib/maps/map-core'
import type { AppSettings } from '@/types/domain'

type BaseTrackedPosition = {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

type UseGeolocationWatcherOptions<T extends BaseTrackedPosition> = {
  acceptedPositionRef: MutableRefObject<T | null>
  buildPositionRef: MutableRefObject<(position: GeolocationPosition) => T>
  onAcceptedPositionRef?: MutableRefObject<((position: T) => void) | null>
  settingsRef: MutableRefObject<AppSettings>
  watchIdRef: MutableRefObject<number | null>
  setGpsState: (value: GpsState) => void
  setLastPositionDecision: (value: PositionDecision | null) => void
  setPosition: (value: T | null) => void
}

export function useGeolocationWatcher<T extends BaseTrackedPosition>({
  acceptedPositionRef,
  buildPositionRef,
  onAcceptedPositionRef,
  settingsRef,
  watchIdRef,
  setGpsState,
  setLastPositionDecision,
  setPosition,
}: UseGeolocationWatcherOptions<T>) {
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGpsState('unsupported')
      return
    }

    setGpsState('requesting')

    const watchId = navigator.geolocation.watchPosition(
      (rawPosition) => {
        const nextPosition = buildPositionRef.current(rawPosition)
        const currentSettings = settingsRef.current
        const decision = getPositionDecision(
          acceptedPositionRef.current,
          nextPosition,
          currentSettings.gpsAccuracyThresholdM,
          currentSettings.gpsMinTimeS,
          currentSettings.gpsMinDistanceM
        )

        setLastPositionDecision(decision)

        if (!decision.accepted) {
          setGpsState('tracking')
          return
        }

        acceptedPositionRef.current = nextPosition
        setPosition(nextPosition)
        setGpsState('tracking')
        onAcceptedPositionRef?.current?.(nextPosition)
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGpsState('denied')
          return
        }

        setGpsState('error')
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 20_000,
      }
    )

    watchIdRef.current = watchId

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [
    acceptedPositionRef,
    buildPositionRef,
    onAcceptedPositionRef,
    setGpsState,
    setLastPositionDecision,
    setPosition,
    settingsRef,
    watchIdRef,
  ])
}
