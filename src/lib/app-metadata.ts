import appMetadata from './app-metadata.json'

// Single source of truth for the app's display name and version. Bump the JSON
// file; scripts/sync-app-metadata.mjs mirrors it into static public assets.
export const APP_NAME = appMetadata.name
export const APP_VERSION = appMetadata.version

/** "Pastore 1.01" — the user-facing title used in chrome and export envelopes. */
export const APP_TITLE = `${APP_NAME} ${APP_VERSION}`
