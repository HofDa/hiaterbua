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
      text: 'Tile-Cache ist aus - Karten bleiben nicht offline verfügbar.',
      action: { href: '/settings', label: 'Aktivieren' },
    }
  }

  // A null count means the cache is still being checked. Do not flash a
  // warning on every app start before the result is known.
  if (tileCacheCount === null || tileCacheCount > 0) return null

  if (isOnline) {
    return {
      tone: 'warning',
      text: 'Noch keine Offline-Karten gespeichert.',
      action: { href: '/settings', label: 'Karten sichern' },
    }
  }

  return {
    tone: 'error',
    text: 'Offline ohne gespeicherte Karten.',
    action: null,
  }
}
