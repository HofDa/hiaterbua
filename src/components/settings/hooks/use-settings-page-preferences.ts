import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { useSettingsStorageState } from '@/components/settings/hooks/use-settings-storage-state'
import { useSettingsTileCacheState } from '@/components/settings/hooks/use-settings-tile-cache-state'
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  type BrowserNotificationPermissionState,
} from '@/lib/notifications/browser-notifications'
import { defaultAppSettings } from '@/lib/settings/defaults'
import { normalizeSettingsValue } from '@/lib/settings/page-helpers'

function getBrowserNotificationSettingsMessage(permission: BrowserNotificationPermissionState) {
  if (permission === 'granted') {
    return 'Browser-Benachrichtigungen sind aktiv.'
  }

  if (permission === 'denied') {
    return 'Browser-Benachrichtigungen sind im Browser blockiert. Du kannst sie in den Website-Einstellungen wieder erlauben.'
  }

  if (permission === 'unsupported') {
    return 'Browser-Benachrichtigungen werden von diesem Gerät nicht unterstützt.'
  }

  return 'Browser-Benachrichtigungen sind noch nicht aktiv.'
}

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
  const [browserNotificationPermission, setBrowserNotificationPermission] =
    useState<BrowserNotificationPermissionState>('unsupported')

  useEffect(() => {
    setBrowserNotificationPermission(getBrowserNotificationPermission())
  }, [])

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setStatus('')

    const nextSettings = normalizeSettingsValue(draft)
    const { storedInDb } = await persistSettings(nextSettings)
    let syncWarning = ''

    try {
      await syncAfterSettingsSave(nextSettings.tileCachingEnabled)
    } catch {
      syncWarning = ' Tile-Cache konnte nicht vollständig synchronisiert werden.'
    } finally {
      setDraft(nextSettings)
      setSaving(false)
      setStatus(
        `${storedInDb
          ? 'Einstellungen gespeichert.'
          : 'Einstellungen im iOS-Fallback gespeichert.'}${syncWarning}`
      )
    }
  }

  function resetSettings() {
    setDraft(defaultAppSettings)
    setStatus('')
  }

  async function requestBrowserNotifications() {
    try {
      const permission = await requestBrowserNotificationPermission()
      setBrowserNotificationPermission(permission)
      setStatus(getBrowserNotificationSettingsMessage(permission))
    } catch {
      setStatus('Browser-Benachrichtigungen konnten nicht aktiviert werden.')
    }
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
    browserNotificationPermission,
    requestBrowserNotifications,
    tileCachePanel: buildTileCachePanel(draft.tileCachingEnabled),
  }
}
