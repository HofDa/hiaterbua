import { useEffect, useRef, useState } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type * as GeoJSON from 'geojson'
import type {
  LngLatLike,
  Map as MapLibreMap,
  Marker,
} from 'maplibre-gl'
import {
  southTyrolBaseMapLayerId,
  southTyrolOrthoLayerId,
} from '@/lib/maps/base-map-style'
import { initializeAppSettings, saveAppSettings } from '@/lib/db/repositories/settings'
import { getBoundsFromSurveyAreaGeometry } from '@/lib/maps/map-core'
import { setGeoJsonSourceData } from '@/lib/maps/maplibre-runtime'
import {
  MAX_PREFETCH_TILES,
  buildPrefetchUrlsForBounds,
  getTileCacheCount,
  prefetchTileUrls,
} from '@/lib/maps/tile-cache'
import { defaultAppSettings, normalizeMapBaseLayer } from '@/lib/settings/defaults'
import { useRasterMapInstance } from '@/components/maps/hooks/use-raster-map-instance'
import type {
  AppSettings,
  MapBaseLayer,
  SurveyArea,
} from '@/types/domain'

type PositionLike = {
  latitude: number
  longitude: number
}

type MapKernelSource = {
  sourceId: string
  featureCollection: GeoJSON.FeatureCollection
}

type MapKernelLayerVisibility = {
  layerId: string
  visible: boolean
}

type UseMapKernelOptions = {
  settings: AppSettings | null | undefined
  position: PositionLike | null
  baseLayerSettingsMode: 'once' | 'always'
  selectedSurveyAreaId: string | null
  safeSurveyAreas: SurveyArea[]
  setSelectedSurveyAreaId: Dispatch<SetStateAction<string | null>>
  onSettingsSaveError: (message: string) => void
  registerLayers: (map: MapLibreMap) => void
  sources: MapKernelSource[]
  layerVisibility?: MapKernelLayerVisibility[]
}

export function getPositionLngLat(position: PositionLike): LngLatLike {
  return [position.longitude, position.latitude]
}

function setLayerVisibility(
  map: MapLibreMap,
  layerId: string,
  visible: boolean
) {
  if (!map.getLayer(layerId)) return
  map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
}

export function useMapKernel({
  settings,
  position,
  baseLayerSettingsMode,
  selectedSurveyAreaId,
  safeSurveyAreas,
  setSelectedSurveyAreaId,
  onSettingsSaveError,
  registerLayers,
  sources,
  layerVisibility = [],
}: UseMapKernelOptions) {
  const [baseLayer, setBaseLayer] = useState<MapBaseLayer>('south-tyrol-orthophoto-2023')
  const [isBaseLayerMenuOpen, setIsBaseLayerMenuOpen] = useState(false)
  const [showSurveyAreas, setShowSurveyAreas] = useState(true)
  const [prefetchStatus, setPrefetchStatus] = useState('')
  const [prefetchingMapArea, setPrefetchingMapArea] = useState(false)
  const hasLoadedBaseLayerSettingsRef = useRef(false)

  const {
    containerRef,
    mapRef,
    markerRef,
    mapReady,
  } = useRasterMapInstance({ registerLayers })

  useEffect(() => {
    if (baseLayerSettingsMode === 'once' && hasLoadedBaseLayerSettingsRef.current) return
    if (settings === undefined) return

    hasLoadedBaseLayerSettingsRef.current = true

    if (!settings) {
      void initializeAppSettings()
      return
    }

    setBaseLayer(normalizeMapBaseLayer(settings.mapBaseLayer))
  }, [baseLayerSettingsMode, settings])

  useEffect(() => {
    if (!mapReady) return

    sources.forEach(({ sourceId, featureCollection }) => {
      setGeoJsonSourceData(mapRef.current, sourceId, featureCollection)
    })
  }, [mapReady, mapRef, sources])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return

    setLayerVisibility(map, 'survey-areas-fill', showSurveyAreas)
    setLayerVisibility(map, 'survey-areas-line', showSurveyAreas)
    setLayerVisibility(map, southTyrolBaseMapLayerId, baseLayer === 'south-tyrol-basemap')
    setLayerVisibility(
      map,
      southTyrolOrthoLayerId,
      baseLayer === 'south-tyrol-orthophoto-2023'
    )

    layerVisibility.forEach(({ layerId, visible }) => {
      setLayerVisibility(map, layerId, visible)
    })
  }, [baseLayer, layerVisibility, mapReady, mapRef, showSurveyAreas])

  useEffect(() => {
    if (
      selectedSurveyAreaId &&
      !safeSurveyAreas.some((surveyArea) => surveyArea.id === selectedSurveyAreaId)
    ) {
      setSelectedSurveyAreaId(null)
    }
  }, [safeSurveyAreas, selectedSurveyAreaId, setSelectedSurveyAreaId])

  useEffect(() => {
    if (!mapReady || !position || !mapRef.current || !markerRef.current) return
    markerRef.current.setLngLat(getPositionLngLat(position)).addTo(mapRef.current)
  }, [mapReady, mapRef, markerRef, position])

  async function updateBaseLayer(nextBaseLayer: MapBaseLayer) {
    setBaseLayer(nextBaseLayer)
    setIsBaseLayerMenuOpen(false)

    try {
      await saveAppSettings({ mapBaseLayer: nextBaseLayer })
    } catch {
      onSettingsSaveError('Kartenlayer konnte nicht als Einstellung gespeichert werden.')
    }
  }

  async function prefetchVisibleMapArea() {
    const currentSettings = settings ?? defaultAppSettings
    if (!currentSettings.tileCachingEnabled) {
      setPrefetchStatus('Tile-Caching ist deaktiviert.')
      return
    }

    const map = mapRef.current
    if (!map) {
      setPrefetchStatus('Karte ist noch nicht bereit.')
      return
    }

    const bounds = map.getBounds()
    const currentZoom = Math.floor(map.getZoom())
    const minZoom = Math.max(10, currentZoom)
    const maxZoom = Math.min(18, currentZoom + 1)
    const urls = buildPrefetchUrlsForBounds(
      [baseLayer],
      {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      },
      minZoom,
      maxZoom
    )

    if (urls.length > MAX_PREFETCH_TILES) {
      setPrefetchStatus(`Ausschnitt zu gross (${urls.length} Tiles). Weiter hineinzoomen.`)
      return
    }

    setPrefetchingMapArea(true)
    setPrefetchStatus('Lade sichtbaren Ausschnitt in den Cache ...')

    try {
      const cacheCountBefore = await getTileCacheCount()
      const result = await prefetchTileUrls(urls)
      const cacheCount = await getTileCacheCount()
      const tileSummary =
        result.failed === 0
          ? `${result.succeeded} Tiles`
          : result.succeeded > 0
            ? `${result.succeeded} von ${result.total} Tiles (${result.failed} fehlgeschlagen)`
            : `keine Tiles (${result.failed} fehlgeschlagen)`
      setPrefetchStatus(
        `${tileSummary} für diesen Ausschnitt gesichert.${
          cacheCountBefore !== null && cacheCount !== null
            ? ` Cache: ${cacheCountBefore} -> ${cacheCount}`
            : cacheCount !== null
              ? ` Cache: ${cacheCount}`
              : ''
        }`
      )
    } catch {
      setPrefetchStatus('Ausschnitt konnte nicht vorgeladen werden.')
    } finally {
      setPrefetchingMapArea(false)
    }
  }

  function centerMapOnPosition() {
    if (!mapRef.current || !position) return

    mapRef.current.easeTo({
      center: getPositionLngLat(position),
      zoom: Math.max(mapRef.current.getZoom(), 16),
      duration: 700,
    })
  }

  function focusSurveyArea(surveyArea: SurveyArea) {
    const map = mapRef.current
    const bounds = getBoundsFromSurveyAreaGeometry(surveyArea.geometry)
    if (!map || !bounds) return

    setSelectedSurveyAreaId(surveyArea.id)
    setShowSurveyAreas(true)
    map.fitBounds(bounds, {
      padding: 56,
      duration: 700,
      maxZoom: 17,
    })
  }

  function resizeMap() {
    requestAnimationFrame(() => {
      mapRef.current?.resize()

      window.setTimeout(() => {
        mapRef.current?.resize()
      }, 240)
    })
  }

  return {
    containerRef,
    mapRef: mapRef as MutableRefObject<MapLibreMap | null>,
    markerRef: markerRef as MutableRefObject<Marker | null>,
    mapReady,
    baseLayer,
    isBaseLayerMenuOpen,
    showSurveyAreas,
    prefetchStatus,
    prefetchingMapArea,
    setIsBaseLayerMenuOpen,
    setShowSurveyAreas,
    updateBaseLayer,
    prefetchVisibleMapArea,
    centerMapOnPosition,
    focusSurveyArea,
    resizeMap,
  }
}
