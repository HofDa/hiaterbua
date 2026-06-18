import type { Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl'
import {
  addGeoJsonSource,
  addOrthophotoLayer,
  addSurveyAreaLayers,
  bindPointerCursor,
} from '@/lib/maps/maplibre-runtime'
import { mapStyleColors } from '@/lib/maps/map-style-tokens'

type LivePositionMapSetupHandlers = {
  onMapClick: (event: MapMouseEvent) => void
  onSavedEnclosureSelect: (enclosureId: string) => void
  onSelectedEnclosureSelect: (enclosureId: string) => void
  onWalkPointSelect: (index: number) => void
  onEditPointSelect: (index: number) => void
}

export function registerLivePositionMapSetup(
  map: MapLibreMap,
  handlers: LivePositionMapSetupHandlers
) {
  addOrthophotoLayer(map)
  addGeoJsonSource(map, 'saved-enclosures')
  addSurveyAreaLayers(map)

  map.addLayer({
    id: 'saved-enclosures-fill',
    type: 'fill',
    source: 'saved-enclosures',
    paint: {
      'fill-color': mapStyleColors.savedEnclosureFill,
      'fill-opacity': 0.18,
    },
  })

  map.addLayer({
    id: 'saved-enclosures-line',
    type: 'line',
    source: 'saved-enclosures',
    paint: {
      'line-color': mapStyleColors.savedEnclosureLine,
      'line-width': 2,
    },
  })

  addGeoJsonSource(map, 'selected-enclosure')
  map.addLayer({
    id: 'selected-enclosure-fill',
    type: 'fill',
    source: 'selected-enclosure',
    paint: {
      'fill-color': mapStyleColors.selectedEnclosureFill,
      'fill-opacity': 0.2,
    },
  })

  map.addLayer({
    id: 'selected-enclosure-line',
    type: 'line',
    source: 'selected-enclosure',
    paint: {
      'line-color': mapStyleColors.selectedEnclosureLine,
      'line-width': 4,
    },
  })

  addGeoJsonSource(map, 'draft-enclosure')
  map.addLayer({
    id: 'draft-enclosure-fill',
    type: 'fill',
    source: 'draft-enclosure',
    paint: {
      'fill-color': mapStyleColors.draftEnclosureFill,
      'fill-opacity': 0.16,
    },
    filter: ['==', '$type', 'Polygon'],
  })

  map.addLayer({
    id: 'draft-enclosure-line',
    type: 'line',
    source: 'draft-enclosure',
    paint: {
      'line-color': mapStyleColors.draftEnclosureLine,
      'line-width': 3,
    },
    filter: ['==', '$type', 'LineString'],
  })

  map.addLayer({
    id: 'draft-enclosure-points',
    type: 'circle',
    source: 'draft-enclosure',
    paint: {
      'circle-radius': 5,
      'circle-color': mapStyleColors.draftEnclosureLine,
      'circle-stroke-width': 2,
      'circle-stroke-color': mapStyleColors.white,
    },
    filter: ['==', '$type', 'Point'],
  })

  addGeoJsonSource(map, 'edit-enclosure')
  map.addLayer({
    id: 'edit-enclosure-fill',
    type: 'fill',
    source: 'edit-enclosure',
    paint: {
      'fill-color': mapStyleColors.editEnclosureFill,
      'fill-opacity': 0.14,
    },
    filter: ['==', '$type', 'Polygon'],
  })

  map.addLayer({
    id: 'edit-enclosure-line',
    type: 'line',
    source: 'edit-enclosure',
    paint: {
      'line-color': mapStyleColors.editEnclosureLine,
      'line-width': 3,
    },
    filter: ['==', '$type', 'LineString'],
  })

  map.addLayer({
    id: 'edit-enclosure-points',
    type: 'circle',
    source: 'edit-enclosure',
    paint: {
      'circle-radius': 8,
      'circle-color': mapStyleColors.editEnclosureLine,
      'circle-stroke-width': 3,
      'circle-stroke-color': mapStyleColors.white,
    },
    filter: ['==', '$type', 'Point'],
  })

  map.addLayer({
    id: 'edit-enclosure-touch-target',
    type: 'circle',
    source: 'edit-enclosure',
    paint: {
      'circle-radius': 18,
      'circle-color': mapStyleColors.white,
      'circle-opacity': 0.01,
    },
    filter: ['==', '$type', 'Point'],
  })

  addGeoJsonSource(map, 'walk-track')
  map.addLayer({
    id: 'walk-track-fill',
    type: 'fill',
    source: 'walk-track',
    paint: {
      'fill-color': mapStyleColors.walkTrackFill,
      'fill-opacity': 0.14,
    },
    filter: ['==', '$type', 'Polygon'],
  })

  map.addLayer({
    id: 'walk-track-line',
    type: 'line',
    source: 'walk-track',
    paint: {
      'line-color': mapStyleColors.walkTrackLine,
      'line-width': 3,
    },
    filter: ['==', '$type', 'LineString'],
  })

  map.addLayer({
    id: 'walk-track-points',
    type: 'circle',
    source: 'walk-track',
    paint: {
      'circle-radius': 4,
      'circle-color': mapStyleColors.walkTrackLine,
      'circle-stroke-width': 2,
      'circle-stroke-color': mapStyleColors.white,
    },
    filter: ['==', '$type', 'Point'],
  })

  addGeoJsonSource(map, 'selected-walk-point')
  map.addLayer({
    id: 'selected-walk-point',
    type: 'circle',
    source: 'selected-walk-point',
    paint: {
      'circle-radius': 8,
      'circle-color': mapStyleColors.selectedWalkPoint,
      'circle-stroke-width': 3,
      'circle-stroke-color': mapStyleColors.selectedWalkPointStroke,
    },
    filter: ['==', '$type', 'Point'],
  })

  addGeoJsonSource(map, 'selected-walk-track')
  map.addLayer({
    id: 'selected-walk-track-line',
    type: 'line',
    source: 'selected-walk-track',
    paint: {
      'line-color': mapStyleColors.selectedWalkTrack,
      'line-width': 4,
    },
    filter: ['==', '$type', 'LineString'],
  })

  map.addLayer({
    id: 'selected-walk-track-points',
    type: 'circle',
    source: 'selected-walk-track',
    paint: {
      'circle-radius': 4,
      'circle-color': mapStyleColors.selectedWalkTrack,
      'circle-stroke-width': 2,
      'circle-stroke-color': mapStyleColors.white,
    },
    filter: ['==', '$type', 'Point'],
  })

  map.on('click', handlers.onMapClick)

  map.on('click', 'saved-enclosures-fill', (event) => {
    const enclosureId = event.features?.[0]?.properties?.id
    if (typeof enclosureId === 'string') {
      handlers.onSavedEnclosureSelect(enclosureId)
    }
  })

  map.on('click', 'selected-enclosure-fill', (event) => {
    const enclosureId = event.features?.[0]?.properties?.id
    if (typeof enclosureId === 'string') {
      handlers.onSelectedEnclosureSelect(enclosureId)
    }
  })

  map.on('click', 'walk-track-points', (event) => {
    const pointIndex = Number(event.features?.[0]?.properties?.index)
    if (Number.isInteger(pointIndex) && pointIndex >= 1) {
      handlers.onWalkPointSelect(pointIndex - 1)
    }
  })

  map.on('click', 'edit-enclosure-touch-target', (event) => {
    const pointIndex = Number(event.features?.[0]?.properties?.index)
    if (Number.isInteger(pointIndex) && pointIndex >= 1) {
      handlers.onEditPointSelect(pointIndex - 1)
    }
  })

  bindPointerCursor(map, [
    'saved-enclosures-fill',
    'selected-enclosure-fill',
    'walk-track-points',
    'edit-enclosure-touch-target',
  ])
}
