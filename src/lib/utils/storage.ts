export interface StorageResult<T> {
  success: boolean
  data?: T
  error?: string
}

export class StorageManager {
  private storage: Storage | null = null

  constructor(storageType: 'localStorage' | 'sessionStorage' = 'localStorage') {
    if (typeof window !== 'undefined') {
      this.storage = window[storageType]
    }
  }

  isAvailable(): boolean {
    return this.storage !== null
  }

  set<T>(key: string, value: T): Promise<StorageResult<T>> {
    return new Promise((resolve) => {
      if (!this.isAvailable()) {
        resolve({ success: false, error: 'Storage is not available' })
        return
      }

      try {
        const serializedValue = JSON.stringify(value)
        this.storage!.setItem(key, serializedValue)
        resolve({ success: true, data: value })
      } catch (error) {
        resolve({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to store data' 
        })
      }
    })
  }

  get<T>(key: string, defaultValue?: T): Promise<StorageResult<T>> {
    return new Promise((resolve) => {
      if (!this.isAvailable()) {
        resolve({ success: false, error: 'Storage is not available' })
        return
      }

      try {
        const item = this.storage!.getItem(key)
        if (item === null) {
          if (defaultValue !== undefined) {
            resolve({ success: true, data: defaultValue })
          } else {
            resolve({ success: false, error: 'Item not found' })
          }
          return
        }

        const value = JSON.parse(item) as T
        resolve({ success: true, data: value })
      } catch (error) {
        resolve({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to retrieve data' 
        })
      }
    })
  }

  remove(key: string): Promise<StorageResult<boolean>> {
    return new Promise((resolve) => {
      if (!this.isAvailable()) {
        resolve({ success: false, error: 'Storage is not available' })
        return
      }

      try {
        this.storage!.removeItem(key)
        resolve({ success: true, data: true })
      } catch (error) {
        resolve({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to remove item' 
        })
      }
    })
  }

  clear(): Promise<StorageResult<boolean>> {
    return new Promise((resolve) => {
      if (!this.isAvailable()) {
        resolve({ success: false, error: 'Storage is not available' })
        return
      }

      try {
        this.storage!.clear()
        resolve({ success: true, data: true })
      } catch (error) {
        resolve({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to clear storage' 
        })
      }
    })
  }

  getAllKeys(): Promise<StorageResult<string[]>> {
    return new Promise((resolve) => {
      if (!this.isAvailable()) {
        resolve({ success: false, error: 'Storage is not available' })
        return
      }

      try {
        const keys = Object.keys(this.storage!)
        resolve({ success: true, data: keys })
      } catch (error) {
        resolve({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to get keys' 
        })
      }
    })
  }

  getStorageSize(): Promise<StorageResult<number>> {
    return new Promise((resolve) => {
      if (!this.isAvailable()) {
        resolve({ success: false, error: 'Storage is not available' })
        return
      }

      try {
        let totalSize = 0
        for (const key in this.storage!) {
          if (this.storage!.hasOwnProperty(key)) {
            totalSize += this.storage![key].length + key.length
          }
        }
        resolve({ success: true, data: totalSize })
      } catch (error) {
        resolve({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to calculate storage size' 
        })
      }
    })
  }
}

// Pre-configured storage managers
export const localStorage = new StorageManager('localStorage')
export const sessionStorage = new StorageManager('sessionStorage')

// Utility functions for common storage operations
export function setLocalStorageItem<T>(key: string, value: T): Promise<StorageResult<T>> {
  return localStorage.set(key, value)
}

export function getLocalStorageItem<T>(key: string, defaultValue?: T): Promise<StorageResult<T>> {
  return localStorage.get(key, defaultValue)
}

export function removeLocalStorageItem(key: string): Promise<StorageResult<boolean>> {
  return localStorage.remove(key)
}

export function setSessionStorageItem<T>(key: string, value: T): Promise<StorageResult<T>> {
  return sessionStorage.set(key, value)
}

export function getSessionStorageItem<T>(key: string, defaultValue?: T): Promise<StorageResult<T>> {
  return sessionStorage.get(key, defaultValue)
}

export function removeSessionStorageItem(key: string): Promise<StorageResult<boolean>> {
  return sessionStorage.remove(key)
}

// App-specific storage keys
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'pastore_user_preferences',
  APP_SETTINGS: 'pastore_app_settings',
  LAST_LOCATION: 'pastore_last_location',
  OFFLINE_DATA: 'pastore_offline_data',
  CACHE_METADATA: 'pastore_cache_metadata',
  SESSION_STATE: 'pastore_session_state',
  WORK_SESSION_STATE: 'pastore_work_session_state',
  GPS_SETTINGS: 'pastore_gps_settings',
  MAP_PREFERENCES: 'pastore_map_preferences'
} as const

// Type-safe storage helpers for app data
export interface UserPreferences {
  language: 'de' | 'it'
  theme: 'system' | 'light'
  gpsAccuracyThreshold: number
  gpsMinTime: number
  gpsMinDistance: number
  tileCachingEnabled: boolean
  mapBaseLayer: string
}

export function setUserPreferences(preferences: UserPreferences): Promise<StorageResult<UserPreferences>> {
  return setLocalStorageItem(STORAGE_KEYS.USER_PREFERENCES, preferences)
}

export function getUserPreferences(): Promise<StorageResult<UserPreferences>> {
  return getLocalStorageItem(STORAGE_KEYS.USER_PREFERENCES, {
    language: 'de',
    theme: 'system',
    gpsAccuracyThreshold: 50,
    gpsMinTime: 5,
    gpsMinDistance: 10,
    tileCachingEnabled: true,
    mapBaseLayer: 'south-tyrol-basemap'
  })
}
