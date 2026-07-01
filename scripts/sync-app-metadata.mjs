import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const metadataPath = path.join(rootDir, 'src/lib/app-metadata.json')
const manifestPath = path.join(rootDir, 'public/manifest.webmanifest')
const offlinePath = path.join(rootDir, 'public/offline.html')

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))

if (typeof metadata.name !== 'string' || typeof metadata.version !== 'string') {
  throw new Error('app-metadata.json must contain string "name" and "version" fields.')
}

const appTitle = `${metadata.name} ${metadata.version}`
const escapedAppTitle = escapeHtml(appTitle)

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
manifest.name = appTitle
manifest.short_name = metadata.name
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

let offlineHtml = await readFile(offlinePath, 'utf8')
offlineHtml = offlineHtml
  .replace(/<title>.*? offline<\/title>/, `<title>${escapedAppTitle} offline</title>`)
  .replace(
    /(name="description"\s+content=")[^"]*(")/,
    `$1${escapedAppTitle} ist aktuell offline. Bereits lokal gespeicherte Daten und Kartentiles stehen nach Verbindungsrückkehr wieder bereit.$2`
  )
  .replace(
    /<h1>.*? ist gerade ohne Verbindung\.<\/h1>/,
    `<h1>${escapedAppTitle} ist gerade ohne Verbindung.</h1>`
  )
await writeFile(offlinePath, offlineHtml)
