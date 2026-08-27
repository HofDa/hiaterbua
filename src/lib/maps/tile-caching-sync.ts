/**
 * Pushing the tile-caching preference to the service worker. The app owns the
 * setting; the worker enforces it on every tile request, so the two are kept in
 * step by messaging rather than shared state.
 */

type TileCachingMessageTarget = Pick<ServiceWorker, 'postMessage'>

/**
 * Whether switching from `previous` to `next` should also drop the stored tiles.
 *
 * Only a deliberate on-to-off switch clears them. Every other transition must
 * not: `null` means "not loaded yet", and treating that as "off" would wipe a
 * field device's offline map cache on a cold start with no way to get it back
 * without signal.
 */
export function shouldClearStoredTiles(
  previous: boolean | null,
  next: boolean | null
): boolean {
  return previous === true && next === false
}

/**
 * Sends the preference to `worker`. Returns whether a message was actually sent,
 * so callers only record the new value as "pushed" once it has been.
 */
export function postTileCachingMessage(
  worker: TileCachingMessageTarget | null | undefined,
  tileCachingEnabled: boolean | null,
  clearStoredTiles: boolean
): boolean {
  if (!worker || tileCachingEnabled === null) {
    return false
  }

  worker.postMessage({
    type: 'SET_TILE_CACHING',
    enabled: tileCachingEnabled,
    clearStoredTiles,
  })

  return true
}
