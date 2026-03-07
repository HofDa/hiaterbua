'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { LngLatLike, Map as MapLibreMap, Marker, StyleSpecification } from 'maplibre-gl'
import { db } from '@/lib/db/dexie'
import {
  MAX_PREFETCH_TILES,
  SOUTH_TYROL_BOUNDS,
  buildPrefetchUrlsForBounds,
  buildPrefetchUrlsForRadius,
  clearTileCacheStorage,
  getTileCacheCount,
  prefetchTileUrls,
  getPersistentStorageStatus,
  requestPersistentStorage,
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

const previewCenter: LngLatLike = [11.35, 46.5]
const previewBaseLayerId = 'settings-preview-basemap'
const previewBaseSourceId = 'settings-preview-basemap-source'
const SETTINGS_FALLBACK_KEY = 'hirtenapp-settings-fallback'
const STORAGE_TIMEOUT_MS = 2500
const previewRasterStyle: StyleSpecification = {
  version: 8,
  sources: {
    [previewBaseSourceId]: {
      type: 'raster',
      tiles: [
        'https://geoservices.buergernetz.bz.it/mapproxy/ows?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=p_bz-BaseMap:Basemap-Standard&STYLES=&CRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&FORMAT=image/png',
      ],
      tileSize: 256,
      attribution: 'Provincia autonoma di Bolzano - BaseMap Suedtirol',
      maxzoom: 20,
    },
  },
  layers: [
    {
      id: previewBaseLayerId,
      type: 'raster',
      source: previewBaseSourceId,
    },
  ],
}

function formatCurrentPositionError(error: GeolocationPositionError) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Standortfreigabe im Browser oder auf dem Gerät aktivieren.'
    case error.POSITION_UNAVAILABLE:
      return 'Standort ist gerade nicht verfügbar. Bitte im Freien oder mit besserem Empfang erneut versuchen.'
    case error.TIMEOUT:
      return 'Standortbestimmung hat zu lange gedauert. Bitte erneut versuchen.'
    default:
      return 'Standort konnte nicht gelesen werden.'
  }
}

function normalizeSettingsValue(
  settings: Partial<AppSettings> | null | undefined
): AppSettings {
  return {
    ...defaultAppSettings,
    ...settings,
    id: 'app',
    mapBaseLayer: normalizeMapBaseLayer(settings?.mapBaseLayer),
    gpsAccuracyThresholdM: Math.max(
      1,
      Math.round(settings?.gpsAccuracyThresholdM ?? defaultAppSettings.gpsAccuracyThresholdM)
    ),
    gpsMinTimeS: Math.max(
      1,
      Math.round(settings?.gpsMinTimeS ?? defaultAppSettings.gpsMinTimeS)
    ),
    gpsMinDistanceM: Math.max(
      1,
      Math.round(settings?.gpsMinDistanceM ?? defaultAppSettings.gpsMinDistanceM)
    ),
  }
}

function readFallbackSettings() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_FALLBACK_KEY)

    if (!raw) {
      return null
    }

    return normalizeSettingsValue(JSON.parse(raw) as Partial<AppSettings>)
  } catch {
    return null
  }
}

function writeFallbackSettings(settings: AppSettings) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(
      SETTINGS_FALLBACK_KEY,
      JSON.stringify(normalizeSettingsValue(settings))
    )
  } catch {
    // Local fallback storage is best effort only.
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs = STORAGE_TIMEOUT_MS) {
  let timeoutId: number | null = null

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error('storage_timeout'))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId)
    }
  }
}

function PositionPreviewMap({
  latitude,
  longitude,
}: {
  latitude: number
  longitude: number
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markerRef = useRef<Marker | null>(null)

  useEffect(() => {
    let cancelled = false

    async function setupMap() {
      if (!containerRef.current || mapRef.current) return

      const maplibre = await import('maplibre-gl')
      if (cancelled || !containerRef.current) return

      const map = new maplibre.Map({
        container: containerRef.current,
        style: previewRasterStyle,
        center: previewCenter,
        zoom: 9,
      })

      map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right')

      mapRef.current = map
      markerRef.current = new maplibre.Marker({
        color: '#111827',
      })
    }

    void setupMap()

    return () => {
      cancelled = true
      markerRef.current?.remove()
      markerRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const marker = markerRef.current
    if (!map || !marker) return

    const lngLat: LngLatLike = [longitude, latitude]
    marker.setLngLat(lngLat).addTo(map)
    map.easeTo({
      center: lngLat,
      zoom: Math.max(map.getZoom(), 14),
      duration: 700,
    })
  }, [latitude, longitude])

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[#ccb98a] bg-[rgba(255,253,246,0.88)] shadow-sm">
      <div
        ref={containerRef}
        className="h-64 w-full"
        aria-label="Kartenansicht der aktuellen Position"
      />
    </div>
  )
}

export default function SettingsPage() {
  const [draft, setDraft] = useState<AppSettings>(
    () => readFallbackSettings() ?? defaultAppSettings
  )
  const [settingsReady, setSettingsReady] = useState(false)
  const [settingsStorageMode, setSettingsStorageMode] = useState<'db' | 'fallback'>('db')
  const [settingsStorageWarning, setSettingsStorageWarning] = useState('')
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
  const [currentPositionLoading, setCurrentPositionLoading] = useState(false)
  const [currentPositionStatus, setCurrentPositionStatus] = useState('')
  const [isTileCacheOpen, setIsTileCacheOpen] = useState(false)
  const [isPrefetchOpen, setIsPrefetchOpen] = useState(false)
  const [persistentStorageGranted, setPersistentStorageGranted] = useState<boolean | null>(null)
  const [persistentStorageLoading, setPersistentStorageLoading] = useState(false)

  const parsedPreviewPosition = useMemo(() => {
    const latitude = Number.parseFloat(prefetchLat)
    const longitude = Number.parseFloat(prefetchLon)

    if (!Number.isFinite(latitude) || latitude < -85.05113 || latitude > 85.05113) return null
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null

    return { latitude, longitude }
  }, [prefetchLat, prefetchLon])

  useEffect(() => {
    let cancelled = false

    async function loadSettings() {
      const fallbackSettings = readFallbackSettings()

      if (fallbackSettings && !cancelled) {
        setDraft(fallbackSettings)
      }

      try {
        const storedSettings = await withTimeout(db.settings.get('app'))

        if (cancelled) {
          return
        }

        const nextSettings = normalizeSettingsValue(storedSettings ?? defaultAppSettings)

        if (!storedSettings) {
          try {
            await withTimeout(db.settings.put(nextSettings))
          } catch {
            setSettingsStorageMode('fallback')
            setSettingsStorageWarning(
              'Einstellungen laufen aktuell im iOS-Fallback. Änderungen bleiben lokal auf diesem Gerät gespeichert.'
            )
          }
        } else {
          setSettingsStorageMode('db')
          setSettingsStorageWarning('')
        }

        setDraft(nextSettings)
        writeFallbackSettings(nextSettings)
      } catch {
        if (cancelled) {
          return
        }

        const fallback = fallbackSettings ?? defaultAppSettings

        setDraft(normalizeSettingsValue(fallback))
        setSettingsStorageMode('fallback')
        setSettingsStorageWarning(
          'Die lokale App-Datenbank antwortet auf diesem Gerät gerade nicht zuverlässig. Einstellungen bleiben trotzdem über einen iOS-Fallback erreichbar.'
        )
        writeFallbackSettings(normalizeSettingsValue(fallback))
      } finally {
        if (!cancelled) {
          setSettingsReady(true)
        }
      }
    }

    void loadSettings()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setTileCacheSupported(typeof window !== 'undefined' && 'caches' in window)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadPersistentStorageStatus() {
      try {
        const nextStatus = await withTimeout(getPersistentStorageStatus())
        if (!cancelled) {
          setPersistentStorageGranted(nextStatus)
        }
      } catch {
        if (!cancelled) {
          setPersistentStorageGranted(null)
        }
      }
    }

    void loadPersistentStorageStatus()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let isCancelled = false

    async function refreshTileCache() {
      setTileCacheLoading(true)

      try {
        const nextCount = await withTimeout(getTileCacheCount())
        if (!isCancelled) {
          setTileCacheCount(nextCount)
        }
      } catch {
        if (!isCancelled) {
          setTileCacheCount(null)
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
  }, [settingsReady])

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setStatus('')

    const nextSettings = normalizeSettingsValue(draft)
    let storedInDb = false

    try {
      await withTimeout(db.settings.put(nextSettings))
      storedInDb = true
      setSettingsStorageMode('db')
      setSettingsStorageWarning('')
    } catch {
      setSettingsStorageMode('fallback')
      setSettingsStorageWarning(
        'Einstellungen werden aktuell über den iOS-Fallback gespeichert, weil IndexedDB auf diesem Gerät nicht stabil antwortet.'
      )
    }

    writeFallbackSettings(nextSettings)

    try {
      if (nextSettings.tileCachingEnabled) {
        const persistent = await withTimeout(requestPersistentStorage())
        setPersistentStorageGranted(persistent)
      }

      if (!nextSettings.tileCachingEnabled) {
        await withTimeout(clearTileCacheStorage())
      }

      setTileCacheCount(await withTimeout(getTileCacheCount()))
    } finally {
      setDraft(nextSettings)
      setSaving(false)
      setStatus(
        storedInDb
          ? 'Einstellungen gespeichert.'
          : 'Einstellungen im iOS-Fallback gespeichert.'
      )
    }
  }

  function resetSettings() {
    setDraft(defaultAppSettings)
    setStatus('')
  }

  async function clearTileCache() {
    setTileCacheClearing(true)
    setStatus('')

    try {
      const cleared = await withTimeout(clearTileCacheStorage())
      if (cleared) {
        setTileCacheCount(0)
        setStatus('Tile-Cache geleert.')
      } else {
        setStatus('Tile-Cache konnte auf diesem Gerät nicht vollständig geleert werden.')
      }
    } finally {
      setTileCacheClearing(false)
    }
  }

  async function enablePersistentStorage() {
    setPersistentStorageLoading(true)

    try {
      const granted = await withTimeout(requestPersistentStorage())
      setPersistentStorageGranted(granted)
      setStatus(
        granted
          ? 'Permanenter Speicher wurde angefragt und gewährt.'
          : 'Permanenter Speicher konnte nicht dauerhaft zugesichert werden.'
      )
    } finally {
      setPersistentStorageLoading(false)
    }
  }

  function applyCurrentPosition() {
    setPrefetchError('')
    setPrefetchStatus('')
    setCurrentPositionStatus('')

    if (!('geolocation' in navigator)) {
      setPrefetchError('Geolocation ist auf diesem Gerät nicht verfügbar.')
      return
    }

    setCurrentPositionLoading(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPrefetchLat(position.coords.latitude.toFixed(5))
        setPrefetchLon(position.coords.longitude.toFixed(5))
        setCurrentPositionLoading(false)
        setCurrentPositionStatus(
          `Standort übernommen (${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}). Genauigkeit ca. ${Math.round(position.coords.accuracy)} m.`
        )
      },
      (error) => {
        setCurrentPositionLoading(false)
        setPrefetchError(formatCurrentPositionError(error))
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
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

  return (
    <div className="space-y-5">
      <section className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Einstellungen</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-neutral-800">
          Kartenbasis, GPS-Schwellen und Offline-Verhalten lokal verwalten.
        </p>
        {!settingsReady ? (
          <div className="mt-3 rounded-[1.25rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-neutral-800">
            Einstellungen werden geladen ...
          </div>
        ) : null}
        {settingsStorageWarning ? (
          <div className="mt-3 rounded-[1.25rem] border border-amber-300 bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-950">
            {settingsStorageWarning}
          </div>
        ) : null}
      </section>

      <section className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
        <form className="space-y-4" onSubmit={saveSettings}>
          <div>
            <label className="mb-1 block text-sm font-medium">Sprache</label>
            <select
              className="w-full rounded-[1.25rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm"
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
              className="w-full rounded-[1.25rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm"
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
            <p className="mt-2 text-xs font-medium text-neutral-700">
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
              className="w-full rounded-[1.25rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm"
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
              className="w-full rounded-[1.25rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm"
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
              className="w-full rounded-[1.25rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm"
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
              className="w-full rounded-[1.25rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm"
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

          <label className="flex items-center gap-3 rounded-[1.25rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3">
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

          <div className="rounded-[1.25rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-4">
            <button
              type="button"
              onClick={() => setIsTileCacheOpen((current) => !current)}
              aria-expanded={isTileCacheOpen}
              className="flex w-full items-start justify-between gap-3 text-left"
            >
              <div>
                <div className="text-sm font-medium text-neutral-900">Tile-Cache</div>
                <div className="mt-1 text-sm font-medium text-neutral-800">
                  {tileCacheSupported
                    ? draft.tileCachingEnabled
                      ? 'Kartentiles können lokal für Offline-Nutzung gehalten werden.'
                      : 'Caching ist ausgeschaltet. Bereits geladene Tiles können geleert werden.'
                    : 'Dieser Browser stellt die Cache-API nicht bereit.'}
                </div>
                <div className="mt-2 text-xs font-medium text-neutral-700">
                  Speichermodus: {settingsStorageMode === 'db' ? 'App-Datenbank' : 'iOS-Fallback'}
                </div>
                <div className="mt-1 text-xs font-medium text-neutral-700">
                  Persistenter Speicher:{' '}
                  {persistentStorageGranted === null
                    ? 'unbekannt'
                    : persistentStorageGranted
                      ? 'aktiv'
                      : 'nicht zugesichert'}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="rounded-full border border-[#ccb98a] bg-[#fffdf6] px-3 py-1 text-xs font-semibold text-neutral-700">
                  {tileCacheLoading
                    ? 'prüft ...'
                    : tileCacheCount === null
                      ? 'unbekannt'
                      : `${tileCacheCount} Tiles`}
                </div>
                <div className="mt-1 text-base text-neutral-900">
                  {isTileCacheOpen ? '−' : '+'}
                </div>
              </div>
            </button>

            {isTileCacheOpen ? (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void enablePersistentStorage()}
                    disabled={persistentStorageLoading}
                    className="rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-neutral-900 disabled:opacity-50"
                  >
                    {persistentStorageLoading ? 'Fragt an ...' : 'Persistenten Speicher anfragen'}
                  </button>
                  <button
                    type="button"
                    onClick={clearTileCache}
                    disabled={!tileCacheSupported || tileCacheClearing}
                    className="rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-neutral-900 disabled:opacity-50"
                  >
                    {tileCacheClearing ? 'Leert ...' : 'Cache leeren'}
                  </button>
                </div>
                <p className="mt-2 text-xs font-medium text-neutral-700">
                  Die Anzeige ist eine grobe Anzahl lokal gespeicherter Kartentiles.
                </p>
              </>
            ) : null}
          </div>

          {status ? (
            <div className="rounded-[1.25rem] border border-emerald-300 bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-900">
              {status}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-[1.25rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-4 font-medium text-[#17130f] shadow-[0_12px_24px_rgba(40,34,26,0.08)] disabled:opacity-50"
            >
              {saving ? 'Speichert ...' : 'Einstellungen speichern'}
            </button>
            <button
              type="button"
              onClick={resetSettings}
              className="rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-4 font-semibold text-neutral-950"
            >
              Standardwerte
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]">
        <button
          type="button"
          onClick={() => setIsPrefetchOpen((current) => !current)}
          aria-expanded={isPrefetchOpen}
          className="flex w-full items-start justify-between gap-3 text-left"
        >
          <div>
            <h2 className="text-lg font-semibold">Kartenausschnitt vorladen</h2>
            <p className="mt-2 text-sm font-medium text-neutral-800">
              Bestimmten Ausschnitt gezielt in den Tile-Cache laden, statt nur beim normalen Kartenaufruf.
            </p>
          </div>
          <div className="text-base text-neutral-900">{isPrefetchOpen ? '−' : '+'}</div>
        </button>

        {isPrefetchOpen ? (
        <form className="mt-4 space-y-4" onSubmit={prefetchTiles}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Breitengrad</label>
              <input
                className="w-full rounded-[1.25rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm"
                value={prefetchLat}
                onChange={(event) => setPrefetchLat(event.target.value)}
                placeholder="z. B. 46.65"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Längengrad</label>
              <input
                className="w-full rounded-[1.25rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm"
                value={prefetchLon}
                onChange={(event) => setPrefetchLon(event.target.value)}
                placeholder="z. B. 11.35"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={applyCurrentPosition}
            disabled={currentPositionLoading}
            className="rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-neutral-900"
          >
            {currentPositionLoading ? 'Standort wird bestimmt ...' : 'Aktuellen Standort übernehmen'}
          </button>

          {currentPositionStatus ? (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-900">
              {currentPositionStatus}
            </div>
          ) : null}

          {parsedPreviewPosition ? (
            <div className="space-y-2">
              <div className="text-sm font-medium text-neutral-900">Aktuelle Position auf der Karte</div>
              <PositionPreviewMap
                latitude={parsedPreviewPosition.latitude}
                longitude={parsedPreviewPosition.longitude}
              />
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Radius (km)</label>
              <input
                type="number"
                min={0.1}
                step={0.1}
                className="w-full rounded-[1.25rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm"
                value={prefetchRadiusKm}
                onChange={(event) => setPrefetchRadiusKm(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 flex items-center justify-between gap-3 text-sm font-medium">
                <span>Zoomlevel</span>
                <span className="rounded-full bg-[#f1efeb] px-2 py-0.5 text-xs text-neutral-700">
                  {prefetchZoomLevel}
                </span>
              </label>
              <input
                type="range"
                min={1}
                max={20}
              className="w-full accent-[#5a5347]"
                value={prefetchZoomLevel}
                onChange={(event) => setPrefetchZoomLevel(event.target.value)}
              />
              <p className="mt-2 text-xs font-medium text-neutral-700">
                Verwendet intern ungefähr Zoom {Math.max(1, Number(prefetchZoomLevel) - 1)} bis{' '}
                {Math.min(20, Number(prefetchZoomLevel) + 1)}.
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Layer</label>
            <select
              className="w-full rounded-[1.25rem] border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm"
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

          <p className="text-xs font-medium text-neutral-700">
            Größere Radius-/Zoom-Kombinationen erzeugen sehr viele Tiles. Der Vorlade-Block begrenzt das bewusst.
          </p>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-4 text-sm text-neutral-900">
              <div className="font-medium">Südtirol Übersicht</div>
              <div className="mt-1 text-neutral-700">
                Lädt die komplette Landesfläche mit sicheren Übersichts-Zoomstufen 8 bis 12.
              </div>
              <button
                type="button"
                onClick={() => void prefetchWholeSouthTyrol()}
                disabled={southTyrolPrefetching || prefetching || highDetailPrefetching}
                className="mt-3 rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-semibold text-neutral-950 disabled:opacity-50"
              >
                {southTyrolPrefetching ? 'Lädt Übersicht ...' : 'Südtirol Übersicht sichern'}
              </button>
            </div>

            <div className="rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-4 text-sm text-neutral-900">
              <div className="font-medium">Einsatzgebiet hoch detailliert</div>
              <div className="mt-1 text-neutral-700">
                Nutzt den aktuellen Standort im Formular und lädt einen Radius von 2 km in Zoom 13 bis 17.
              </div>
              <button
                type="button"
                onClick={() => void prefetchHighDetailArea()}
                disabled={highDetailPrefetching || prefetching || southTyrolPrefetching}
                className="mt-3 rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-semibold text-neutral-950 disabled:opacity-50"
              >
                {highDetailPrefetching ? 'Lädt Detailgebiet ...' : 'Detailgebiet sichern'}
              </button>
            </div>
          </div>

          {prefetchProgress ? (
            <div className="rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-neutral-900">
              Fortschritt: <span className="font-medium text-neutral-900">{prefetchProgress.completed}</span>
              {' / '}
              <span className="font-medium text-neutral-900">{prefetchProgress.total}</span> Tiles
            </div>
          ) : null}

          {prefetchError ? (
            <div className="rounded-2xl border border-red-300 bg-red-100 px-4 py-3 text-sm font-semibold text-red-900">
              {prefetchError}
            </div>
          ) : null}

          {prefetchStatus ? (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-900">
              {prefetchStatus}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={prefetching}
            className="rounded-[1.25rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-4 font-semibold text-[#17130f] shadow-[0_12px_24px_rgba(40,34,26,0.08)] disabled:opacity-50"
          >
            {prefetching ? 'Lädt Tiles ...' : 'Ausschnitt vorladen'}
          </button>
        </form>
        ) : null}
      </section>
    </div>
  )
}
