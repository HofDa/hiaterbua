import { useState } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type * as GeoJSON from 'geojson'
import { db } from '@/lib/db/dexie'
import {
  getBoundsFromSurveyAreaGeometry,
} from '@/lib/maps/map-core'
import {
  getBoundsFromPolygon,
  getBoundsFromWalkPoints,
  type DraftPoint,
} from '@/lib/maps/live-position-map-helpers'
import {
  MAX_PREFETCH_TILES,
  buildPrefetchUrlsForBounds,
  getTileCacheCount,
  prefetchTileUrls,
} from '@/lib/maps/tile-cache'
import { useLatestValueRef } from '@/components/maps/hooks/use-latest-value-ref'
import { useLivePositionMapSetup } from '@/components/maps/hooks/use-live-position-map-setup'
import { useLivePositionMapSync } from '@/components/maps/hooks/use-live-position-map-sync'
import { useMapBaseLayerSettings } from '@/components/maps/hooks/use-map-base-layer-settings'
import type { PositionData } from '@/components/maps/live-position-map-types'
import { defaultAppSettings } from '@/lib/settings/defaults'
import type {
  AppSettings,
  Enclosure,
  MapBaseLayer,
  SurveyArea,
  TrackPoint,
} from '@/types/domain'

type UseLivePositionMapRuntimeOptions = {
  settings: AppSettings | null | undefined
  position: PositionData | null
  safeSurveyAreas: SurveyArea[]
  safeSelectedTrackpoints: TrackPoint[]
  savedFeatureCollection: GeoJSON.FeatureCollection
  surveyAreaFeatureCollection: GeoJSON.FeatureCollection
  draftFeatureCollection: GeoJSON.FeatureCollection
  walkFeatureCollection: GeoJSON.FeatureCollection
  editFeatureCollection: GeoJSON.FeatureCollection
  selectedWalkPointFeatureCollection: GeoJSON.FeatureCollection
  selectedFeatureCollection: GeoJSON.FeatureCollection
  selectedTrackFeatureCollection: GeoJSON.FeatureCollection
  showSelectedTrack: boolean
  selectedEnclosureId: string | null
  isDrawing: boolean
  draftPointsLength: number
  editingEnclosureId: string | null
  isAddingEditPoint: boolean
  selectedEditPointIndex: number | null
  selectedSurveyAreaId: string | null
  openEnclosureDetailsRef: MutableRefObject<(enclosureId: string) => void>
  setDraftPoints: Dispatch<SetStateAction<DraftPoint[]>>
  setSelectedWalkPointIndex: Dispatch<SetStateAction<number | null>>
  setEditGeometryPoints: Dispatch<SetStateAction<DraftPoint[]>>
  setSelectedEditPointIndex: Dispatch<SetStateAction<number | null>>
  setIsAddingEditPoint: Dispatch<SetStateAction<boolean>>
  setEditError: Dispatch<SetStateAction<string>>
  setSelectedSurveyAreaId: Dispatch<SetStateAction<string | null>>
}

export function useLivePositionMapRuntime({
  settings,
  position,
  safeSurveyAreas,
  safeSelectedTrackpoints,
  savedFeatureCollection,
  surveyAreaFeatureCollection,
  draftFeatureCollection,
  walkFeatureCollection,
  editFeatureCollection,
  selectedWalkPointFeatureCollection,
  selectedFeatureCollection,
  selectedTrackFeatureCollection,
  showSelectedTrack,
  selectedEnclosureId,
  isDrawing,
  draftPointsLength,
  editingEnclosureId,
  isAddingEditPoint,
  selectedEditPointIndex,
  selectedSurveyAreaId,
  openEnclosureDetailsRef,
  setDraftPoints,
  setSelectedWalkPointIndex,
  setEditGeometryPoints,
  setSelectedEditPointIndex,
  setIsAddingEditPoint,
  setEditError,
  setSelectedSurveyAreaId,
}: UseLivePositionMapRuntimeOptions) {
  const [baseLayer, setBaseLayer] = useState<MapBaseLayer>('south-tyrol-orthophoto-2023')
  const [isBaseLayerMenuOpen, setIsBaseLayerMenuOpen] = useState(false)
  const [showSurveyAreas, setShowSurveyAreas] = useState(true)
  const [prefetchStatus, setPrefetchStatus] = useState('')
  const [prefetchingMapArea, setPrefetchingMapArea] = useState(false)
  const isDrawingRef = useLatestValueRef(isDrawing)
  const draftPointsLengthRef = useLatestValueRef(draftPointsLength)
  const editingEnclosureIdRef = useLatestValueRef(editingEnclosureId)
  const selectedEditPointIndexRef = useLatestValueRef(selectedEditPointIndex)
  const isAddingEditPointRef = useLatestValueRef(isAddingEditPoint)

  const {
    containerRef,
    mapRef,
    markerRef,
    mapReady,
  } = useLivePositionMapSetup({
    openEnclosureDetailsRef,
    isDrawingRef,
    draftPointsLengthRef,
    editingEnclosureIdRef,
    selectedEditPointIndexRef,
    isAddingEditPointRef,
    setDraftPoints,
    setSelectedWalkPointIndex,
    setEditGeometryPoints,
    setSelectedEditPointIndex,
    setIsAddingEditPoint,
    setEditError,
  })

  useMapBaseLayerSettings({
    settings,
    setBaseLayer,
    mode: 'once',
  })

  useLivePositionMapSync({
    mapRef,
    markerRef,
    mapReady,
    baseLayer,
    showSurveyAreas,
    settingsSelectedSurveyAreaId: selectedSurveyAreaId,
    safeSurveyAreas,
    safeSelectedTrackpoints,
    savedFeatureCollection,
    surveyAreaFeatureCollection,
    draftFeatureCollection,
    walkFeatureCollection,
    editFeatureCollection,
    selectedWalkPointFeatureCollection,
    selectedFeatureCollection,
    selectedTrackFeatureCollection,
    showSelectedTrack,
    selectedEnclosureId,
    editingEnclosureId,
    position,
    isDrawing,
    draftPointsLength,
    setSelectedSurveyAreaId,
  })

  function focusWalkPoints(points: PositionData[]) {
    if (!mapRef.current || points.length === 0) return

    const latestPoint = points[points.length - 1]
    if (!latestPoint) return

    if (points.length === 1) {
      mapRef.current.easeTo({
        center: [latestPoint.longitude, latestPoint.latitude],
        zoom: Math.max(mapRef.current.getZoom(), 17),
        duration: 700,
      })
      return
    }

    const bounds = getBoundsFromWalkPoints(points)
    if (!bounds) return

    mapRef.current.fitBounds(bounds, {
      padding: 60,
      duration: 700,
      maxZoom: 18,
    })
  }

  async function updateBaseLayer(nextBaseLayer: MapBaseLayer) {
    setBaseLayer(nextBaseLayer)
    setIsBaseLayerMenuOpen(false)

    const existingSettings = await db.settings.get('app')

    await db.settings.put({
      id: 'app',
      userName: existingSettings?.userName ?? defaultAppSettings.userName,
      accessPasswordHash:
        existingSettings?.accessPasswordHash ?? defaultAppSettings.accessPasswordHash,
      language: existingSettings?.language ?? defaultAppSettings.language,
      mapBaseLayer: nextBaseLayer,
      gpsAccuracyThresholdM:
        existingSettings?.gpsAccuracyThresholdM ??
        defaultAppSettings.gpsAccuracyThresholdM,
      gpsMinTimeS:
        existingSettings?.gpsMinTimeS ?? defaultAppSettings.gpsMinTimeS,
      gpsMinDistanceM:
        existingSettings?.gpsMinDistanceM ?? defaultAppSettings.gpsMinDistanceM,
      tileCachingEnabled:
        existingSettings?.tileCachingEnabled ??
        defaultAppSettings.tileCachingEnabled,
      theme: existingSettings?.theme ?? defaultAppSettings.theme,
    })
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
      await prefetchTileUrls(urls)
      const cacheCount = await getTileCacheCount()
      setPrefetchStatus(
        `${urls.length} Tiles für diesen Ausschnitt gesichert.${
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
      center: [position.longitude, position.latitude],
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

  function focusEnclosure(enclosure: Enclosure) {
    if (!enclosure.geometry || !mapRef.current) {
      return
    }

    const bounds = getBoundsFromPolygon(enclosure.geometry)
    if (!bounds) return

    mapRef.current.fitBounds(bounds, {
      padding: 40,
      duration: 800,
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
    focusEnclosure,
    focusWalkPoints,
    resizeMap,
  }
}
