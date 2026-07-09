# Task: Web Share for exports (share backups/reports from the field)

## Goal

Let users share export files (backup ZIPs, herd/work JSON, field-issue bundles) directly via the native share sheet (WhatsApp, e-mail, Drive, …) instead of only downloading them. On a phone in the field, "download then find the file in the Downloads folder" is a dead end; `navigator.share` with files is the natural path. Download stays as the fallback.

## Context (verified file pointers)

- `src/lib/import-export/file-formats.ts:48` — the single choke point where all exports are delivered today via `URL.createObjectURL(blob)` + anchor download. Every export flow funnels through here.
- Export UI cards: `src/components/export/export-zip-card.tsx`, `export-herd-card.tsx`, `export-work-card.tsx` (page `src/app/export/page.tsx`).
- Field-issue export bundle ("Feldproblem exportieren") — diagnostics flow under `src/lib/diagnostics/` and `src/app/settings/diagnostics/page.tsx`; it also delivers a file to the user and should get the same treatment.
- There is currently **no** `navigator.share` / `navigator.canShare` usage anywhere in `src/`.

## Requirements

1. In `src/lib/import-export/file-formats.ts`, add a share helper alongside the existing download helper, roughly:
   - Build a `File` from the blob (correct `name` and `type`).
   - If `navigator.canShare?.({ files: [file] })` → `await navigator.share({ files: [file], title: … })`.
   - A user-cancelled share (`AbortError`) is not an error — return silently, no toast, no fallback download.
   - Any other failure, or no share support → fall back to the existing download path.
2. UI: on each export card (ZIP, herd, work) and the field-issue export, offer "Teilen" where file-share is supported (feature-detect at runtime; hide or omit the share button when `navigator.canShare` with files is unavailable, e.g. desktop Firefox). Keep the existing download action ("Herunterladen") available in all cases — do not replace it.
3. Follow the existing card/button styling in `src/components/export/` (Tailwind, existing button components under `src/components/ui/`).
4. Unit tests (vitest, matching the existing test style in `src/lib/import-export/`) for the helper: share path taken when supported, AbortError swallowed, fallback to download when unsupported or share throws.

## Constraints

- UI-facing strings are German.
- Offline-first: sharing is a local OS interaction and must work offline; introduce no network dependency.
- Feature-detect everything; no errors on browsers without the API (the app also runs as a local desktop PWA, see `launch:local-pwa`).

## Acceptance criteria

- `npm run lint && npm run typecheck && npm run test` pass.
- On a browser with Web Share Level 2 (Chrome Android), each export surface offers "Teilen" and opens the share sheet with the file attached; cancelling shows no error.
- On a browser without file-share support, the UI is unchanged from today (download only).
