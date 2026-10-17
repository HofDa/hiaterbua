export type OfflineMapReadinessProblem = {
  tone: 'warning' | 'error'
  text: string
  action: { href: string; label: string } | null
}

type OfflineMapReadinessInput = {
  tileCachingEnabled: boolean
  isOnline: boolean
  tileCacheCount: number | null
}

/** Returns the single most actionable offline-map preparation problem. */
export function getOfflineMapReadinessProblem({
  tileCachingEnabled,
  isOnline,
  tileCacheCount,
}: OfflineMapReadinessInput): OfflineMapReadinessProblem | null {
  if (!tileCachingEnabled) {
    return {
      tone: 'warning',
      text: 'Karte ist noch nicht offline gesichert.',
      action: { href: '/settings', label: 'Jetzt sichern' },
    }
  }

  // A null count means the cache is still being checked. Do not flash a
  // warning on every app start before the result is known.
  if (tileCacheCount === null || tileCacheCount > 0) return null

  if (isOnline) {
    return {
      tone: 'warning',
      text: 'Karte ist noch nicht offline gesichert.',
      action: { href: '/settings', label: 'Jetzt sichern' },
    }
  }

  return {
    tone: 'error',
    text: 'Kein Netz und keine offline gesicherte Karte.',
    action: null,
  }
}
