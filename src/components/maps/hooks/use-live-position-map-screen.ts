import { useCallback, useEffect, useMemo } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { useGeolocationWatcher } from '@/components/maps/hooks/use-geolocation-watcher'
import { useLatestValueRef } from '@/components/maps/hooks/use-latest-value-ref'
import { useLivePositionMapController } from '@/components/maps/hooks/use-live-position-map-controller'
import { useLivePositionMapData } from '@/components/maps/hooks/use-live-position-map-data'
import { useLivePositionMapPresentation } from '@/components/maps/hooks/use-live-position-map-presentation'
import { useLivePositionMapPublish } from '@/components/maps/hooks/use-live-position-map-publish'
import { useLivePositionMapState } from '@/components/maps/hooks/use-live-position-map-state'
import {
  getPositionLngLat,
  useMapKernel,
} from '@/components/maps/hooks/use-map-kernel'
import { useWakeLock } from '@/hooks/use-wake-lock'
import type { PositionData } from '@/components/maps/live-position-map-types'
import {
  emptyFeatureCollection,
  getBoundsFromTrackpoints,
  getFreshPosition,
} from '@/lib/maps/map-core'
import { registerLivePositionMapSetup } from '@/lib/maps/live-position-map-setup'
import {
  getBoundsFromPolygon,
  getBoundsFromWalkPoints,
} from '@/lib/maps/live-position-map-helpers'
import { defaultAppSettings } from '@/lib/settings/defaults'
import type { Enclosure } from '@/types/domain'

export function useLivePositionMapScreen() {
  const state = useLivePositionMapState()
  const { refs, gps, draw, walk, selection, edit, assignment } = state

  const data = useLivePositionMapData({
    selectedEnclosureId: selection.selectedEnclosureId,
    selectedSurveyAreaId: selection.selectedSurveyAreaId,
    selectedWalkPointIndex: walk.selectedWalkPointIndex,
    enclosureListFilter: selection.enclosureListFilter,
    draftPoints: draw.draftPoints,
    walkPoints: walk.walkPoints,
    editGeometryPoints: edit.editGeometryPoints,
  })

  const effectiveSettings = data.settings ?? defaultAppSettings
  const settingsRef = useLatestValueRef(effectiveSettings)
  const buildPositionRef = useLatestValueRef(
    (nextPosition: GeolocationPosition): PositionData => ({
      latitude: nextPosition.coords.latitude,
      longitude: nextPosition.coords.longitude,
      accuracy: nextPosition.coords.accuracy,
      timestamp: nextPosition.timestamp,
    })
  )
  const isDrawingRef = useLatestValueRef(draw.isDrawing)
  const draftPointsLengthRef = useLatestValueRef(draw.draftPoints.length)
  const editingEnclosureIdRef = useLatestValueRef(edit.editingEnclosureId)
  const selectedEditPointIndexRef = useLatestValueRef(edit.selectedEditPointIndex)
  const isAddingEditPointRef = useLatestValueRef(edit.isAddingEditPoint)
  const { setDraftPoints } = draw
  const { setSelectedWalkPointIndex } = walk
  const {
    setEditGeometryPoints,
    setSelectedEditPointIndex,
    setIsAddingEditPoint,
    setEditError,
  } = edit
  const { openEnclosureDetailsRef } = refs

  const registerLayers = useCallback(
    (map: MapLibreMap) => {
      registerLivePositionMapSetup(map, {
        onMapClick: (event) => {
          if (editingEnclosureIdRef.current && isAddingEditPointRef.current) {
            setEditGeometryPoints((currentPoints) => [
              ...currentPoints,
              {
                lat: event.lngLat.lat,
                lon: event.lngLat.lng,
              },
            ])
            setIsAddingEditPoint(false)
            setEditError('')
            return
          }

          if (
            editingEnclosureIdRef.current &&
            selectedEditPointIndexRef.current !== null
          ) {
            setEditGeometryPoints((currentPoints) =>
              currentPoints.map((point, index) =>
                index === selectedEditPointIndexRef.current
                  ? {
                      lat: event.lngLat.lat,
                      lon: event.lngLat.lng,
                    }
                  : point
              )
            )
            setSelectedEditPointIndex(null)
            setEditError('')
            return
          }

          setDraftPoints((currentPoints) => {
            if (!isDrawingRef.current) return currentPoints

            return [
              ...currentPoints,
              {
                lat: event.lngLat.lat,
                lon: event.lngLat.lng,
              },
            ]
          })
        },
        onSavedEnclosureSelect: (enclosureId) => {
          if (
            isDrawingRef.current ||
            draftPointsLengthRef.current > 0 ||
            editingEnclosureIdRef.current
          ) {
            return
          }

          openEnclosureDetailsRef.current(enclosureId)
        },
        onSelectedEnclosureSelect: (enclosureId) => {
          if (
            isDrawingRef.current ||
            draftPointsLengthRef.current > 0 ||
            editingEnclosureIdRef.current
          ) {
            return
          }

          openEnclosureDetailsRef.current(enclosureId)
        },
        onWalkPointSelect: setSelectedWalkPointIndex,
        onEditPointSelect: setSelectedEditPointIndex,
      })
    },
    [
      draftPointsLengthRef,
      editingEnclosureIdRef,
      isAddingEditPointRef,
      isDrawingRef,
      openEnclosureDetailsRef,
      selectedEditPointIndexRef,
      setDraftPoints,
      setEditError,
      setEditGeometryPoints,
      setIsAddingEditPoint,
      setSelectedEditPointIndex,
      setSelectedWalkPointIndex,
    ]
  )
  const mapSources = useMemo(
    () => [
      {
        sourceId: 'saved-enclosures',
        featureCollection: data.savedFeatureCollection,
      },
      {
        sourceId: 'survey-areas',
        featureCollection: data.surveyAreaFeatureCollection,
      },
      {
        sourceId: 'draft-enclosure',
        featureCollection: data.draftFeatureCollection,
      },
      {
        sourceId: 'edit-enclosure',
        featureCollection: edit.editingEnclosureId
          ? data.editFeatureCollection
          : emptyFeatureCollection,
      },
      {
        sourceId: 'walk-track',
        featureCollection: data.walkFeatureCollection,
      },
      {
        sourceId: 'selected-walk-point',
        featureCollection: data.selectedWalkPointFeatureCollection,
      },
      {
        sourceId: 'selected-enclosure',
        featureCollection: data.selectedFeatureCollection,
      },
      {
        sourceId: 'selected-walk-track',
        featureCollection: selection.showSelectedTrack
          ? data.selectedTrackFeatureCollection
          : emptyFeatureCollection,
      },
    ],
    [
      data.draftFeatureCollection,
      data.editFeatureCollection,
      data.savedFeatureCollection,
      data.selectedFeatureCollection,
      data.selectedTrackFeatureCollection,
      data.selectedWalkPointFeatureCollection,
      data.surveyAreaFeatureCollection,
      data.walkFeatureCollection,
      edit.editingEnclosureId,
      selection.showSelectedTrack,
    ]
  )
  const mapKernel = useMapKernel({
    settings: data.settings,
    position: gps.position,
    baseLayerSettingsMode: 'once',
    selectedSurveyAreaId: selection.selectedSurveyAreaId,
    safeSurveyAreas: data.safeSurveyAreas,
    setSelectedSurveyAreaId: selection.setSelectedSurveyAreaId,
    onSettingsSaveError: setEditError,
    registerLayers,
    sources: mapSources,
  })
  const { mapRef, mapReady } = mapKernel

  useEffect(() => {
    if (
      !selection.showSelectedTrack ||
      !mapRef.current ||
      data.safeSelectedTrackpoints.length === 0
    ) {
      return
    }

    const bounds = getBoundsFromTrackpoints(data.safeSelectedTrackpoints)
    if (!bounds) return

    mapRef.current.fitBounds(bounds, {
      padding: 50,
      duration: 800,
      maxZoom: 18,
    })
  }, [data.safeSelectedTrackpoints, mapRef, selection.showSelectedTrack])

  useEffect(() => {
    if (!mapReady || !gps.position || !mapRef.current) return

    if (
      !draw.isDrawing &&
      draw.draftPoints.length === 0 &&
      !selection.selectedEnclosureId &&
      !edit.editingEnclosureId
    ) {
      mapRef.current.easeTo({
        center: getPositionLngLat(gps.position),
        zoom: Math.max(mapRef.current.getZoom(), 15),
        duration: 800,
      })
    }
  }, [
    draw.draftPoints.length,
    draw.isDrawing,
    edit.editingEnclosureId,
    gps.position,
    mapReady,
    mapRef,
    selection.selectedEnclosureId,
  ])

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
  const runtime = {
    ...mapKernel,
    focusEnclosure,
    focusWalkPoints,
  }

  const actions = useLivePositionMapController({
    safeEnclosures: data.safeEnclosures,
    safeHerds: data.safeHerds,
    herdsById: data.herdsById,
    animalsByHerdId: data.animalsByHerdId,
    activeAssignmentsByEnclosureId: data.activeAssignmentsByEnclosureId,
    activeAssignmentsByHerdId: data.activeAssignmentsByHerdId,
    acceptedPositionRef: refs.acceptedPositionRef,
    positionAccuracy: getFreshPosition(gps.position)?.accuracy ?? null,
    draftAreaM2: data.draftAreaM2,
    editAreaM2: data.editAreaM2,
    walkAreaM2: data.walkAreaM2,
    draw,
    walk,
    selection,
    edit,
    assignment,
    focusEnclosure: runtime.focusEnclosure,
    focusWalkPoints: runtime.focusWalkPoints,
  })

  useGeolocationWatcher({
    acceptedPositionRef: refs.acceptedPositionRef,
    buildPositionRef,
    onAcceptedPositionRef: actions.handleAcceptedPositionRef,
    settingsRef,
    watchIdRef: refs.watchIdRef,
    setGpsState: gps.setGpsState,
    setLastPositionDecision: gps.setLastPositionDecision,
    setPosition: gps.setPosition,
  })

  const presentation = useLivePositionMapPresentation({
    gpsState: gps.gpsState,
    position: gps.position,
    lastPositionDecision: gps.lastPositionDecision,
    effectiveSettings,
    safeEnclosures: data.safeEnclosures,
    openEnclosureDetailsRef: refs.openEnclosureDetailsRef,
    focusMapOnEnclosure: runtime.focusEnclosure,
    setSelectedEnclosureId: selection.setSelectedEnclosureId,
    setShowSelectedTrack: selection.setShowSelectedTrack,
    setIsSelectedEnclosureInfoOpen: selection.setIsSelectedEnclosureInfoOpen,
    setEditingEnclosureId: edit.setEditingEnclosureId,
  })

  useWakeLock(walk.isWalking)

  // Map all four panel slices into the store (the screen hook orchestrates; the publish
  // hook does the state -> store mapping that the old prop-builder used to do).
  useLivePositionMapPublish({ state, data, runtime, actions, presentation })

  // `containerRef` and `resizeMap` are wired synchronously (the map mount ref would be
  // null on first paint via the store; resizeMap is called by the screen component). The
  // three handlers below stay parent-wired because the parent layers in mobile-map opening.
  return {
    containerRef: runtime.containerRef,
    resizeMap: runtime.resizeMap,
    filteredEnclosuresCount: data.filteredEnclosures.length,
    onMobilePanelChange: selection.setMobilePanel,
    onFocusEnclosure: presentation.focusEnclosure,
    onStartEditEnclosure: actions.startEditEnclosure,
  }
}
