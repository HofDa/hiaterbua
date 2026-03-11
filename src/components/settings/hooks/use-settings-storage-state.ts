import { useEffect, useState } from 'react'
import type { SettingsStorageMode } from '@/components/settings/settings-options'
import { db } from '@/lib/db/dexie'
import { defaultAppSettings } from '@/lib/settings/defaults'
import {
  normalizeSettingsValue,
  readFallbackSettings,
  withTimeout,
  writeFallbackSettings,
} from '@/lib/settings/page-helpers'
import type { AppSettings } from '@/types/domain'

export function useSettingsStorageState() {
  const [draft, setDraft] = useState<AppSettings>(defaultAppSettings)
  const [settingsReady, setSettingsReady] = useState(false)
  const [settingsStorageMode, setSettingsStorageMode] = useState<SettingsStorageMode>('db')
  const [settingsStorageWarning, setSettingsStorageWarning] = useState('')
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadSettings() {
      const fallbackSettings = readFallbackSettings()

      if (fallbackSettings && !cancelled) {
        setDraft(fallbackSettings)
      }

      try {
        const storedSettings = await withTimeout(db.settings.get('app'))

        if (cancelled) {
          return
        }

        const nextSettings = normalizeSettingsValue(storedSettings ?? defaultAppSettings)

        if (!storedSettings) {
          try {
            await withTimeout(db.settings.put(nextSettings))
          } catch {
            setSettingsStorageMode('fallback')
            setSettingsStorageWarning(
              'Einstellungen laufen aktuell im iOS-Fallback. Änderungen bleiben lokal auf diesem Gerät gespeichert.'
            )
          }
        } else {
          setSettingsStorageMode('db')
          setSettingsStorageWarning('')
        }

        setDraft(nextSettings)
        writeFallbackSettings(nextSettings)
      } catch {
        if (cancelled) {
          return
        }

        const fallback = fallbackSettings ?? defaultAppSettings
        const normalizedFallback = normalizeSettingsValue(fallback)

        setDraft(normalizedFallback)
        setSettingsStorageMode('fallback')
        setSettingsStorageWarning(
          'Die lokale App-Datenbank antwortet auf diesem Gerät gerade nicht zuverlässig. Einstellungen bleiben trotzdem über einen iOS-Fallback erreichbar.'
        )
        writeFallbackSettings(normalizedFallback)
      } finally {
        if (!cancelled) {
          setSettingsReady(true)
        }
      }
    }

    void loadSettings()

    return () => {
      cancelled = true
    }
  }, [])

  async function persistSettings(nextSettings: AppSettings) {
    let storedInDb = false

    try {
      await withTimeout(db.settings.put(nextSettings))
      storedInDb = true
      setSettingsStorageMode('db')
      setSettingsStorageWarning('')
    } catch {
      setSettingsStorageMode('fallback')
      setSettingsStorageWarning(
        'Einstellungen werden aktuell über den iOS-Fallback gespeichert, weil IndexedDB auf diesem Gerät nicht stabil antwortet.'
      )
    }

    writeFallbackSettings(nextSettings)

    return {
      storedInDb,
    }
  }

  return {
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
  }
}
