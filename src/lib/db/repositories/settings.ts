import { db } from '@/lib/db/dexie'
import { defaultAppSettings } from '@/lib/settings/defaults'
import type { AppSettings } from '@/types/domain'

/** The app stores a single settings row under this id. */
const APP_SETTINGS_ID = 'app'

/** Read the singleton app-settings row, or `undefined` if it has not been created yet. */
export function getAppSettings(): Promise<AppSettings | undefined> {
  return db.settings.get(APP_SETTINGS_ID)
}

/**
 * Persist a complete app-settings object as the singleton row. Callers that need
 * resilience (timeouts, fallback storage) wrap this; the repository only owns the write.
 */
export async function putAppSettings(settings: AppSettings): Promise<void> {
  await db.settings.put(settings)
}

/**
 * Merge `patch` into the stored app settings — backfilling any missing fields from
 * {@link defaultAppSettings} — and persist the result. Returns the saved settings.
 */
export async function saveAppSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const existing = await getAppSettings()
  const next: AppSettings = {
    ...defaultAppSettings,
    ...existing,
    ...patch,
    id: APP_SETTINGS_ID,
  }

  await putAppSettings(next)
  return next
}

/** Persist the default app settings as the initial singleton row. */
export async function initializeAppSettings(): Promise<void> {
  await putAppSettings(defaultAppSettings)
}
