import { useCallback, useEffect, useMemo } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { useGeolocationWatcher } from '@/components/maps/hooks/use-geolocation-watcher'
import { useLatestValueRef } from '@/components/maps/hooks/use-latest-value-ref'
import { useLivePositionMapController } from '@/components/maps/hooks/use-live-position-map-controller'
import { useLivePositionMapData } from '@/components/maps/hooks/use-live-position-map-data'
import { useLivePositionMapPresentation } from '@/components/maps/hooks/use-live-position-map-presentation'
import { useLivePositionMapState } from '@/components/maps/hooks/use-live-position-map-state'
import {
  useLivePositionMapStore,
  type LivePositionCanvasHandles,
  type LivePositionCanvasSlice,
  type LivePositionSidebarHandles,
  type LivePositionSidebarSlice,
  type LivePositionWorkflowHandles,
  type LivePositionWorkflowSlice,
} from '@/components/maps/hooks/use-live-position-map-store'
import { useStableHandles } from '@/components/maps/hooks/use-stable-handles'
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

  // Publish the live-status slice to the store so the status card can subscribe to just
  // these fields — a GPS tick re-renders the card without rebuilding the rest of the tree.
  const setLiveStatus = useLivePositionMapStore((store) => store.setStatus)
  useEffect(() => {
    setLiveStatus({
      gpsState: gps.gpsState,
      gpsLabel: presentation.gpsLabel,
      gpsDetail: presentation.gpsDetail,
      gpsFilterDetail: presentation.gpsFilterDetail,
      position: gps.position,
    })
  }, [
    gps.gpsState,
    gps.position,
    presentation.gpsDetail,
    presentation.gpsFilterDetail,
    presentation.gpsLabel,
    setLiveStatus,
  ])

  // Publish the canvas slice + (stable) handles to the store so the canvas panel reads
  // them via selectors instead of a ~59-field prop bag rebuilt on every screen render.
  const canvasValues: LivePositionCanvasSlice = {
    mobilePanel: selection.mobilePanel,
    editingEnclosureId: edit.editingEnclosureId,
    position: gps.position,
    isBaseLayerMenuOpen: runtime.isBaseLayerMenuOpen,
    baseLayer: runtime.baseLayer,
    showSurveyAreas: runtime.showSurveyAreas,
    prefetchingMapArea: runtime.prefetchingMapArea,
    prefetchStatus: runtime.prefetchStatus,
    isDrawing: draw.isDrawing,
    isWalking: walk.isWalking,
    draftPointsLength: draw.draftPoints.length,
    draftAreaM2: data.draftAreaM2,
    name: draw.name,
    notes: draw.notes,
    saveError: draw.saveError,
    isSaving: draw.isSaving,
    walkPoints: walk.walkPoints,
    walkPointsLength: walk.walkPoints.length,
    walkAreaM2: data.walkAreaM2,
    walkName: walk.walkName,
    walkNotes: walk.walkNotes,
    walkError: walk.walkError,
    isWalkSaving: walk.isWalkSaving,
    isWalkPointsOpen: walk.isWalkPointsOpen,
    selectedWalkPointIndex: walk.selectedWalkPointIndex,
    selectedWalkPoint: data.selectedWalkPoint,
    editGeometryPointsLength: edit.editGeometryPoints.length,
    selectedEditPointIndex: edit.selectedEditPointIndex,
    isAddingEditPoint: edit.isAddingEditPoint,
    isEditing: edit.isEditing,
  }

  const canvasHandles = useStableHandles<LivePositionCanvasHandles>({
    onCenterMap: runtime.centerMapOnPosition,
    onToggleBaseLayerMenu: () => runtime.setIsBaseLayerMenuOpen((current) => !current),
    onUpdateBaseLayer: runtime.updateBaseLayer,
    onToggleShowSurveyAreas: () => runtime.setShowSurveyAreas((current) => !current),
    onPrefetchVisibleMapArea: runtime.prefetchVisibleMapArea,
    onStartDrawing: actions.startDrawing,
    onFinishDrawing: actions.finishDrawing,
    onUndoLastPoint: actions.undoLastPoint,
    onClearDraft: actions.clearDraft,
    onNameChange: draw.setName,
    onNotesChange: draw.setNotes,
    onSaveEnclosure: actions.saveEnclosure,
    onMobilePanelChange: selection.setMobilePanel,
    onToggleWalkPoints: () => walk.setIsWalkPointsOpen((current) => !current),
    onSelectedWalkPointIndexChange: walk.setSelectedWalkPointIndex,
    onStartWalkMode: actions.startWalkMode,
    onStopWalkMode: actions.stopWalkMode,
    onUndoLastWalkPoint: actions.undoLastWalkPoint,
    onRemoveWalkPointAtIndex: actions.removeWalkPointAtIndex,
    onDiscardWalkMode: actions.discardWalkMode,
    onWalkNameChange: walk.setWalkName,
    onWalkNotesChange: walk.setWalkNotes,
    onSaveWalkEnclosure: actions.saveWalkEnclosure,
    onStartAddEditPoint: actions.startAddEditPoint,
    onRemoveSelectedEditPoint: actions.removeSelectedEditPoint,
    onPersistEditedEnclosure: async () => {
      await actions.persistEditedEnclosure()
    },
    onCancelEditEnclosure: actions.cancelEditEnclosure,
  })

  const setCanvas = useLivePositionMapStore((store) => store.setCanvas)
  const setCanvasHandles = useLivePositionMapStore((store) => store.setCanvasHandles)
  // Mirror the freshly-built slice to the store on every commit; `setCanvas` shallow-guards,
  // so subscribers only re-render when a value actually changed.
  useEffect(() => {
    setCanvas(canvasValues)
  })
  useEffect(() => {
    setCanvasHandles(canvasHandles)
  }, [canvasHandles, setCanvasHandles])

  // Same pattern for the mobile workflow panels. `onMobilePanelChange` is intentionally
  // not included here — it stays a parent-wired prop because it also opens the mobile map.
  const workflowValues: LivePositionWorkflowSlice = {
    mobilePanel: selection.mobilePanel,
    isDrawing: draw.isDrawing,
    draftPointsCount: draw.draftPoints.length,
    draftAreaM2: data.draftAreaM2,
    name: draw.name,
    notes: draw.notes,
    saveError: draw.saveError,
    isSaving: draw.isSaving,
    isWalking: walk.isWalking,
    walkPoints: walk.walkPoints,
    walkAreaM2: data.walkAreaM2,
    walkName: walk.walkName,
    walkNotes: walk.walkNotes,
    walkError: walk.walkError,
    isWalkSaving: walk.isWalkSaving,
    isWalkPointsOpen: walk.isWalkPointsOpen,
    selectedWalkPointIndex: walk.selectedWalkPointIndex,
    selectedWalkPoint: data.selectedWalkPoint,
    filteredEnclosures: data.filteredEnclosures,
    selectedEnclosure: data.selectedEnclosure,
    selectedEnclosureId: selection.selectedEnclosureId,
    assignmentEditorEnclosureId: assignment.assignmentEditorEnclosureId,
    assignmentHerdId: assignment.assignmentHerdId,
    assignmentCount: assignment.assignmentCount,
    assignmentNotes: assignment.assignmentNotes,
    assignmentError: assignment.assignmentError,
    isAssignmentSaving: assignment.isAssignmentSaving,
    endingAssignmentId: assignment.endingAssignmentId,
    safeHerds: data.safeHerds,
    herdsById: data.herdsById,
    animalsByHerdId: data.animalsByHerdId,
    activeAssignmentsByHerdId: data.activeAssignmentsByHerdId,
    isSelectedEnclosureInfoOpen: selection.isSelectedEnclosureInfoOpen,
    showSelectedTrack: selection.showSelectedTrack,
  }

  const workflowHandles = useStableHandles<LivePositionWorkflowHandles>({
    onStartDrawing: actions.startDrawing,
    onFinishDrawing: actions.finishDrawing,
    onUndoLastPoint: actions.undoLastPoint,
    onClearDraft: actions.clearDraft,
    onNameChange: draw.setName,
    onNotesChange: draw.setNotes,
    onSaveEnclosure: actions.saveEnclosure,
    onToggleWalkPoints: () => walk.setIsWalkPointsOpen((current) => !current),
    onSelectedWalkPointIndexChange: walk.setSelectedWalkPointIndex,
    onStartWalkMode: () => {
      void actions.startWalkMode()
    },
    onStopWalkMode: actions.stopWalkMode,
    onUndoLastWalkPoint: () => {
      void actions.undoLastWalkPoint()
    },
    onRemoveWalkPointAtIndex: (pointIndex) => {
      void actions.removeWalkPointAtIndex(pointIndex)
    },
    onDiscardWalkMode: () => {
      void actions.discardWalkMode()
    },
    onWalkNameChange: walk.setWalkName,
    onWalkNotesChange: walk.setWalkNotes,
    onSaveWalkEnclosure: actions.saveWalkEnclosure,
    onSelectedEnclosureChange: presentation.handleMobileSelectedEnclosureChange,
    onToggleSelectedEnclosureInfo: () =>
      selection.setIsSelectedEnclosureInfoOpen((current) => !current),
    onToggleShowSelectedTrack: () => {
      if (data.selectedEnclosure) {
        actions.toggleSelectedTrackForEnclosure(data.selectedEnclosure.id)
      }
    },
    onOpenAssignmentEditor: actions.openAssignmentEditor,
    onCancelAssignmentEditor: actions.cancelAssignmentEditor,
    onAssignHerdToEnclosure: (enclosure) => {
      void actions.assignHerdToEnclosure(enclosure)
    },
    onAssignmentHerdIdChange: actions.handleAssignmentHerdIdChange,
    onAssignmentCountChange: assignment.setAssignmentCount,
    onAssignmentNotesChange: assignment.setAssignmentNotes,
    onEndEnclosureAssignment: (assignmentRecord) => {
      void actions.endEnclosureAssignment(assignmentRecord)
    },
  })

  const setWorkflow = useLivePositionMapStore((store) => store.setWorkflow)
  const setWorkflowHandles = useLivePositionMapStore((store) => store.setWorkflowHandles)
  useEffect(() => {
    setWorkflow(workflowValues)
  })
  useEffect(() => {
    setWorkflowHandles(workflowHandles)
  }, [workflowHandles, setWorkflowHandles])

  // Same pattern for the sidebar. `onFocusEnclosure` / `onStartEditEnclosure` stay
  // parent-wired props (they also open the mobile map), so they are not published here.
  const sidebarValues: LivePositionSidebarSlice = {
    mobilePanel: selection.mobilePanel,
    safeSurveyAreas: data.safeSurveyAreas,
    selectedSurveyArea: data.selectedSurveyArea,
    selectedSurveyAreaId: selection.selectedSurveyAreaId,
    filteredEnclosures: data.filteredEnclosures,
    enclosureListFilter: selection.enclosureListFilter,
    selectedEnclosure: data.selectedEnclosure,
    selectedEnclosureId: selection.selectedEnclosureId,
    expandedSavedEnclosureId: selection.expandedSavedEnclosureId,
    assignmentEditorEnclosureId: assignment.assignmentEditorEnclosureId,
    assignmentHerdId: assignment.assignmentHerdId,
    assignmentCount: assignment.assignmentCount,
    assignmentNotes: assignment.assignmentNotes,
    assignmentError: assignment.assignmentError,
    isAssignmentSaving: assignment.isAssignmentSaving,
    endingAssignmentId: assignment.endingAssignmentId,
    showSelectedTrack: selection.showSelectedTrack,
    selectedTrackSummary: data.selectedTrackSummary,
    safeHerds: data.safeHerds,
    herdsById: data.herdsById,
    animalsByHerdId: data.animalsByHerdId,
    activeAssignmentsByHerdId: data.activeAssignmentsByHerdId,
    assignmentHistoryByEnclosureId: data.assignmentHistoryByEnclosureId,
    editingEnclosureId: edit.editingEnclosureId,
    editName: edit.editName,
    editNotes: edit.editNotes,
    editError: edit.editError,
    isEditing: edit.isEditing,
    editGeometryPointsLength: edit.editGeometryPoints.length,
    editAreaM2: data.editAreaM2,
    selectedEditPointIndex: edit.selectedEditPointIndex,
    isAddingEditPoint: edit.isAddingEditPoint,
  }

  const sidebarHandles = useStableHandles<LivePositionSidebarHandles>({
    onFocusSurveyArea: runtime.focusSurveyArea,
    onEnclosureListFilterChange: selection.setEnclosureListFilter,
    onExpandedSavedEnclosureChange: (enclosureId) =>
      selection.setExpandedSavedEnclosureId((current) =>
        current === enclosureId ? null : enclosureId,
      ),
    onToggleShowSelectedTrack: actions.toggleSelectedTrackForEnclosure,
    onDeleteEnclosure: (enclosure) => {
      void actions.deleteEnclosure(enclosure)
    },
    onOpenAssignmentEditor: actions.openAssignmentEditor,
    onCancelAssignmentEditor: actions.cancelAssignmentEditor,
    onAssignHerdToEnclosure: (enclosure) => {
      void actions.assignHerdToEnclosure(enclosure)
    },
    onAssignmentHerdIdChange: actions.handleAssignmentHerdIdChange,
    onAssignmentCountChange: assignment.setAssignmentCount,
    onAssignmentNotesChange: assignment.setAssignmentNotes,
    onEndEnclosureAssignment: (assignmentRecord) => {
      void actions.endEnclosureAssignment(assignmentRecord)
    },
    onEditNameChange: edit.setEditName,
    onEditNotesChange: edit.setEditNotes,
    onStartAddEditPoint: actions.startAddEditPoint,
    onRemoveSelectedEditPoint: actions.removeSelectedEditPoint,
    onSaveEditedEnclosure: actions.saveEditedEnclosure,
    onCancelEditEnclosure: actions.cancelEditEnclosure,
  })

  const setSidebar = useLivePositionMapStore((store) => store.setSidebar)
  const setSidebarHandles = useLivePositionMapStore((store) => store.setSidebarHandles)
  useEffect(() => {
    setSidebar(sidebarValues)
  })
  useEffect(() => {
    setSidebarHandles(sidebarHandles)
  }, [sidebarHandles, setSidebarHandles])

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
