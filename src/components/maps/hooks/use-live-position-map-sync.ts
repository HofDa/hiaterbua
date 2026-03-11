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
import {
  emptyFeatureCollection,
  getBoundsFromTrackpoints,
} from '@/lib/maps/map-core'
import type { PositionData } from '@/components/maps/live-position-map-types'
import type {
  MapBaseLayer,
  SurveyArea,
  TrackPoint,
} from '@/types/domain'

type UseLivePositionMapSyncOptions = {
  mapRef: MutableRefObject<MapLibreMap | null>
  markerRef: MutableRefObject<Marker | null>
  mapReady: boolean
  baseLayer: MapBaseLayer
  showSurveyAreas: boolean
  settingsSelectedSurveyAreaId: string | null
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
  editingEnclosureId: string | null
  position: PositionData | null
  isDrawing: boolean
  draftPointsLength: number
  setSelectedSurveyAreaId: Dispatch<SetStateAction<string | null>>
}

export function useLivePositionMapSync({
  mapRef,
  markerRef,
  mapReady,
  baseLayer,
  showSurveyAreas,
  settingsSelectedSurveyAreaId,
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
}: UseLivePositionMapSyncOptions) {
  useEffect(() => {
    const source = mapRef.current?.getSource('saved-enclosures') as GeoJSONSource | undefined
    if (!source) return
    source.setData(savedFeatureCollection)
  }, [mapRef, savedFeatureCollection])

  useEffect(() => {
    const source = mapRef.current?.getSource('survey-areas') as GeoJSONSource | undefined
    if (!source) return
    source.setData(surveyAreaFeatureCollection)
  }, [mapRef, surveyAreaFeatureCollection])

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
    if (
      settingsSelectedSurveyAreaId &&
      !safeSurveyAreas.some((surveyArea) => surveyArea.id === settingsSelectedSurveyAreaId)
    ) {
      setSelectedSurveyAreaId(null)
    }
  }, [
    safeSurveyAreas,
    setSelectedSurveyAreaId,
    settingsSelectedSurveyAreaId,
  ])

  useEffect(() => {
    const source = mapRef.current?.getSource('draft-enclosure') as GeoJSONSource | undefined
    if (!source) return
    source.setData(draftFeatureCollection)
  }, [draftFeatureCollection, mapRef])

  useEffect(() => {
    const source = mapRef.current?.getSource('edit-enclosure') as GeoJSONSource | undefined
    if (!source) return
    source.setData(editingEnclosureId ? editFeatureCollection : emptyFeatureCollection)
  }, [editFeatureCollection, editingEnclosureId, mapRef])

  useEffect(() => {
    const source = mapRef.current?.getSource('walk-track') as GeoJSONSource | undefined
    if (!source) return
    source.setData(walkFeatureCollection)
  }, [mapRef, walkFeatureCollection])

  useEffect(() => {
    const source = mapRef.current?.getSource('selected-walk-point') as
      | GeoJSONSource
      | undefined
    if (!source) return
    source.setData(selectedWalkPointFeatureCollection)
  }, [mapRef, selectedWalkPointFeatureCollection])

  useEffect(() => {
    const source = mapRef.current?.getSource('selected-enclosure') as
      | GeoJSONSource
      | undefined
    if (!source) return
    source.setData(selectedFeatureCollection)
  }, [mapRef, selectedFeatureCollection])

  useEffect(() => {
    const source = mapRef.current?.getSource('selected-walk-track') as
      | GeoJSONSource
      | undefined
    if (!source) return
    source.setData(showSelectedTrack ? selectedTrackFeatureCollection : emptyFeatureCollection)
  }, [mapRef, selectedTrackFeatureCollection, showSelectedTrack])

  useEffect(() => {
    if (!showSelectedTrack || !mapRef.current || safeSelectedTrackpoints.length === 0) return

    const bounds = getBoundsFromTrackpoints(safeSelectedTrackpoints)
    if (!bounds) return

    mapRef.current.fitBounds(bounds, {
      padding: 50,
      duration: 800,
      maxZoom: 18,
    })
  }, [mapRef, safeSelectedTrackpoints, showSelectedTrack])

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

    if (!isDrawing && draftPointsLength === 0 && !selectedEnclosureId && !editingEnclosureId) {
      mapRef.current.easeTo({
        center: lngLat,
        zoom: Math.max(mapRef.current.getZoom(), 15),
        duration: 800,
      })
    }
  }, [
    draftPointsLength,
    editingEnclosureId,
    isDrawing,
    mapReady,
    mapRef,
    markerRef,
    position,
    selectedEnclosureId,
  ])
}
