'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from '@/lib/db/dexie'
import {
  MAX_PREFETCH_TILES,
  SOUTH_TYROL_BOUNDS,
  buildPrefetchUrlsForBounds,
  buildPrefetchUrlsForRadius,
  clearTileCacheStorage,
  getTileCacheCount,
  prefetchTileUrls,
} from '@/lib/maps/tile-cache'
import { defaultAppSettings, normalizeMapBaseLayer } from '@/lib/settings/defaults'
import type { AppSettings, MapBaseLayer } from '@/types/domain'

const mapOptions: { value: MapBaseLayer; label: string }[] = [
  { value: 'south-tyrol-orthophoto-2023', label: 'Orthofoto 2023 (20 cm)' },
  { value: 'south-tyrol-basemap', label: 'BaseMap Südtirol' },
]

const prefetchLayerOptions = [
  { value: 'current', label: 'Aktuelle Kartengrundlage' },
  { value: 'south-tyrol-orthophoto-2023', label: 'Nur Orthofoto 2023' },
  { value: 'south-tyrol-basemap', label: 'Nur BaseMap Südtirol' },
  { value: 'both', label: 'Beide Layer' },
] as const

type PrefetchLayerChoice = (typeof prefetchLayerOptions)[number]['value']

export default function SettingsPage() {
  const settings = useLiveQuery(() => db.settings.get('app'), [])

  const [draft, setDraft] = useState<AppSettings>(defaultAppSettings)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [tileCacheCount, setTileCacheCount] = useState<number | null>(null)
  const [tileCacheLoading, setTileCacheLoading] = useState(true)
  const [tileCacheClearing, setTileCacheClearing] = useState(false)
  const [tileCacheSupported, setTileCacheSupported] = useState(false)
  const [prefetchLat, setPrefetchLat] = useState('')
  const [prefetchLon, setPrefetchLon] = useState('')
  const [prefetchRadiusKm, setPrefetchRadiusKm] = useState('1.5')
  const [prefetchZoomLevel, setPrefetchZoomLevel] = useState('15')
  const [prefetchLayerChoice, setPrefetchLayerChoice] = useState<PrefetchLayerChoice>('current')
  const [prefetchStatus, setPrefetchStatus] = useState('')
  const [prefetchError, setPrefetchError] = useState('')
  const [prefetchProgress, setPrefetchProgress] = useState<{ completed: number; total: number } | null>(null)
  const [prefetching, setPrefetching] = useState(false)
  const [southTyrolPrefetching, setSouthTyrolPrefetching] = useState(false)
  const [highDetailPrefetching, setHighDetailPrefetching] = useState(false)

  useEffect(() => {
    if (settings === undefined) return

    if (!settings) {
      void db.settings.put(defaultAppSettings)
      setDraft(defaultAppSettings)
      return
    }

    setDraft({
      ...settings,
      mapBaseLayer: normalizeMapBaseLayer(settings.mapBaseLayer),
    })
  }, [settings])

  useEffect(() => {
    setTileCacheSupported(typeof window !== 'undefined' && 'caches' in window)
  }, [])

  useEffect(() => {
    let isCancelled = false

    async function refreshTileCache() {
      setTileCacheLoading(true)

      try {
        const nextCount = await getTileCacheCount()
        if (!isCancelled) {
          setTileCacheCount(nextCount)
        }
      } finally {
        if (!isCancelled) {
          setTileCacheLoading(false)
        }
      }
    }

    void refreshTileCache()

    return () => {
      isCancelled = true
    }
  }, [settings?.tileCachingEnabled])

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setStatus('')

    const nextSettings: AppSettings = {
      ...draft,
      mapBaseLayer: normalizeMapBaseLayer(draft.mapBaseLayer),
      gpsAccuracyThresholdM: Math.max(1, Math.round(draft.gpsAccuracyThresholdM)),
      gpsMinTimeS: Math.max(1, Math.round(draft.gpsMinTimeS)),
      gpsMinDistanceM: Math.max(1, Math.round(draft.gpsMinDistanceM)),
    }

    await db.settings.put(nextSettings)
    if (!nextSettings.tileCachingEnabled) {
      await clearTileCacheStorage()
    }

    setTileCacheCount(await getTileCacheCount())
    setDraft(nextSettings)
    setSaving(false)
    setStatus('Einstellungen gespeichert.')
  }

  function resetSettings() {
    setDraft(defaultAppSettings)
    setStatus('')
  }

  async function clearTileCache() {
    setTileCacheClearing(true)
    setStatus('')

    try {
      await clearTileCacheStorage()
      setTileCacheCount(0)
      setStatus('Tile-Cache geleert.')
    } finally {
      setTileCacheClearing(false)
    }
  }

  function applyCurrentPosition() {
    setPrefetchError('')

    if (!('geolocation' in navigator)) {
      setPrefetchError('Geolocation ist auf diesem Gerät nicht verfügbar.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPrefetchLat(position.coords.latitude.toFixed(5))
        setPrefetchLon(position.coords.longitude.toFixed(5))
      },
      () => {
        setPrefetchError('Standort konnte nicht gelesen werden.')
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  async function runPrefetchJob(urls: string[], successMessage: string) {
    if (urls.length === 0) {
      setPrefetchError('Keine Tiles für diesen Ausschnitt ermittelt.')
      return
    }

    if (urls.length > MAX_PREFETCH_TILES) {
      setPrefetchError(
        `Ausschnitt zu groß. Aktuell wären es ${urls.length} Tiles. Bitte Radius oder Zoombereich reduzieren.`
      )
      return
    }

    setPrefetchProgress({ completed: 0, total: urls.length })

    await prefetchTileUrls(urls, (completed, total) =>
      setPrefetchProgress({ completed, total })
    )

    setTileCacheCount(await getTileCacheCount())
    setPrefetchStatus(`${successMessage} (${urls.length} Tiles).`)
  }

  async function prefetchTiles(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPrefetchError('')
    setPrefetchStatus('')
    setPrefetchProgress(null)

    if (!draft.tileCachingEnabled) {
      setPrefetchError('Bitte zuerst Tile-Caching aktivieren und speichern.')
      return
    }

    const lat = Number.parseFloat(prefetchLat)
    const lon = Number.parseFloat(prefetchLon)
    const radiusKm = Number.parseFloat(prefetchRadiusKm)
    const zoomLevel = Math.round(Number.parseFloat(prefetchZoomLevel))
    const minZoom = Math.max(1, zoomLevel - 1)
    const maxZoom = Math.min(20, zoomLevel + 1)

    if (!Number.isFinite(lat) || lat < -85.05113 || lat > 85.05113) {
      setPrefetchError('Breitengrad ist ungültig.')
      return
    }

    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
      setPrefetchError('Längengrad ist ungültig.')
      return
    }

    if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
      setPrefetchError('Radius muss größer als 0 sein.')
      return
    }

    if (!Number.isFinite(zoomLevel) || zoomLevel < 1 || zoomLevel > 20) {
      setPrefetchError('Zoomlevel ist ungültig.')
      return
    }

    const layers: MapBaseLayer[] =
      prefetchLayerChoice === 'both'
        ? ['south-tyrol-orthophoto-2023', 'south-tyrol-basemap']
        : prefetchLayerChoice === 'current'
          ? [draft.mapBaseLayer]
          : [prefetchLayerChoice]

    const urls = buildPrefetchUrlsForRadius(layers, lat, lon, radiusKm, minZoom, maxZoom)

    setPrefetching(true)

    try {
      await runPrefetchJob(urls, 'Kartenausschnitt gesichert')
    } catch {
      setPrefetchError('Vorladen ist fehlgeschlagen. Netzverbindung und Tile-Caching prüfen.')
    } finally {
      setPrefetching(false)
    }
  }

  async function prefetchWholeSouthTyrol() {
    setPrefetchError('')
    setPrefetchStatus('')
    setPrefetchProgress(null)

    if (!draft.tileCachingEnabled) {
      setPrefetchError('Bitte zuerst Tile-Caching aktivieren und speichern.')
      return
    }

    const layers: MapBaseLayer[] =
      prefetchLayerChoice === 'both'
        ? ['south-tyrol-orthophoto-2023', 'south-tyrol-basemap']
        : prefetchLayerChoice === 'current'
          ? [draft.mapBaseLayer]
          : [prefetchLayerChoice]

    const minZoom = 8
    const maxZoom = 12
    const urls = buildPrefetchUrlsForBounds(layers, SOUTH_TYROL_BOUNDS, minZoom, maxZoom)

    setSouthTyrolPrefetching(true)

    try {
      await runPrefetchJob(
        urls,
        `Südtirol-Übersicht gesichert, Zoom ${minZoom}-${maxZoom}`
      )
    } catch {
      setPrefetchError('Südtirol konnte nicht vollständig gesichert werden.')
    } finally {
      setSouthTyrolPrefetching(false)
    }
  }

  async function prefetchHighDetailArea() {
    setPrefetchError('')
    setPrefetchStatus('')
    setPrefetchProgress(null)

    if (!draft.tileCachingEnabled) {
      setPrefetchError('Bitte zuerst Tile-Caching aktivieren und speichern.')
      return
    }

    const lat = Number.parseFloat(prefetchLat)
    const lon = Number.parseFloat(prefetchLon)

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setPrefetchError('Bitte zuerst Standort eingeben oder aktuellen Standort übernehmen.')
      return
    }

    const minZoom = 13
    const maxZoom = 17
    const radiusKm = 2
    const layers: MapBaseLayer[] =
      prefetchLayerChoice === 'both'
        ? ['south-tyrol-orthophoto-2023', 'south-tyrol-basemap']
        : prefetchLayerChoice === 'current'
          ? [draft.mapBaseLayer]
          : [prefetchLayerChoice]

    const urls = buildPrefetchUrlsForRadius(layers, lat, lon, radiusKm, minZoom, maxZoom)

    setHighDetailPrefetching(true)

    try {
      await runPrefetchJob(
        urls,
        `Detailgebiet gesichert, Radius ${radiusKm} km, Zoom ${minZoom}-${maxZoom}`
      )
    } catch {
      setPrefetchError('Detailgebiet konnte nicht vollständig gesichert werden.')
    } finally {
      setHighDetailPrefetching(false)
    }
  }

  if (settings === undefined) {
    return <div className="rounded-[1.75rem] border border-white/70 bg-[rgba(255,252,246,0.82)] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)] backdrop-blur">Lade Einstellungen ...</div>
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[1.9rem] border border-white/70 bg-[rgba(255,252,246,0.82)] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)] backdrop-blur">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Einstellungen</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Kartenbasis, GPS-Schwellen und Offline-Verhalten lokal verwalten.
        </p>
      </section>

      <section className="rounded-[1.9rem] border border-white/70 bg-[rgba(255,252,246,0.82)] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)] backdrop-blur">
        <form className="space-y-4" onSubmit={saveSettings}>
          <div>
            <label className="mb-1 block text-sm font-medium">Sprache</label>
            <select
              className="w-full rounded-[1.25rem] border border-white bg-white/80 px-4 py-3 shadow-sm"
              value={draft.language}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  language: event.target.value as AppSettings['language'],
                }))
              }
            >
              <option value="de">Deutsch</option>
              <option value="it">Italienisch</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Kartengrundlage</label>
            <select
              className="w-full rounded-[1.25rem] border border-white bg-white/80 px-4 py-3 shadow-sm"
              value={draft.mapBaseLayer}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  mapBaseLayer: event.target.value as MapBaseLayer,
                }))
              }
            >
              {mapOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-neutral-500">
              Empfohlen: Orthofoto 2023 für maximale Details, BaseMap Südtirol für bessere Lesbarkeit.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              GPS-Genauigkeitsschwelle (m)
            </label>
            <input
              type="number"
              min={1}
              className="w-full rounded-[1.25rem] border border-white bg-white/80 px-4 py-3 shadow-sm"
              value={draft.gpsAccuracyThresholdM}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  gpsAccuracyThresholdM: Number(event.target.value) || 1,
                }))
              }
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">GPS Mindestzeit (s)</label>
            <input
              type="number"
              min={1}
              className="w-full rounded-[1.25rem] border border-white bg-white/80 px-4 py-3 shadow-sm"
              value={draft.gpsMinTimeS}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  gpsMinTimeS: Number(event.target.value) || 1,
                }))
              }
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              GPS Mindestdistanz (m)
            </label>
            <input
              type="number"
              min={1}
              className="w-full rounded-[1.25rem] border border-white bg-white/80 px-4 py-3 shadow-sm"
              value={draft.gpsMinDistanceM}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  gpsMinDistanceM: Number(event.target.value) || 1,
                }))
              }
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Design</label>
            <select
              className="w-full rounded-[1.25rem] border border-white bg-white/80 px-4 py-3 shadow-sm"
              value={draft.theme}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  theme: event.target.value as AppSettings['theme'],
                }))
              }
            >
              <option value="system">System</option>
              <option value="light">Hell</option>
            </select>
          </div>

          <label className="flex items-center gap-3 rounded-[1.25rem] border border-white bg-white/70 px-4 py-3">
            <input
              type="checkbox"
              checked={draft.tileCachingEnabled}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  tileCachingEnabled: event.target.checked,
                }))
              }
            />
            <span className="text-sm">Tile-Caching aktivieren</span>
          </label>

          <div className="rounded-[1.25rem] border border-white bg-white/70 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-neutral-900">Tile-Cache</div>
                <div className="mt-1 text-sm text-neutral-600">
                  {tileCacheSupported
                    ? draft.tileCachingEnabled
                    ? 'Kartentiles können lokal für Offline-Nutzung gehalten werden.'
                      : 'Caching ist ausgeschaltet. Bereits geladene Tiles können geleert werden.'
                    : 'Dieser Browser stellt die Cache-API nicht bereit.'}
                </div>
              </div>
              <div className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-700">
                {tileCacheLoading
                  ? 'prüft ...'
                  : tileCacheCount === null
                    ? 'unbekannt'
                    : `${tileCacheCount} Tiles`}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={clearTileCache}
                disabled={!tileCacheSupported || tileCacheClearing}
                className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-neutral-900 disabled:opacity-50"
              >
                {tileCacheClearing ? 'Leert ...' : 'Cache leeren'}
              </button>
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              Die Anzeige ist eine grobe Anzahl lokal gespeicherter Kartentiles.
            </p>
          </div>

          {status ? (
            <div className="rounded-[1.25rem] bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {status}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-[1.25rem] bg-[linear-gradient(135deg,#1f6a49,#164c35)] px-4 py-4 font-medium text-white shadow-[0_12px_24px_rgba(31,106,73,0.18)] disabled:opacity-50"
            >
              {saving ? 'Speichert ...' : 'Einstellungen speichern'}
            </button>
            <button
              type="button"
              onClick={resetSettings}
              className="rounded-2xl bg-neutral-100 px-4 py-4 font-medium text-neutral-900"
            >
              Standardwerte
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-[1.9rem] border border-white/70 bg-[rgba(255,252,246,0.82)] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)] backdrop-blur">
        <h2 className="text-lg font-semibold">Kartenausschnitt vorladen</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Bestimmten Ausschnitt gezielt in den Tile-Cache laden, statt nur beim normalen Kartenaufruf.
        </p>

        <form className="mt-4 space-y-4" onSubmit={prefetchTiles}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Breitengrad</label>
              <input
                className="w-full rounded-[1.25rem] border border-white bg-white/80 px-4 py-3 shadow-sm"
                value={prefetchLat}
                onChange={(event) => setPrefetchLat(event.target.value)}
                placeholder="z. B. 46.65"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Längengrad</label>
              <input
                className="w-full rounded-[1.25rem] border border-white bg-white/80 px-4 py-3 shadow-sm"
                value={prefetchLon}
                onChange={(event) => setPrefetchLon(event.target.value)}
                placeholder="z. B. 11.35"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={applyCurrentPosition}
            className="rounded-2xl bg-neutral-100 px-4 py-3 text-sm font-medium text-neutral-900"
          >
            Aktuellen Standort übernehmen
          </button>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Radius (km)</label>
              <input
                type="number"
                min={0.1}
                step={0.1}
                className="w-full rounded-[1.25rem] border border-white bg-white/80 px-4 py-3 shadow-sm"
                value={prefetchRadiusKm}
                onChange={(event) => setPrefetchRadiusKm(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 flex items-center justify-between gap-3 text-sm font-medium">
                <span>Zoomlevel</span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
                  {prefetchZoomLevel}
                </span>
              </label>
              <input
                type="range"
                min={1}
                max={20}
                className="w-full accent-black"
                value={prefetchZoomLevel}
                onChange={(event) => setPrefetchZoomLevel(event.target.value)}
              />
              <p className="mt-2 text-xs text-neutral-500">
                Verwendet intern ungefähr Zoom {Math.max(1, Number(prefetchZoomLevel) - 1)} bis{' '}
                {Math.min(20, Number(prefetchZoomLevel) + 1)}.
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Layer</label>
            <select
              className="w-full rounded-[1.25rem] border border-white bg-white/80 px-4 py-3 shadow-sm"
              value={prefetchLayerChoice}
              onChange={(event) => setPrefetchLayerChoice(event.target.value as PrefetchLayerChoice)}
            >
              {prefetchLayerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-neutral-500">
            Größere Radius-/Zoom-Kombinationen erzeugen sehr viele Tiles. Der Vorlade-Block begrenzt das bewusst.
          </p>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl bg-amber-50 px-4 py-4 text-sm text-amber-950">
              <div className="font-medium">Südtirol Übersicht</div>
              <div className="mt-1 text-amber-900">
                Lädt die komplette Landesfläche mit sicheren Übersichts-Zoomstufen 8 bis 12.
              </div>
              <button
                type="button"
                onClick={() => void prefetchWholeSouthTyrol()}
                disabled={southTyrolPrefetching || prefetching || highDetailPrefetching}
                className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-neutral-900 disabled:opacity-50"
              >
                {southTyrolPrefetching ? 'Lädt Übersicht ...' : 'Südtirol Übersicht sichern'}
              </button>
            </div>

            <div className="rounded-2xl bg-emerald-50 px-4 py-4 text-sm text-emerald-950">
              <div className="font-medium">Einsatzgebiet hoch detailliert</div>
              <div className="mt-1 text-emerald-900">
                Nutzt den aktuellen Standort im Formular und lädt einen Radius von 2 km in Zoom 13 bis 17.
              </div>
              <button
                type="button"
                onClick={() => void prefetchHighDetailArea()}
                disabled={highDetailPrefetching || prefetching || southTyrolPrefetching}
                className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-neutral-900 disabled:opacity-50"
              >
                {highDetailPrefetching ? 'Lädt Detailgebiet ...' : 'Detailgebiet sichern'}
              </button>
            </div>
          </div>

          {prefetchProgress ? (
            <div className="rounded-2xl bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
              Fortschritt: <span className="font-medium text-neutral-900">{prefetchProgress.completed}</span>
              {' / '}
              <span className="font-medium text-neutral-900">{prefetchProgress.total}</span> Tiles
            </div>
          ) : null}

          {prefetchError ? (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {prefetchError}
            </div>
          ) : null}

          {prefetchStatus ? (
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {prefetchStatus}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={prefetching}
            className="rounded-[1.25rem] bg-[linear-gradient(135deg,#1f6a49,#164c35)] px-4 py-4 font-medium text-white shadow-[0_12px_24px_rgba(31,106,73,0.18)] disabled:opacity-50"
          >
            {prefetching ? 'Lädt Tiles ...' : 'Ausschnitt vorladen'}
          </button>
        </form>
      </section>
    </div>
  )
}
