import { type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { useSettingsStorageState } from '@/components/settings/hooks/use-settings-storage-state'
import { useSettingsTileCacheState } from '@/components/settings/hooks/use-settings-tile-cache-state'
import { defaultAppSettings } from '@/lib/settings/defaults'
import { normalizeSettingsValue } from '@/lib/settings/page-helpers'

export function useSettingsPagePreferences() {
  const {
    draft,
    setDraft,
    settingsReady,
    settingsStorageMode,
    settingsStorageWarning,
    status,
    setStatus,
    saving,
    setSaving,
    persistSettings,
  } = useSettingsStorageState()
  const {
    tileCacheCount,
    setTileCacheCount,
    syncAfterSettingsSave,
    buildTileCachePanel,
  } = useSettingsTileCacheState({
    settingsReady,
    settingsStorageMode,
    setStatus,
  })

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setStatus('')

    const nextSettings = normalizeSettingsValue(draft)
    const { storedInDb } = await persistSettings(nextSettings)

    try {
      await syncAfterSettingsSave(nextSettings.tileCachingEnabled)
    } finally {
      setDraft(nextSettings)
      setSaving(false)
      setStatus(
        storedInDb
          ? 'Einstellungen gespeichert.'
          : 'Einstellungen im iOS-Fallback gespeichert.'
      )
    }
  }

  function resetSettings() {
    setDraft(defaultAppSettings)
    setStatus('')
  }

  return {
    draft,
    setDraft,
    settingsReady,
    settingsStorageWarning,
    status,
    saving,
    tileCacheCount,
    setTileCacheCount: setTileCacheCount as Dispatch<SetStateAction<number | null>>,
    saveSettings,
    resetSettings,
    tileCachePanel: buildTileCachePanel(draft.tileCachingEnabled),
  }
}
