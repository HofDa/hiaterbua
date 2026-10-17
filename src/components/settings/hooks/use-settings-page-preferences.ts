import { useEffect, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import type { AppSettings } from '@/types/domain'
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

  // Settings apply as they change, like every other screen of the app; an
  // explicit "Speichern" lost changes when people left the page.
  const lastSavedKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (!settingsReady) return
    const next = normalizeSettingsValue(draft)
    const key = JSON.stringify(next)
    if (lastSavedKeyRef.current === null) {
      lastSavedKeyRef.current = key
      return
    }
    if (key === lastSavedKeyRef.current) return

    const timer = window.setTimeout(() => {
      lastSavedKeyRef.current = key
      void persistAndSync(next, false)
    }, 700)
    return () => window.clearTimeout(timer)
    // persistAndSync is recreated each render; draft/ready drive the save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, settingsReady])

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextSettings = normalizeSettingsValue(draft)
    lastSavedKeyRef.current = JSON.stringify(nextSettings)
    await persistAndSync(nextSettings, true)
  }

  async function persistAndSync(nextSettings: AppSettings, applyNormalized: boolean) {
    setSaving(true)
    setStatus('')

    const { storedInDb } = await persistSettings(nextSettings)
    let syncWarning = ''

    try {
      await syncAfterSettingsSave(nextSettings.tileCachingEnabled)
    } catch {
      syncWarning = ' Offline-Karten konnten nicht vollständig abgeglichen werden.'
    } finally {
      // Only on an explicit submit: while typing, normalizing (e.g. an empty
      // number field to 1) must not overwrite what the user is entering.
      if (applyNormalized) setDraft(nextSettings)
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
