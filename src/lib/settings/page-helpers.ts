import { defaultAppSettings, normalizeMapBaseLayer } from '@/lib/settings/defaults'
import type { AppSettings } from '@/types/domain'

const SETTINGS_FALLBACK_KEY = 'hirtenapp-settings-fallback'
const STORAGE_TIMEOUT_MS = 2500

export function formatCurrentPositionError(error: GeolocationPositionError) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Standortfreigabe im Browser oder auf dem Gerät aktivieren.'
    case error.POSITION_UNAVAILABLE:
      return 'Standort ist gerade nicht verfügbar. Bitte im Freien oder mit besserem Empfang erneut versuchen.'
    case error.TIMEOUT:
      return 'Standortbestimmung hat zu lange gedauert. Bitte erneut versuchen.'
    default:
      return 'Standort konnte nicht gelesen werden.'
  }
}

export function normalizeSettingsValue(
  settings: Partial<AppSettings> | null | undefined,
): AppSettings {
  return {
    ...defaultAppSettings,
    ...settings,
    id: 'app',
    mapBaseLayer: normalizeMapBaseLayer(settings?.mapBaseLayer),
    gpsAccuracyThresholdM: Math.max(
      1,
      Math.round(settings?.gpsAccuracyThresholdM ?? defaultAppSettings.gpsAccuracyThresholdM),
    ),
    gpsMinTimeS: Math.max(
      1,
      Math.round(settings?.gpsMinTimeS ?? defaultAppSettings.gpsMinTimeS),
    ),
    gpsMinDistanceM: Math.max(
      1,
      Math.round(settings?.gpsMinDistanceM ?? defaultAppSettings.gpsMinDistanceM),
    ),
  }
}

export function readFallbackSettings() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_FALLBACK_KEY)

    if (!raw) {
      return null
    }

    return normalizeSettingsValue(JSON.parse(raw) as Partial<AppSettings>)
  } catch {
    return null
  }
}

export function writeFallbackSettings(settings: AppSettings) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(
      SETTINGS_FALLBACK_KEY,
      JSON.stringify(normalizeSettingsValue(settings)),
    )
  } catch {
    // Local fallback storage is best effort only.
  }
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs = STORAGE_TIMEOUT_MS) {
  let timeoutId: number | null = null

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error('storage_timeout'))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId)
    }
  }
}
