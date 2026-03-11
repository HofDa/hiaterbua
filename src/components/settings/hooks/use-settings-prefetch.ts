import { type FormEvent, useMemo, useState } from 'react'
import type {
  PrefetchLayerChoice,
} from '@/components/settings/settings-options'
import {
  MAX_PREFETCH_TILES,
  SOUTH_TYROL_BOUNDS,
  buildPrefetchUrlsForBounds,
  buildPrefetchUrlsForRadius,
  getTileCacheCount,
  prefetchTileUrls,
} from '@/lib/maps/tile-cache'
import { formatCurrentPositionError } from '@/lib/settings/page-helpers'
import type { MapBaseLayer } from '@/types/domain'

function resolvePrefetchLayers(
  prefetchLayerChoice: PrefetchLayerChoice,
  currentBaseLayer: MapBaseLayer
): MapBaseLayer[] {
  if (prefetchLayerChoice === 'both') {
    return ['south-tyrol-orthophoto-2023', 'south-tyrol-basemap']
  }

  if (prefetchLayerChoice === 'current') {
    return [currentBaseLayer]
  }

  return [prefetchLayerChoice]
}

export function useSettingsPrefetch(options: {
  tileCachingEnabled: boolean
  currentBaseLayer: MapBaseLayer
  onTileCacheCountChange: (count: number | null) => void
}) {
  const { tileCachingEnabled, currentBaseLayer, onTileCacheCountChange } = options
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
  const [isPrefetchOpen, setIsPrefetchOpen] = useState(false)

  const parsedPreviewPosition = useMemo(() => {
    const latitude = Number.parseFloat(prefetchLat)
    const longitude = Number.parseFloat(prefetchLon)

    if (!Number.isFinite(latitude) || latitude < -85.05113 || latitude > 85.05113) return null
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null

    return { latitude, longitude }
  }, [prefetchLat, prefetchLon])

  function resetPrefetchFeedback() {
    setPrefetchError('')
    setPrefetchStatus('')
    setPrefetchProgress(null)
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

    onTileCacheCountChange(await getTileCacheCount())
    setPrefetchStatus(`${successMessage} (${urls.length} Tiles).`)
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

  async function prefetchTiles(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    resetPrefetchFeedback()

    if (!tileCachingEnabled) {
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

    const layers = resolvePrefetchLayers(prefetchLayerChoice, currentBaseLayer)
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
    resetPrefetchFeedback()

    if (!tileCachingEnabled) {
      setPrefetchError('Bitte zuerst Tile-Caching aktivieren und speichern.')
      return
    }

    const layers = resolvePrefetchLayers(prefetchLayerChoice, currentBaseLayer)
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
    resetPrefetchFeedback()

    if (!tileCachingEnabled) {
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
    const layers = resolvePrefetchLayers(prefetchLayerChoice, currentBaseLayer)
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

  return {
    prefetchState: {
      isOpen: isPrefetchOpen,
      prefetchLat,
      prefetchLon,
      prefetchRadiusKm,
      prefetchZoomLevel,
      prefetchLayerChoice,
      prefetchStatus,
      prefetchError,
      prefetchProgress,
      prefetching,
      southTyrolPrefetching,
      highDetailPrefetching,
      currentPositionLoading,
      currentPositionStatus,
      parsedPreviewPosition,
    },
    prefetchActions: {
      onToggleOpen: () => setIsPrefetchOpen((current) => !current),
      onSubmit: prefetchTiles,
      onPrefetchLatChange: setPrefetchLat,
      onPrefetchLonChange: setPrefetchLon,
      onPrefetchRadiusKmChange: setPrefetchRadiusKm,
      onPrefetchZoomLevelChange: setPrefetchZoomLevel,
      onPrefetchLayerChoiceChange: setPrefetchLayerChoice,
      onApplyCurrentPosition: applyCurrentPosition,
      onPrefetchWholeSouthTyrol: prefetchWholeSouthTyrol,
      onPrefetchHighDetailArea: prefetchHighDetailArea,
    },
  }
}
