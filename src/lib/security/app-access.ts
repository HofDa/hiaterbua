import { clearTileCacheStorage } from '@/lib/maps/tile-cache'

export const ACCESS_SESSION_DURATION_MS = 30 * 60 * 1000
export const ACCESS_SESSION_DURATION_MINUTES = 30
export const ACCESS_STATE_CHANGED_EVENT = 'pastore:access-state-changed'

const ACCESS_AUTHORIZED_KEY = 'pastore-access-authorized'
const ACCESS_LOCK_CYCLE_STARTED_AT_KEY = 'pastore-access-lock-cycle-started-at'
const ALLOWED_ACCESS_PASSWORDS = new Set([
  'weidewert1',
  'weidewert2',
  'weidewert3',
  'weidewert4',
  'weidewert5',
  'weidewert6',
])

function dispatchAccessStateChanged() {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new CustomEvent(ACCESS_STATE_CHANGED_EVENT))
}

export function subscribeToAccessState(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === null || event.key === ACCESS_AUTHORIZED_KEY) {
      onStoreChange()
    }
  }

  function handleAccessChanged() {
    onStoreChange()
  }

  window.addEventListener('storage', handleStorage)
  window.addEventListener(ACCESS_STATE_CHANGED_EVENT, handleAccessChanged)

  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(ACCESS_STATE_CHANGED_EVENT, handleAccessChanged)
  }
}

export function isAllowedAccessPassword(password: string) {
  return ALLOWED_ACCESS_PASSWORDS.has(password.trim())
}

export function isAccessAuthorized() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.localStorage.getItem(ACCESS_AUTHORIZED_KEY) === 'true'
}

export function authorizeAccess() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(ACCESS_AUTHORIZED_KEY, 'true')
  window.localStorage.removeItem(ACCESS_LOCK_CYCLE_STARTED_AT_KEY)
  dispatchAccessStateChanged()
}

export function clearAccessAuthorization() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(ACCESS_AUTHORIZED_KEY)
  window.localStorage.removeItem(ACCESS_LOCK_CYCLE_STARTED_AT_KEY)
  dispatchAccessStateChanged()
}

function readLockedCacheCycleStartedAt() {
  if (typeof window === 'undefined') {
    return null
  }

  const rawValue = window.localStorage.getItem(ACCESS_LOCK_CYCLE_STARTED_AT_KEY)
  const timestamp = rawValue ? Number(rawValue) : Number.NaN

  return Number.isFinite(timestamp) ? timestamp : null
}

export function getLockedCachePurgeDelayMs(now = Date.now()) {
  if (typeof window === 'undefined') {
    return ACCESS_SESSION_DURATION_MS
  }

  const cycleStartedAt = readLockedCacheCycleStartedAt()

  if (cycleStartedAt === null) {
    window.localStorage.setItem(ACCESS_LOCK_CYCLE_STARTED_AT_KEY, String(now))
    return ACCESS_SESSION_DURATION_MS
  }

  return Math.max(0, ACCESS_SESSION_DURATION_MS - (now - cycleStartedAt))
}

function resetLockedCachePurgeWindow(now = Date.now()) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(ACCESS_LOCK_CYCLE_STARTED_AT_KEY, String(now))
}

export async function clearLockedAccessCaches() {
  const results: boolean[] = []

  try {
    results.push(await clearTileCacheStorage())
  } catch {
    results.push(false)
  }

  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cacheNames = await window.caches.keys()
      const deletedCaches = await Promise.all(
        cacheNames.map((cacheName) => window.caches.delete(cacheName))
      )

      results.push(deletedCaches.some(Boolean))
    } catch {
      results.push(false)
    }
  }

  resetLockedCachePurgeWindow()

  return results.some(Boolean)
}
