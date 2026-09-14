# Task: Surface device storage usage in Settings & Diagnostics

## Goal

Make storage pressure visible before it bites. The app already checks `navigator.storage.estimate()` internally to protect GPS recording, but the user has no way to see how full the origin's quota is — critical for an offline-first app that hoards map tiles and trackpoints on-device. Add a storage-usage readout (used / quota, with a warning state) to the settings tile-cache panel and the diagnostics page.

## Context (verified file pointers)

- `src/lib/utils/storage-health.ts` — existing wrapper around `navigator.storage.estimate()` (line ~31) including warning thresholds. Currently consumed **only** by recording hooks (`src/components/maps/hooks/use-grazing-session-map-trackpoint-recorder.ts`, `use-live-position-map-walk-controller.ts`, `use-grazing-session-map-session-controller.ts`). Reuse its constants/types — do not duplicate threshold logic.
- `src/components/settings/settings-tile-cache-panel.tsx` — settings card that already shows the persistent-storage badge (`persistentStorageGranted`) and tile-cache state; natural home for the usage readout.
- `src/app/settings/diagnostics/page.tsx` — diagnostics page for field debugging; should show the raw numbers.
- Refresh pattern to copy: `src/components/layout/status-strip.tsx` re-reads tile-cache state on `focus`, `visibilitychange`, and tile-cache-changed events — use the same approach so the readout stays current.

## Requirements

1. Add a small hook (e.g. `src/hooks/use-storage-usage.ts`) that reads usage/quota via `storage-health.ts`, refreshes on `focus` and `visibilitychange`, and exposes `{ usageBytes, quotaBytes, ratio, level }` where `level` derives from the existing storage-health thresholds.
2. Settings tile-cache panel: show "Belegter Speicher" as `X MB von Y GB` (format with sensible units, German decimal comma) plus a slim progress bar. When the storage-health warning threshold is crossed, switch the bar/badge to the existing warning styling used elsewhere in settings and add one short German hint (e.g. that old tiles can be cleared).
3. Diagnostics page: add the raw values (bytes + percentage) to the diagnostics readout so they land in field-issue exports if diagnostics data is included there.
4. Graceful degradation: `navigator.storage.estimate` may be missing or may reject (private mode, older WebKit). Show "Speichernutzung nicht verfügbar" instead of an error; never block rendering.
5. Unit tests for the formatting and level derivation (vitest, colocated like other `src/lib` tests).

## Constraints

- UI-facing strings are German.
- Field-safe: no blocking UI, no layout jank while the estimate loads (render a placeholder, then fill in).
- Reuse existing thresholds from `storage-health.ts`; if they need exporting, export them from there.

## Acceptance criteria

- `npm run lint && npm run typecheck && npm run test` pass.
- Settings → tile-cache panel shows used/quota with a progress bar that updates after returning to the tab.
- Diagnostics page shows the raw estimate values.
- With `navigator.storage.estimate` removed (devtools override), both pages render the unavailable state without console errors.
