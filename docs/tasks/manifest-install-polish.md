# Task: PWA manifest & install polish

## Goal

Make the installed app look and behave like a first-class PWA: proper maskable icons (no white-boxed icon on Android), app shortcuts for the most common field actions, a stable manifest `id`, and a correct iOS home-screen icon.

## Context (verified file pointers)

- `public/manifest.webmanifest` — currently only `name`, `short_name`, `description`, colors, and three icon entries (favicon, 192, 512, all `purpose: any`). No `id`, no `shortcuts`, no `categories`, no maskable icons.
- `scripts/sync-app-metadata.mjs` — runs as `npm run metadata:sync` before every build. It rewrites **only** `manifest.name` and `manifest.short_name` in place and preserves all other fields, so new manifest fields are safe to add directly to `public/manifest.webmanifest`. Do not let this script clobber your additions; if a new field needs the app name/version, extend the script instead of hardcoding.
- `src/app/layout.tsx` — `metadata.icons.apple` currently points at `/icon.png` (192×192).
- Icon sources: `public/icon.png` (192×192), `public/icon-512.png` (512×512).
- App routes (under `src/app/`): `/` (dashboard with quick herd-assign and session start), `/herds`, `/export`, `/work`, `/sessions`, `/settings`. The dashboard is the action hub — shortcuts should target real, existing routes only.

## Requirements

1. Add `"id": "/"` to the manifest so the installed-app identity is stable across `start_url` changes.
2. Add maskable icons:
   - Add a script `scripts/generate-pwa-icons.mjs` (using `sharp` as a devDependency) that composites `public/icon-512.png` scaled to ~80% onto a full-bleed `#163d2f` (theme color) square, producing `public/icon-maskable-192.png` and `public/icon-maskable-512.png`.
   - Run it and commit the generated PNGs; wire it up as an npm script (e.g. `icons:generate`) but do NOT add it to the `build` pipeline (icons are committed artifacts, regenerated manually).
   - Add both to `manifest.icons` with `"purpose": "maskable"`. Keep the existing `purpose: any` entries.
3. Add an Apple touch icon: generate an opaque 180×180 `public/apple-touch-icon.png` from the same source (iOS ignores transparency; use the theme or background color as backdrop) and point `metadata.icons.apple` in `src/app/layout.tsx` at it.
4. Add `shortcuts` to the manifest (German labels, matching the app's UI language), e.g.:
   - "Herden" → `/herds`
   - "Export & Sicherung" → `/export`
   - "Arbeit" → `/work`
   Verify each `url` against `src/app/` before adding. Each shortcut should reference the 192px icon (shortcut-specific icons optional).
5. Add `"categories": ["productivity", "utilities"]`.

## Constraints

- UI-facing strings are German.
- The app is offline-first; nothing here may introduce a network dependency.
- `npm run metadata:sync` must still run cleanly and its diff must touch only the name-derived fields.

## Acceptance criteria

- `npm run lint && npm run typecheck && npm run test` pass.
- `npm run build` succeeds (this runs `metadata:sync` + precache manifest generation).
- `public/manifest.webmanifest` is valid JSON and Chrome DevTools → Application → Manifest shows no installability warnings; the maskable preview shows the icon fully covering the safe zone.
- After `npm run metadata:sync`, `git diff` shows no changes (fields preserved).
