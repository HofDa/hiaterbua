# Task: Open backup files directly in the app (manifest file_handlers + launchQueue)

## Goal

Let a user tap an `app-data.json` / backup ZIP / GeoJSON file (from a messenger, mail, or the file manager) and have the installed PWA open straight into the import flow with that file preloaded — instead of manually navigating to Export & Sicherung and re-picking the file. This closes the loop with the share/export flows for device migration and tester field-issue bundles.

## Context (verified file pointers)

- Import UI: `src/components/export/export-import-card.tsx` on the `/export` page (`src/app/export/page.tsx`). Its file input accepts `.zip,.json,.geojson,application/json,application/geo+json,application/zip` (line ~63) and already handles full backups, partial JSON exports, and ZIPs.
- Manifest: `public/manifest.webmanifest`. Note `scripts/sync-app-metadata.mjs` rewrites only `name`/`short_name` and preserves other fields, so `file_handlers` can be added directly.
- PWA client components live in `src/components/pwa/` (e.g. `service-worker-sync.tsx`) and are mounted from `src/app/layout.tsx`.

## Requirements

1. Add `file_handlers` to the manifest with `"action": "/export"` and `accept` covering the same types the import card accepts: `application/json` (`.json`), `application/geo+json` (`.geojson`), `application/zip` (`.zip`).
2. Create a small module, e.g. `src/lib/import-export/launch-files.ts`:
   - A module-level pending-files queue plus a subscribe/consume API (mirroring the event-based patterns used elsewhere, e.g. `TILE_CACHE_CHANGED_EVENT` in `src/lib/maps/tile-cache.ts`).
   - An init function that feature-detects `window.launchQueue` and calls `launchQueue.setConsumer`, converting `FileSystemFileHandle`s to `File`s (`handle.getFile()`) and enqueueing them.
3. Create a client component in `src/components/pwa/` (mounted once in `src/app/layout.tsx`) that runs the init function. It must be a no-op without errors when `launchQueue` is unavailable (only installed Chromium PWAs have it).
4. In `export-import-card.tsx`, consume pending launch files on mount and feed them into the exact same code path as a manual file selection (no duplicated import logic). If files arrive while the user is elsewhere, they must still be there when `/export` mounts (the manifest `action` routes the launch to `/export`, so this is the normal case).
5. Unit tests for the queue module: enqueue-before-subscribe delivery, consume-once semantics, feature-detect no-op.

## Constraints

- UI-facing strings are German.
- Progressive enhancement only: zero behavior change and zero console errors on browsers without `launchQueue` (Firefox, Safari, non-installed tabs).
- Do not fork the import logic — the launch path must reuse the manual-selection handler.

## Acceptance criteria

- `npm run lint && npm run typecheck && npm run test` pass.
- `npm run build` succeeds and `npm run metadata:sync` leaves `file_handlers` intact.
- In an installed Chromium PWA, opening a `.json` backup via "Open with" launches the app on `/export` with the file already loaded into the import flow.
- In a regular browser tab, everything behaves exactly as today.
