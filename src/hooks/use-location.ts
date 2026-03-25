import { useState, useEffect, useCallback, useRef } from 'react'
import { useAsyncOperation } from './use-async-operation'
import type { Coordinates, LocationError } from '@/lib/utils/location'
import { 
  isLocationEnabled, 
  requestHighAccuracyLocation, 
  watchLocation, 
  stopWatchingLocation,
  isLocationAccurate
} from '@/lib/utils/location'

export interface UseLocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
  accuracyThreshold?: number
  watchInterval?: boolean
}

export interface UseLocationReturn {
  currentLocation: Coordinates | null
  locationError: LocationError | null
  isGettingLocation: boolean
  isWatching: boolean
  hasPermission: boolean | null
  lastUpdate: string | null
  
  // Actions
  getCurrentLocation: () => Promise<Coordinates | null>
  startWatching: () => void
  stopWatchingLocation: () => void
  clearLocation: () => void
  checkPermission: () => Promise<boolean>
}

export function useLocation(options: UseLocationOptions = {}): UseLocationReturn {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    accuracyThreshold = 50,
    watchInterval = false
  } = options

  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null)
  const [locationError, setLocationError] = useState<LocationError | null>(null)
  const [isWatching, setIsWatching] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)

  const watchIdRef = useRef<number>(-1)
  const locationOperation = useAsyncOperation<Coordinates>()

  const getCurrentLocation = useCallback(async (): Promise<Coordinates | null> => {
    if (!isLocationEnabled()) {
      setLocationError({ 
        code: 2, 
        message: 'Geolocation is not supported by this browser',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      })
      return null
    }

    const result = await locationOperation.execute(
      () => requestHighAccuracyLocation(),
      {
        loadingMessage: 'Standort wird ermittelt...',
        successMessage: (location) => {
          if (!isLocationAccurate(location.accuracy || 0, accuracyThreshold)) {
            return `Standort ermittelt (Genauigkeit: ${Math.round(location.accuracy || 0)}m)`
          }
          return 'Standort präzise ermittelt'
        }
      }
    )

    if (result.success && result.data) {
      setCurrentLocation(result.data)
      setLastUpdate(result.data.timestamp)
      setLocationError(null)
      return result.data
    } else {
      const error = result.error as unknown as LocationError
      setLocationError(error)
      return null
    }
  }, [accuracyThreshold, locationOperation])

  const startWatching = useCallback(() => {
    if (!isLocationEnabled() || isWatching) {
      return
    }

    const watchId = watchLocation(
      (location) => {
        setCurrentLocation(location)
        setLastUpdate(location.timestamp)
        setLocationError(null)
      },
      (error) => {
        setLocationError(error)
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge
      }
    )

    if (watchId > 0) {
      watchIdRef.current = watchId
      setIsWatching(true)
    }
  }, [enableHighAccuracy, timeout, maximumAge, isWatching])

  const stopWatching = useCallback(() => {
    if (watchIdRef.current > 0) {
      stopWatchingLocation(watchIdRef.current)
      watchIdRef.current = -1
      setIsWatching(false)
    }
  }, [])

  const clearLocation = useCallback(() => {
    setCurrentLocation(null)
    setLocationError(null)
    setLastUpdate(null)
  }, [])

  const checkPermission = useCallback(async (): Promise<boolean> => {
    if (!isLocationEnabled()) {
      setHasPermission(false)
      return false
    }

    try {
      // Try to get current position to check permission
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 60000 // Allow cached position
        })
      })
      setHasPermission(true)
      return true
    } catch {
      setHasPermission(false)
      return false
    }
  }, [])

  // Auto-start watching if enabled
  useEffect(() => {
    if (watchInterval && isLocationEnabled() && hasPermission !== false) {
      const timeoutId = setTimeout(() => {
        startWatching()
      }, 0)
      return () => clearTimeout(timeoutId)
    }
  }, [watchInterval, startWatching, hasPermission])

  // Check permission on mount
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      checkPermission()
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [checkPermission])

  return {
    currentLocation,
    locationError,
    isGettingLocation: locationOperation.isLoading,
    isWatching,
    hasPermission,
    lastUpdate,
    getCurrentLocation,
    startWatching,
    stopWatchingLocation: stopWatching,
    clearLocation,
    checkPermission
  }
}
