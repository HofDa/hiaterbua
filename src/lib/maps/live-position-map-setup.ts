import type { Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl'
import {
  addAreaFillLayer,
  addGeoJsonSource,
  addOrthophotoLayer,
  addPathLineLayer,
  addPathPointLayer,
  addSurveyAreaLayers,
  addTouchTargetLayer,
  bindFeatureIdClick,
  bindPointerCursor,
  bindPointIndexClick,
} from '@/lib/maps/maplibre-runtime'
import { mapStyleColors } from '@/lib/maps/map-style-tokens'

type LivePositionMapSetupHandlers = {
  onMapClick: (event: MapMouseEvent) => void
  onSavedEnclosureSelect: (enclosureId: string) => void
  onSelectedEnclosureSelect: (enclosureId: string) => void
  onWalkPointSelect: (index: number) => void
  onEditPointSelect: (index: number) => void
}

// Layers are added in paint order — each source's fill sits below its line,
// which sits below its points — so the sequence here is load-bearing.
export function registerLivePositionMapSetup(
  map: MapLibreMap,
  handlers: LivePositionMapSetupHandlers
) {
  addOrthophotoLayer(map)
  addGeoJsonSource(map, 'saved-enclosures')
  addSurveyAreaLayers(map)

  addAreaFillLayer(map, {
    id: 'saved-enclosures-fill',
    source: 'saved-enclosures',
    color: mapStyleColors.savedEnclosureFill,
    opacity: 0.18,
  })
  addPathLineLayer(map, {
    id: 'saved-enclosures-line',
    source: 'saved-enclosures',
    color: mapStyleColors.savedEnclosureLine,
    width: 2,
  })

  addGeoJsonSource(map, 'selected-enclosure')
  addAreaFillLayer(map, {
    id: 'selected-enclosure-fill',
    source: 'selected-enclosure',
    color: mapStyleColors.selectedEnclosureFill,
    opacity: 0.2,
  })
  addPathLineLayer(map, {
    id: 'selected-enclosure-line',
    source: 'selected-enclosure',
    color: mapStyleColors.selectedEnclosureLine,
    width: 4,
  })

  addGeoJsonSource(map, 'draft-enclosure')
  addAreaFillLayer(map, {
    id: 'draft-enclosure-fill',
    source: 'draft-enclosure',
    color: mapStyleColors.draftEnclosureFill,
    opacity: 0.16,
    filterGeometry: true,
  })
  addPathLineLayer(map, {
    id: 'draft-enclosure-line',
    source: 'draft-enclosure',
    color: mapStyleColors.draftEnclosureLine,
    width: 3,
    filterGeometry: true,
  })
  addPathPointLayer(map, {
    id: 'draft-enclosure-points',
    source: 'draft-enclosure',
    color: mapStyleColors.draftEnclosureLine,
    radius: 5,
    strokeWidth: 2,
  })

  addGeoJsonSource(map, 'edit-enclosure')
  addAreaFillLayer(map, {
    id: 'edit-enclosure-fill',
    source: 'edit-enclosure',
    color: mapStyleColors.editEnclosureFill,
    opacity: 0.14,
    filterGeometry: true,
  })
  addPathLineLayer(map, {
    id: 'edit-enclosure-line',
    source: 'edit-enclosure',
    color: mapStyleColors.editEnclosureLine,
    width: 3,
    filterGeometry: true,
  })
  addPathPointLayer(map, {
    id: 'edit-enclosure-points',
    source: 'edit-enclosure',
    color: mapStyleColors.editEnclosureLine,
    radius: 8,
    strokeWidth: 3,
  })
  addTouchTargetLayer(map, {
    id: 'edit-enclosure-touch-target',
    source: 'edit-enclosure',
  })

  addGeoJsonSource(map, 'walk-track')
  addAreaFillLayer(map, {
    id: 'walk-track-fill',
    source: 'walk-track',
    color: mapStyleColors.walkTrackFill,
    opacity: 0.14,
    filterGeometry: true,
  })
  addPathLineLayer(map, {
    id: 'walk-track-line',
    source: 'walk-track',
    color: mapStyleColors.walkTrackLine,
    width: 3,
    filterGeometry: true,
  })
  addPathPointLayer(map, {
    id: 'walk-track-points',
    source: 'walk-track',
    color: mapStyleColors.walkTrackLine,
    radius: 4,
    strokeWidth: 2,
  })

  addGeoJsonSource(map, 'selected-walk-point')
  addPathPointLayer(map, {
    id: 'selected-walk-point',
    source: 'selected-walk-point',
    color: mapStyleColors.selectedWalkPoint,
    radius: 8,
    strokeWidth: 3,
    strokeColor: mapStyleColors.selectedWalkPointStroke,
  })

  addGeoJsonSource(map, 'selected-walk-track')
  addPathLineLayer(map, {
    id: 'selected-walk-track-line',
    source: 'selected-walk-track',
    color: mapStyleColors.selectedWalkTrack,
    width: 4,
    filterGeometry: true,
  })
  addPathPointLayer(map, {
    id: 'selected-walk-track-points',
    source: 'selected-walk-track',
    color: mapStyleColors.selectedWalkTrack,
    radius: 4,
    strokeWidth: 2,
  })

  map.on('click', handlers.onMapClick)

  bindFeatureIdClick(map, 'saved-enclosures-fill', handlers.onSavedEnclosureSelect)
  bindFeatureIdClick(map, 'selected-enclosure-fill', handlers.onSelectedEnclosureSelect)
  bindPointIndexClick(map, 'walk-track-points', 'index', handlers.onWalkPointSelect)
  bindPointIndexClick(map, 'edit-enclosure-touch-target', 'index', handlers.onEditPointSelect)

  bindPointerCursor(map, [
    'saved-enclosures-fill',
    'selected-enclosure-fill',
    'walk-track-points',
    'edit-enclosure-touch-target',
  ])
}
