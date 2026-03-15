# Pastore

Offline-faehige Feld- und Alm-Dokumentation fuer Herden, Pferche, Weidegaenge und Arbeitseinsaetze.

## Local Development

```bash
npm install
npm run dev
```

Die App laeuft dann unter `http://localhost:3000`.

## Local Desktop Launcher

Wenn du die App ohne wechselnde Ports vom Desktop starten willst, nutze den lokale-PWA-Launcher:

```bash
npm install
npm run build
npm run install:desktop-launcher
```

Der Launcher startet Pastore fest auf `http://127.0.0.1:43031`, wartet bis die App erreichbar ist und oeffnet dann ein App-Fenster. Fuer den ersten Test oder ohne Desktop-Eintrag reicht auch:

```bash
npm run launch:local-pwa
```

Hinweise:

- Der Desktop-Eintrag zeigt auf diesen Projektordner. Wenn du das Repository verschiebst, installiere den Launcher erneut.
- Wenn Port `43031` bereits von etwas anderem belegt ist, kannst du vor dem Start `PASTORE_LOCAL_PORT` setzen.
- Fuer die Browser-eigene PWA-Installation muss die App ebenfalls immer wieder unter derselben Origin laufen. Der Desktop-Launcher ist der robustere Weg, weil er den lokalen Server bei Bedarf selbst startet.

## Offline-Verhalten

Die App baut jetzt ein PWA-Precache-Manifest fuer App-Shell und Build-Assets und waermt beim ersten Online-Start die statischen App-Routen vor. Dadurch startet die installierte App offline deutlich robuster, und interne Navigation auf die statischen Kernrouten bleibt auch ohne Netz verfuegbar.

Wichtig:

- Detailansichten fuer Herden laufen intern ueber die statischen Routen `/herd?id=...` und `/herd/edit?id=...`.
- Alte Pfade wie `/herds/<id>` und `/herds/<id>/edit` bleiben als Weiterleitungen erhalten.
- Kartentiles bleiben weiterhin ein eigener optionaler Cache.

## Checks

```bash
npm run lint
npm run build
```

`npm run build` nutzt bewusst Webpack und erzeugt dabei auch das PWA-Precache-Manifest.

## Vercel Deployment

Die App ist fuer Vercel vorbereitet.

### Empfohlene Einstellungen

- Framework Preset: `Next.js`
- Root Directory: Projektordner `hiaterbua`
- Install Command: `npm ci`
- Build Command: `npm run build`
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
