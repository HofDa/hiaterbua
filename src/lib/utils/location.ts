export interface Coordinates {
  lat: number
  lon: number
  accuracy?: number
  altitude?: number
  altitudeAccuracy?: number
  heading?: number
  speed?: number
  timestamp: string
}

export interface LocationError {
  code: number
  message: string
  PERMISSION_DENIED: 1
  POSITION_UNAVAILABLE: 2
  TIMEOUT: 3
}

export function isValidCoordinates(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
}

export function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371000 // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function calculateSpeed(
  lat1: number, 
  lon1: number, 
  time1: string,
  lat2: number, 
  lon2: number, 
  time2: string
): number {
  const distance = calculateDistance(lat1, lon1, lat2, lon2)
  const timeDiff = new Date(time2).getTime() - new Date(time1).getTime()
  return timeDiff > 0 ? (distance / timeDiff) * 1000 : 0 // m/s
}

export function isLocationAccurate(accuracy: number, threshold: number = 50): boolean {
  return accuracy <= threshold
}

export function formatCoordinates(lat: number, lon: number, precision: number = 6): string {
  return `${lat.toFixed(precision)}, ${lon.toFixed(precision)}`
}

export function formatAccuracy(accuracy: number): string {
  if (accuracy < 10) {
    return `${Math.round(accuracy * 10) / 10} m`
  }
  return `${Math.round(accuracy)} m`
}

export function formatSpeed(speed: number): string {
  if (speed < 1) {
    return `${Math.round(speed * 1000)} cm/s`
  }
  return `${Math.round(speed * 10) / 10} m/s`
}

export function createCoordinatesFromGeolocation(position: GeolocationPosition): Coordinates {
  return {
    lat: position.coords.latitude,
    lon: position.coords.longitude,
    accuracy: position.coords.accuracy,
    altitude: position.coords.altitude || undefined,
    altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
    heading: position.coords.heading || undefined,
    speed: position.coords.speed || undefined,
    timestamp: new Date(position.timestamp).toISOString()
  }
}

export function getLocationError(error: GeolocationPositionError): LocationError {
  return {
    code: error.code,
    message: error.message,
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3
  }
}

export function isLocationEnabled(): boolean {
  return 'geolocation' in navigator
}

export function requestHighAccuracyLocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!isLocationEnabled()) {
      reject(new Error('Geolocation is not supported by this browser'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(createCoordinatesFromGeolocation(position)),
      (error) => reject(getLocationError(error)),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  })
}

export function watchLocation(
  callback: (position: Coordinates) => void,
  errorCallback?: (error: LocationError) => void,
  options: PositionOptions = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
): number {
  if (!isLocationEnabled()) {
    if (errorCallback) {
      errorCallback({ code: 2, message: 'Geolocation is not supported', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 })
    }
    return -1
  }

  return navigator.geolocation.watchPosition(
    (position) => callback(createCoordinatesFromGeolocation(position)),
    (error) => errorCallback?.(getLocationError(error)),
    options
  )
}

export function stopWatchingLocation(watchId: number): void {
  if (watchId > 0) {
    navigator.geolocation.clearWatch(watchId)
  }
}
