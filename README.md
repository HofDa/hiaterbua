# Pastore

Offline-faehige Feld- und Alm-Dokumentation fuer Herden, Pferche, Weidegaenge und Arbeitseinsaetze.

## Local Development

```bash
npm install
npm run dev
```

Die App laeuft dann unter `http://localhost:3000`.

## Checks

```bash
npm run lint
npx next build --webpack
```

Der Webpack-Build ist aktuell bewusst der Produktions-Check. Der normale `next build` laeuft in dieser Umgebung in einen Turbopack-Fehler, waehrend der Webpack-Build sauber durchlaeuft.

## Vercel Deployment

Die App ist fuer Vercel vorbereitet.

### Empfohlene Einstellungen

- Framework Preset: `Next.js`
- Root Directory: Projektordner `hiaterbua`
- Install Command: `npm ci`
- Build Command: `npx next build --webpack`
- Output Directory: leer lassen
- Node.js Version: `22.x`

### Ablauf

1. Repository nach GitHub pushen.
2. In Vercel `Add New -> Project` waehlen.
3. Das GitHub-Repository importieren.
4. Als Root Directory den App-Ordner `hiaterbua` setzen, falls Vercel nicht direkt dort landet.
5. Die obigen Build-Einstellungen uebernehmen und deployen.

### Hinweise fuer Feldtests

- Die App speichert ihre Daten lokal im Browser per IndexedDB. Testdaten bleiben also geraetebezogen.
- Service Worker und Installierbarkeit funktionieren nur ueber HTTPS oder lokal auf `localhost`.
- Fuer echte Feldtests sollte die App nach dem ersten Aufruf einmal komplett geladen werden, damit Assets und Offline-Seite gecacht werden.

## Hosting Note

GitHub Pages ist fuer diese App nicht geeignet, weil die dynamischen Next.js-Routen nicht als reine statische Dateien ausgeliefert werden.
