import { useEffect } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type * as GeoJSON from 'geojson'
import type {
  GeoJSONSource,
  LngLatLike,
  Map as MapLibreMap,
  Marker,
} from 'maplibre-gl'
import {
  southTyrolBaseMapLayerId,
  southTyrolOrthoLayerId,
} from '@/lib/maps/base-map-style'
import { getBoundsFromTrackpoints } from '@/lib/maps/map-core'
import type { PositionData } from '@/components/maps/grazing-session-map-types'
import type {
  MapBaseLayer,
  SurveyArea,
  TrackPoint,
} from '@/types/domain'

type UseGrazingSessionMapSyncOptions = {
  mapRef: MutableRefObject<MapLibreMap | null>
  markerRef: MutableRefObject<Marker | null>
  mapReady: boolean
  baseLayer: MapBaseLayer
  showSurveyAreas: boolean
  showSessionEventsOnMap: boolean
  position: PositionData | null
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
  selectedSurveyAreaId: string | null
  setSelectedSurveyAreaId: Dispatch<SetStateAction<string | null>>
}

export function useGrazingSessionMapSync({
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
}: UseGrazingSessionMapSyncOptions) {
  useEffect(() => {
    const source = mapRef.current?.getSource('current-session-track') as
      | GeoJSONSource
      | undefined
    if (!source) return
    source.setData(currentTrackFeatureCollection)
  }, [currentTrackFeatureCollection, mapRef])

  useEffect(() => {
    const source = mapRef.current?.getSource('survey-areas') as GeoJSONSource | undefined
    if (!source) return
    source.setData(surveyAreaFeatureCollection)
  }, [mapRef, surveyAreaFeatureCollection])

  useEffect(() => {
    const source = mapRef.current?.getSource('session-events') as GeoJSONSource | undefined
    if (!source) return
    source.setData(sessionEventFeatureCollection)
  }, [mapRef, sessionEventFeatureCollection])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return

    const visibility = showSurveyAreas ? 'visible' : 'none'

    if (map.getLayer('survey-areas-fill')) {
      map.setLayoutProperty('survey-areas-fill', 'visibility', visibility)
    }

    if (map.getLayer('survey-areas-line')) {
      map.setLayoutProperty('survey-areas-line', 'visibility', visibility)
    }
  }, [mapReady, mapRef, showSurveyAreas])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return

    if (map.getLayer('session-events-points')) {
      map.setLayoutProperty(
        'session-events-points',
        'visibility',
        showSessionEventsOnMap ? 'visible' : 'none'
      )
    }
  }, [mapReady, mapRef, showSessionEventsOnMap])

  useEffect(() => {
    if (
      selectedSurveyAreaId &&
      !safeSurveyAreas.some((surveyArea) => surveyArea.id === selectedSurveyAreaId)
    ) {
      setSelectedSurveyAreaId(null)
    }
  }, [safeSurveyAreas, selectedSurveyAreaId, setSelectedSurveyAreaId])

  useEffect(() => {
    const source = mapRef.current?.getSource('selected-session-track') as
      | GeoJSONSource
      | undefined
    if (!source) return
    source.setData(
      editingSessionId && editingSessionId === selectedSessionId
        ? editTrackFeatureCollection
        : selectedTrackFeatureCollection
    )
  }, [
    editTrackFeatureCollection,
    editingSessionId,
    mapRef,
    selectedSessionId,
    selectedTrackFeatureCollection,
  ])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    map.setLayoutProperty(
      southTyrolBaseMapLayerId,
      'visibility',
      baseLayer === 'south-tyrol-basemap' ? 'visible' : 'none'
    )

    map.setLayoutProperty(
      southTyrolOrthoLayerId,
      'visibility',
      baseLayer === 'south-tyrol-orthophoto-2023' ? 'visible' : 'none'
    )
  }, [baseLayer, mapReady, mapRef])

  useEffect(() => {
    if (!mapReady || !position || !mapRef.current || !markerRef.current) return

    const lngLat: LngLatLike = [position.longitude, position.latitude]
    markerRef.current.setLngLat(lngLat).addTo(mapRef.current)

    if (safeCurrentTrackpoints.length === 0 && safeSelectedTrackpoints.length === 0) {
      mapRef.current.easeTo({
        center: lngLat,
        zoom: Math.max(mapRef.current.getZoom(), 15),
        duration: 700,
      })
    }
  }, [
    mapReady,
    mapRef,
    markerRef,
    position,
    safeCurrentTrackpoints.length,
    safeSelectedTrackpoints.length,
  ])

  useEffect(() => {
    if (!mapRef.current || safeCurrentTrackpoints.length < 2) return

    const bounds = getBoundsFromTrackpoints(safeCurrentTrackpoints)
    if (!bounds) return

    mapRef.current.fitBounds(bounds, {
      padding: 50,
      duration: 700,
      maxZoom: 17,
    })
  }, [mapRef, safeCurrentTrackpoints])

  useEffect(() => {
    if (!mapRef.current || !selectedSessionId || safeSelectedTrackpoints.length === 0) return

    const bounds = getBoundsFromTrackpoints(safeSelectedTrackpoints)
    if (!bounds) return

    mapRef.current.fitBounds(bounds, {
      padding: 50,
      duration: 700,
      maxZoom: 17,
    })
  }, [mapRef, safeSelectedTrackpoints, selectedSessionId])
}
