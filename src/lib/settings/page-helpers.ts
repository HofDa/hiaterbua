import { defaultAppSettings, normalizeMapBaseLayer } from '@/lib/settings/defaults'
import type { AppSettings } from '@/types/domain'

const SETTINGS_FALLBACK_KEY = 'hirtenapp-settings-fallback'
const STORAGE_TIMEOUT_MS = 2500
export const SETTINGS_FALLBACK_CHANGED_EVENT = 'hirtenapp:settings-fallback-changed'

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
    userName:
      typeof settings?.userName === 'string' ? settings.userName.trim() : defaultAppSettings.userName,
    accessPasswordHash:
      typeof settings?.accessPasswordHash === 'string'
        ? settings.accessPasswordHash.trim()
        : defaultAppSettings.accessPasswordHash,
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
  return parseFallbackSettingsSnapshot(readFallbackSettingsSnapshot())
}

export function readFallbackSettingsSnapshot() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage.getItem(SETTINGS_FALLBACK_KEY)
  } catch {
    return null
  }
}

export function parseFallbackSettingsSnapshot(snapshot: string | null) {
  if (!snapshot) {
    return null
  }

  try {
    return normalizeSettingsValue(JSON.parse(snapshot) as Partial<AppSettings>)
  } catch {
    return null
  }
}

export function subscribeToFallbackSettings(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === null || event.key === SETTINGS_FALLBACK_KEY) {
      onStoreChange()
    }
  }

  function handleFallbackChanged() {
    onStoreChange()
  }

  window.addEventListener('storage', handleStorage)
  window.addEventListener(SETTINGS_FALLBACK_CHANGED_EVENT, handleFallbackChanged)

  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(SETTINGS_FALLBACK_CHANGED_EVENT, handleFallbackChanged)
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
    window.dispatchEvent(new CustomEvent(SETTINGS_FALLBACK_CHANGED_EVENT))
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
