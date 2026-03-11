import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type * as GeoJSON from 'geojson'
import { db } from '@/lib/db/dexie'
import {
  getBoundsFromSurveyAreaGeometry,
} from '@/lib/maps/map-core'
import { useGrazingSessionMapSetup } from '@/components/maps/hooks/use-grazing-session-map-setup'
import { useGrazingSessionMapSync } from '@/components/maps/hooks/use-grazing-session-map-sync'
import type { EditableTrackPoint } from '@/lib/maps/grazing-session-map-helpers'
import {
  MAX_PREFETCH_TILES,
  buildPrefetchUrlsForBounds,
  getTileCacheCount,
  prefetchTileUrls,
} from '@/lib/maps/tile-cache'
import { useLatestValueRef } from '@/components/maps/hooks/use-latest-value-ref'
import { useMapBaseLayerSettings } from '@/components/maps/hooks/use-map-base-layer-settings'
import type { PositionData } from '@/components/maps/grazing-session-map-types'
import { defaultAppSettings } from '@/lib/settings/defaults'
import type {
  AppSettings,
  MapBaseLayer,
  SurveyArea,
  TrackPoint,
} from '@/types/domain'

type UseGrazingSessionMapRuntimeOptions = {
  settings: AppSettings | null | undefined
  position: PositionData | null
  positionAccuracy: number | null
  safeCurrentTrackpoints: TrackPoint[]
  safeSelectedTrackpoints: TrackPoint[]
  safeSurveyAreas: SurveyArea[]
  currentTrackFeatureCollection: GeoJSON.FeatureCollection
  selectedTrackFeatureCollection: GeoJSON.FeatureCollection
  editTrackFeatureCollection: GeoJSON.FeatureCollection
  surveyAreaFeatureCollection: GeoJSON.FeatureCollection
  sessionEventFeatureCollection: GeoJSON.FeatureCollection
  selectedSessionId: string | null
  editingSessionId: string | null
  selectedEditTrackpointIndex: number | null
  isAddingEditTrackpoint: boolean
  selectedSurveyAreaId: string | null
  setSelectedSurveyAreaId: Dispatch<SetStateAction<string | null>>
  setEditTrackpoints: Dispatch<SetStateAction<EditableTrackPoint[]>>
  setSelectedEditTrackpointIndex: Dispatch<SetStateAction<number | null>>
  setIsAddingEditTrackpoint: Dispatch<SetStateAction<boolean>>
  setActionError: Dispatch<SetStateAction<string>>
}

export function useGrazingSessionMapRuntime({
  settings,
  position,
  positionAccuracy,
  safeCurrentTrackpoints,
  safeSelectedTrackpoints,
  safeSurveyAreas,
  currentTrackFeatureCollection,
  selectedTrackFeatureCollection,
  editTrackFeatureCollection,
  surveyAreaFeatureCollection,
  sessionEventFeatureCollection,
  selectedSessionId,
  editingSessionId,
  selectedEditTrackpointIndex,
  isAddingEditTrackpoint,
  selectedSurveyAreaId,
  setSelectedSurveyAreaId,
  setEditTrackpoints,
  setSelectedEditTrackpointIndex,
  setIsAddingEditTrackpoint,
  setActionError,
}: UseGrazingSessionMapRuntimeOptions) {
  const [baseLayer, setBaseLayer] = useState<MapBaseLayer>('south-tyrol-orthophoto-2023')
  const [isBaseLayerMenuOpen, setIsBaseLayerMenuOpen] = useState(false)
  const [showSurveyAreas, setShowSurveyAreas] = useState(true)
  const [showSessionEventsOnMap, setShowSessionEventsOnMap] = useState(true)
  const [prefetchStatus, setPrefetchStatus] = useState('')
  const [prefetchingMapArea, setPrefetchingMapArea] = useState(false)
  const editingSessionIdRef = useLatestValueRef(editingSessionId)
  const selectedEditTrackpointIndexRef = useLatestValueRef(selectedEditTrackpointIndex)
  const isAddingEditTrackpointRef = useLatestValueRef(isAddingEditTrackpoint)
  const positionAccuracyRef = useLatestValueRef(positionAccuracy)

  const {
    containerRef,
    mapRef,
    markerRef,
    mapReady,
  } = useGrazingSessionMapSetup({
    editingSessionIdRef,
    selectedEditTrackpointIndexRef,
    isAddingEditTrackpointRef,
    positionAccuracyRef,
    setEditTrackpoints,
    setSelectedEditTrackpointIndex,
    setIsAddingEditTrackpoint,
    setActionError,
  })

  useMapBaseLayerSettings({
    settings,
    setBaseLayer,
    mode: 'always',
  })

  useGrazingSessionMapSync({
    mapRef,
    markerRef,
    mapReady,
    baseLayer,
    showSurveyAreas,
    showSessionEventsOnMap,
    position,
    safeCurrentTrackpoints,
    safeSelectedTrackpoints,
    safeSurveyAreas,
    currentTrackFeatureCollection,
    selectedTrackFeatureCollection,
    editTrackFeatureCollection,
    surveyAreaFeatureCollection,
    sessionEventFeatureCollection,
    selectedSessionId,
    editingSessionId,
    selectedSurveyAreaId,
    setSelectedSurveyAreaId,
  })

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
        existingSettings?.gpsAccuracyThresholdM ?? defaultAppSettings.gpsAccuracyThresholdM,
      gpsMinTimeS: existingSettings?.gpsMinTimeS ?? defaultAppSettings.gpsMinTimeS,
      gpsMinDistanceM:
        existingSettings?.gpsMinDistanceM ?? defaultAppSettings.gpsMinDistanceM,
      tileCachingEnabled:
        existingSettings?.tileCachingEnabled ?? defaultAppSettings.tileCachingEnabled,
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

  return {
    containerRef,
    baseLayer,
    isBaseLayerMenuOpen,
    showSurveyAreas,
    showSessionEventsOnMap,
    prefetchStatus,
    prefetchingMapArea,
    setIsBaseLayerMenuOpen,
    setShowSurveyAreas,
    setShowSessionEventsOnMap,
    updateBaseLayer,
    prefetchVisibleMapArea,
    centerMapOnPosition,
    focusSurveyArea,
  }
}
