import { useState, useEffect, useCallback } from 'react'
import { useAsyncOperation } from './use-async-operation'
import { setUserPreferences, getUserPreferences, type UserPreferences } from '@/lib/utils/storage'

export interface UsePreferencesReturn {
  preferences: UserPreferences
  isLoading: boolean
  error: string | null
  isDirty: boolean
  
  // Actions
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>
  resetPreferences: () => Promise<void>
  savePreferences: () => Promise<void>
  hasChanges: () => boolean
}

const DEFAULT_PREFERENCES: UserPreferences = {
  language: 'de',
  theme: 'system',
  gpsAccuracyThreshold: 50,
  gpsMinTime: 5,
  gpsMinDistance: 10,
  tileCachingEnabled: true,
  mapBaseLayer: 'south-tyrol-basemap'
}

export function usePreferences(): UsePreferencesReturn {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [isDirty, setIsDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadOperation = useAsyncOperation<UserPreferences>()
  const saveOperation = useAsyncOperation<boolean>()

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      const result = await loadOperation.execute(
        async () => {
          const prefResult = await getUserPreferences()
          if (!prefResult.success || !prefResult.data) {
            throw new Error(prefResult.error || 'Failed to load preferences')
          }
          return prefResult.data
        },
        {
          loadingMessage: 'Einstellungen werden geladen...'
        }
      )

      if (result.success && result.data) {
        setPreferences(result.data)
        setIsDirty(false)
        setError(null)
      } else if (result.error) {
        setError(result.error)
      }
    }

    loadPreferences()
  }, [loadOperation])

  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    const newPreferences = { ...preferences, ...updates }
    setPreferences(newPreferences)
    setIsDirty(true)
    setError(null)
  }, [preferences])

  const savePreferences = useCallback(async () => {
    if (!isDirty) return

    const result = await saveOperation.execute(
      async () => {
        const saveResult = await setUserPreferences(preferences)
        if (!saveResult.success) {
          throw new Error(saveResult.error || 'Failed to save preferences')
        }
        return true
      },
      {
        loadingMessage: 'Einstellungen werden gespeichert...',
        successMessage: 'Einstellungen gespeichert'
      }
    )

    if (result.success) {
      setIsDirty(false)
      setError(null)
    } else if (result.error) {
      setError(result.error)
    }
  }, [preferences, isDirty, saveOperation])

  const resetPreferences = useCallback(async () => {
    const result = await saveOperation.execute(
      async () => {
        const resetResult = await setUserPreferences(DEFAULT_PREFERENCES)
        if (!resetResult.success) {
          throw new Error(resetResult.error || 'Failed to reset preferences')
        }
        return true
      },
      {
        loadingMessage: 'Einstellungen werden zurückgesetzt...',
        successMessage: 'Einstellungen auf Standard zurückgesetzt'
      }
    )

    if (result.success) {
      setPreferences(DEFAULT_PREFERENCES)
      setIsDirty(false)
      setError(null)
    } else if (result.error) {
      setError(result.error)
    }
  }, [saveOperation])

  const hasChanges = useCallback(() => {
    return isDirty
  }, [isDirty])

  return {
    preferences,
    isLoading: loadOperation.isLoading || saveOperation.isLoading,
    error,
    isDirty,
    updatePreferences,
    resetPreferences,
    savePreferences,
    hasChanges
  }
}
