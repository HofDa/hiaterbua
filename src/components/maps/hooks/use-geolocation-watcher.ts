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

// A timed-out watchPosition often stops delivering fixes on mobile browsers,
// so a transient GPS hiccup (common when signal drops mid-fieldwalk) would
// otherwise wedge live recording until a page reload. Restart the watch after
// a short backoff to re-kick the OS location provider.
const WATCH_RESTART_DELAY_MS = 2_000
const WATCH_STALL_TIMEOUT_MS = 30_000

/** Fired (via {@link requestGpsRetry}) when the user asks to re-attempt location access. */
export const GPS_RETRY_EVENT = 'pastore:gps-retry'

/** Ask the active geolocation watcher to re-arm — e.g. from a "Standort aktivieren" button. */
export function requestGpsRetry() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(GPS_RETRY_EVENT))
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

    let stopped = false
    let restartTimer: ReturnType<typeof setTimeout> | null = null
    let stallTimer: ReturnType<typeof setTimeout> | null = null

    const clearActiveWatch = () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }

    const clearStallTimer = () => {
      if (stallTimer !== null) {
        clearTimeout(stallTimer)
        stallTimer = null
      }
    }

    const armStallTimer = () => {
      clearStallTimer()
      if (stopped) return

      stallTimer = setTimeout(() => {
        stallTimer = null
        if (stopped) return

        setGpsState('error')
        scheduleRestart()
      }, WATCH_STALL_TIMEOUT_MS)
    }

    const scheduleRestart = () => {
      if (stopped || restartTimer !== null) return
      clearStallTimer()
      restartTimer = setTimeout(() => {
        restartTimer = null
        if (stopped) return
        clearActiveWatch()
        startWatch()
      }, WATCH_RESTART_DELAY_MS)
    }

    const startWatch = () => {
      if (stopped) return

      setGpsState('requesting')
      armStallTimer()

      watchIdRef.current = navigator.geolocation.watchPosition(
        (rawPosition) => {
          armStallTimer()
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
          clearStallTimer()

          // Losing GPS permission is terminal; nothing to recover.
          if (error.code === error.PERMISSION_DENIED) {
            clearActiveWatch()
            setGpsState('denied')
            return
          }

          // TIMEOUT / POSITION_UNAVAILABLE are transient. Surface the error
          // state but keep the last accepted position and restart the watch
          // so recording resumes once the signal returns.
          setGpsState('error')
          scheduleRestart()
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10_000,
          timeout: 20_000,
        }
      )
    }

    startWatch()

    const handleGpsRetry = () => {
      if (stopped) return
      // Manual re-attempt from the UI: drop any dead/scheduled watch and re-arm.
      // Re-prompts when the permission is still grantable, or resumes tracking
      // once the user has enabled location in their device/browser settings.
      if (restartTimer !== null) {
        clearTimeout(restartTimer)
        restartTimer = null
      }
      clearActiveWatch()
      startWatch()
    }

    window.addEventListener(GPS_RETRY_EVENT, handleGpsRetry)

    return () => {
      stopped = true
      window.removeEventListener(GPS_RETRY_EVENT, handleGpsRetry)
      clearStallTimer()
      if (restartTimer !== null) {
        clearTimeout(restartTimer)
        restartTimer = null
      }
      clearActiveWatch()
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
