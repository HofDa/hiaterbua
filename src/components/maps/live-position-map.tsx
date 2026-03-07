'use client'

import { area, polygon } from '@turf/turf'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import type * as GeoJSON from 'geojson'
import type {
  GeoJSONSource,
  LngLatLike,
  Map as MapLibreMap,
  MapMouseEvent,
  Marker,
  StyleSpecification,
} from 'maplibre-gl'
import { db } from '@/lib/db/dexie'
import {
  MAX_PREFETCH_TILES,
  buildPrefetchUrlsForBounds,
  getTileCacheCount,
  prefetchTileUrls,
} from '@/lib/maps/tile-cache'
import {
  CenterIcon,
  CloseIcon,
  LayersIcon,
  PlayIcon,
  StopIcon,
  UndoIcon,
} from '@/components/maps/map-toolbar-icons'
import {
  MobileMapToolbar,
  MobileMapToolbarButton,
  MobileMapToolbarStat,
} from '@/components/maps/mobile-map-toolbar'
import {
  MobileMapFloatingCard,
  MobileMapSectionCard,
  MobileMapSegmentButton,
  MobileMapSegmentedControl,
  MobileMapTopControls,
} from '@/components/maps/mobile-map-ui'
import { defaultAppSettings, normalizeMapBaseLayer } from '@/lib/settings/defaults'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type {
  Animal,
  Enclosure,
  EnclosureAssignment,
  Herd,
  MapBaseLayer,
  SurveyArea,
  TrackPoint,
} from '@/types/domain'

type GpsState = 'idle' | 'requesting' | 'tracking' | 'unsupported' | 'denied' | 'error'

type PositionData = {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

type PositionDecision =
  | { accepted: true; reason: 'initial' | 'accepted' }
  | { accepted: false; reason: 'accuracy' | 'time' | 'distance' }

type DraftPoint = {
  lat: number
  lon: number
}

type WalkTrackSummary = {
  count: number
  avgAccuracyM: number | null
  firstTimestamp: string | null
  lastTimestamp: string | null
}

type MobilePanel = 'draw' | 'walk' | 'saved'
type EnclosureListFilter = 'all' | 'active' | 'unused' | 'most-used'

const fallbackCenter: LngLatLike = [11.35, 46.5]
const southTyrolBaseMapLayerId = 'south-tyrol-basemap'
const southTyrolBaseMapSourceId = 'south-tyrol-basemap-source'
const southTyrolOrthoLayerId = 'south-tyrol-orthophoto-2023'
const southTyrolOrthoSourceId = 'south-tyrol-orthophoto-2023-source'

const southTyrolBaseMapTiles = [
  'https://geoservices.buergernetz.bz.it/mapproxy/ows?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=p_bz-BaseMap:Basemap-Standard&STYLES=&CRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&FORMAT=image/png',
]

const southTyrolOrthoTiles = [
  'https://geoservices.buergernetz.bz.it/mapproxy/ows?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=p_bz-Orthoimagery:Aerial-2023-RGB&STYLES=&CRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&FORMAT=image/jpeg',
]

const rasterStyle: StyleSpecification = {
  version: 8,
  sources: {
    [southTyrolBaseMapSourceId]: {
      type: 'raster' as const,
      tiles: southTyrolBaseMapTiles,
      tileSize: 256,
      attribution: 'Provincia autonoma di Bolzano - BaseMap Suedtirol',
      maxzoom: 20,
    },
  },
  layers: [
    {
      id: southTyrolBaseMapLayerId,
      type: 'raster' as const,
      source: southTyrolBaseMapSourceId,
    },
  ],
}

const emptyFeatureCollection: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
}

function formatAccuracy(accuracy: number) {
  if (!Number.isFinite(accuracy)) return 'unbekannt'
  return `${Math.round(accuracy)} m`
}

function formatTimestamp(timestamp: number) {
  return new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(timestamp)
}

function formatPointTimestamp(timestamp: number) {
  return new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(timestamp)
}

function formatArea(areaM2: number) {
  if (!Number.isFinite(areaM2) || areaM2 <= 0) return '0 m² · 0,00 ha'
  return `${Math.round(areaM2)} m² · ${(areaM2 / 10_000).toFixed(2)} ha`
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'unbekannt'
  return new Date(value).toLocaleString('de-DE')
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'unbekannt'
  return new Date(value).toLocaleDateString('de-DE')
}

function formatDurationFromIso(startTime: string | null | undefined, endTime?: string | null) {
  if (!startTime) return 'unbekannt'

  const startMs = new Date(startTime).getTime()
  const endMs = new Date(endTime ?? nowIso()).getTime()

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return 'unbekannt'
  }

  const totalMinutes = Math.round((endMs - startMs) / 1000 / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours <= 0) return `${minutes} min`
  return `${hours} h ${String(minutes).padStart(2, '0')} min`
}

function getDurationSecondsFromIso(
  startTime: string | null | undefined,
  endTime?: string | null
) {
  if (!startTime) return 0

  const startMs = new Date(startTime).getTime()
  const endMs = new Date(endTime ?? nowIso()).getTime()

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return 0
  }

  return Math.max(0, Math.round((endMs - startMs) / 1000))
}

function formatDurationSeconds(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds))
  const totalMinutes = Math.round(safeSeconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours <= 0) return `${minutes} min`
  return `${hours} h ${String(minutes).padStart(2, '0')} min`
}

function getEffectiveHerdCount(herd: Herd | undefined, animals: Animal[]) {
  const activeAnimalsCount = animals.filter((animal) => !animal.isArchived).length
  if (activeAnimalsCount > 0) return activeAnimalsCount
  return herd?.fallbackCount ?? null
}

function haversineDistanceM(from: PositionData, to: PositionData) {
  const earthRadiusM = 6_371_000
  const toRadians = (value: number) => (value * Math.PI) / 180

  const dLat = toRadians(to.latitude - from.latitude)
  const dLon = toRadians(to.longitude - from.longitude)
  const lat1 = toRadians(from.latitude)
  const lat2 = toRadians(to.latitude)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusM * c
}

function getPositionDecision(
  previousPosition: PositionData | null,
  nextPosition: PositionData,
  gpsAccuracyThresholdM: number,
  gpsMinTimeS: number,
  gpsMinDistanceM: number
): PositionDecision {
  if (nextPosition.accuracy > gpsAccuracyThresholdM) {
    return { accepted: false, reason: 'accuracy' }
  }

  if (!previousPosition) {
    return { accepted: true, reason: 'initial' }
  }

  const timeDiffS = (nextPosition.timestamp - previousPosition.timestamp) / 1000
  if (timeDiffS < gpsMinTimeS) {
    return { accepted: false, reason: 'time' }
  }

  const distanceM = haversineDistanceM(previousPosition, nextPosition)
  if (distanceM < gpsMinDistanceM) {
    return { accepted: false, reason: 'distance' }
  }

  return { accepted: true, reason: 'accepted' }
}

function buildDraftFeatureCollection(points: DraftPoint[]): GeoJSON.FeatureCollection {
  if (points.length === 0) {
    return emptyFeatureCollection
  }

  const pointFeatures: GeoJSON.Feature<GeoJSON.Point>[] = points.map((point, index) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [point.lon, point.lat],
    },
    properties: {
      index: index + 1,
    },
  }))

  const features: GeoJSON.Feature[] = [...pointFeatures]

  if (points.length >= 2) {
    features.unshift({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: points.map((point) => [point.lon, point.lat]),
      },
      properties: {
        kind: 'draft-line',
      },
    })
  }

  if (points.length >= 3) {
    const ring = points.map((point) => [point.lon, point.lat])
    ring.push([points[0].lon, points[0].lat])

    features.unshift({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [ring],
      },
      properties: {
        kind: 'draft-polygon',
      },
    })
  }

  return {
    type: 'FeatureCollection',
    features,
  }
}

function buildSavedFeatureCollection(enclosures: Enclosure[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: enclosures
      .filter(
        (enclosure): enclosure is Enclosure & { geometry: GeoJSON.Polygon } =>
          enclosure.geometry !== null
      )
      .map((enclosure) => ({
        type: 'Feature',
        geometry: enclosure.geometry,
        properties: {
          id: enclosure.id,
          name: enclosure.name,
          areaHa: enclosure.areaHa,
          areaM2: enclosure.areaM2,
        },
      })),
  }
}

function buildSurveyAreaFeatureCollection(
  surveyAreas: SurveyArea[]
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: surveyAreas.map((surveyArea) => ({
      type: 'Feature',
      geometry: surveyArea.geometry,
      properties: {
        id: surveyArea.id,
        name: surveyArea.name,
        areaHa: surveyArea.areaHa,
        areaM2: surveyArea.areaM2,
      },
    })),
  }
}

function buildWalkFeatureCollection(points: PositionData[]): GeoJSON.FeatureCollection {
  if (points.length === 0) {
    return emptyFeatureCollection
  }

  const pointFeatures: GeoJSON.Feature<GeoJSON.Point>[] = points.map((point, index) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [point.longitude, point.latitude],
    },
    properties: {
      index: index + 1,
    },
  }))

  const features: GeoJSON.Feature[] = [...pointFeatures]

  if (points.length >= 2) {
    features.unshift({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: points.map((point) => [point.longitude, point.latitude]),
      },
      properties: {
        kind: 'walk-line',
      },
    })
  }

  if (points.length >= 3) {
    const ring = points.map((point) => [point.longitude, point.latitude])
    ring.push([points[0].longitude, points[0].latitude])

    features.unshift({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [ring],
      },
      properties: {
        kind: 'walk-polygon',
      },
    })
  }

  return {
    type: 'FeatureCollection',
    features,
  }
}

function getDraftPolygon(points: DraftPoint[]) {
  if (points.length < 3) return null

  const coordinates = points.map((point) => [point.lon, point.lat] as [number, number])
  coordinates.push([points[0].lon, points[0].lat])

  return polygon([coordinates])
}

function buildSelectedFeatureCollection(
  enclosure: Enclosure | null
): GeoJSON.FeatureCollection {
  if (!enclosure?.geometry) {
    return emptyFeatureCollection
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: enclosure.geometry,
        properties: {
          id: enclosure.id,
          name: enclosure.name,
        },
      },
    ],
  }
}

function getBoundsFromPolygon(geometry: GeoJSON.Polygon) {
  const allPoints = geometry.coordinates[0]
  if (allPoints.length === 0) return null

  let minLon = allPoints[0][0]
  let minLat = allPoints[0][1]
  let maxLon = allPoints[0][0]
  let maxLat = allPoints[0][1]

  for (const [lon, lat] of allPoints) {
    minLon = Math.min(minLon, lon)
    minLat = Math.min(minLat, lat)
    maxLon = Math.max(maxLon, lon)
    maxLat = Math.max(maxLat, lat)
  }

  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ] as [[number, number], [number, number]]
}

function getBoundsFromSurveyAreaGeometry(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  const firstPoint = polygons[0]?.[0]?.[0]
  if (!firstPoint) return null

  let minLon = firstPoint[0]
  let minLat = firstPoint[1]
  let maxLon = firstPoint[0]
  let maxLat = firstPoint[1]

  for (const polygonCoordinates of polygons) {
    for (const ring of polygonCoordinates) {
      for (const [lon, lat] of ring) {
        minLon = Math.min(minLon, lon)
        minLat = Math.min(minLat, lat)
        maxLon = Math.max(maxLon, lon)
        maxLat = Math.max(maxLat, lat)
      }
    }
  }

  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ] as [[number, number], [number, number]]
}

function buildTrackpointsFeatureCollection(trackpoints: TrackPoint[]): GeoJSON.FeatureCollection {
  if (trackpoints.length === 0) {
    return emptyFeatureCollection
  }

  const sorted = [...trackpoints].sort((left, right) => left.seq - right.seq)

  const pointFeatures: GeoJSON.Feature<GeoJSON.Point>[] = sorted.map((point, index) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [point.lon, point.lat],
    },
    properties: {
      index: index + 1,
    },
  }))

  const features: GeoJSON.Feature[] = [...pointFeatures]

  if (sorted.length >= 2) {
    features.unshift({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: sorted.map((point) => [point.lon, point.lat]),
      },
      properties: {
        kind: 'stored-walk-line',
      },
    })
  }

  return {
    type: 'FeatureCollection',
    features,
  }
}

function buildSelectedWalkPointFeatureCollection(
  point: PositionData | null,
  index: number | null
): GeoJSON.FeatureCollection {
  if (!point || index === null) {
    return emptyFeatureCollection
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [point.longitude, point.latitude],
        },
        properties: {
          index: index + 1,
        },
      },
    ],
  }
}

function getWalkTrackSummary(trackpoints: TrackPoint[]): WalkTrackSummary {
  if (trackpoints.length === 0) {
    return {
      count: 0,
      avgAccuracyM: null,
      firstTimestamp: null,
      lastTimestamp: null,
    }
  }

  const sorted = [...trackpoints].sort((left, right) => left.seq - right.seq)
  const accuracies = sorted
    .map((point) => point.accuracyM)
    .filter((accuracy): accuracy is number => typeof accuracy === 'number')

  return {
    count: sorted.length,
    avgAccuracyM:
      accuracies.length > 0
        ? accuracies.reduce((sum, accuracy) => sum + accuracy, 0) / accuracies.length
        : null,
    firstTimestamp: sorted[0]?.timestamp ?? null,
    lastTimestamp: sorted[sorted.length - 1]?.timestamp ?? null,
  }
}

function getBoundsFromTrackpoints(trackpoints: TrackPoint[]) {
  if (trackpoints.length === 0) return null

  let minLon = trackpoints[0].lon
  let minLat = trackpoints[0].lat
  let maxLon = trackpoints[0].lon
  let maxLat = trackpoints[0].lat

  for (const point of trackpoints) {
    minLon = Math.min(minLon, point.lon)
    minLat = Math.min(minLat, point.lat)
    maxLon = Math.max(maxLon, point.lon)
    maxLat = Math.max(maxLat, point.lat)
  }

  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ] as [[number, number], [number, number]]
}

function getBoundsFromWalkPoints(points: PositionData[]) {
  if (points.length === 0) return null

  let minLon = points[0].longitude
  let minLat = points[0].latitude
  let maxLon = points[0].longitude
  let maxLat = points[0].latitude

  for (const point of points) {
    minLon = Math.min(minLon, point.longitude)
    minLat = Math.min(minLat, point.latitude)
    maxLon = Math.max(maxLon, point.longitude)
    maxLat = Math.max(maxLat, point.latitude)
  }

  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ] as [[number, number], [number, number]]
}

export function LivePositionMap() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markerRef = useRef<Marker | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const isDrawingRef = useRef(false)
  const isWalkingRef = useRef(false)
  const enclosuresRef = useRef<Enclosure[]>([])
  const settingsRef = useRef(defaultAppSettings)
  const acceptedPositionRef = useRef<PositionData | null>(null)
  const walkEnclosureIdRef = useRef<string | null>(null)
  const walkSeqRef = useRef(0)
  const walkLastTimestampRef = useRef<number | null>(null)
  const editingEnclosureIdRef = useRef<string | null>(null)
  const selectedEditPointIndexRef = useRef<number | null>(null)
  const isAddingEditPointRef = useRef(false)
  const appendWalkPointRef = useRef<(nextPosition: PositionData) => Promise<void>>(async () => {})
  const openEnclosureDetailsRef = useRef<(enclosureId: string) => void>(() => {})

  const enclosures = useLiveQuery(
    () => db.enclosures.orderBy('updatedAt').reverse().toArray(),
    []
  )
  const surveyAreas = useLiveQuery(
    () => db.surveyAreas.orderBy('updatedAt').reverse().toArray(),
    []
  )

  const [gpsState, setGpsState] = useState<GpsState>('idle')
  const [position, setPosition] = useState<PositionData | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [draftPoints, setDraftPoints] = useState<DraftPoint[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [walkPoints, setWalkPoints] = useState<PositionData[]>([])
  const [isWalking, setIsWalking] = useState(false)
  const [walkName, setWalkName] = useState('')
  const [walkNotes, setWalkNotes] = useState('')
  const [walkError, setWalkError] = useState('')
  const [isWalkSaving, setIsWalkSaving] = useState(false)
  const [selectedWalkPointIndex, setSelectedWalkPointIndex] = useState<number | null>(null)
  const [selectedEnclosureId, setSelectedEnclosureId] = useState<string | null>(null)
  const [showSelectedTrack, setShowSelectedTrack] = useState(false)
  const [isSelectedEnclosureInfoOpen, setIsSelectedEnclosureInfoOpen] = useState(false)
  const [expandedSavedEnclosureId, setExpandedSavedEnclosureId] = useState<string | null>(null)
  const [isWalkPointsOpen, setIsWalkPointsOpen] = useState(false)
  const [editingEnclosureId, setEditingEnclosureId] = useState<string | null>(null)
  const [isLiveStatusOpen, setIsLiveStatusOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editError, setEditError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editGeometryPoints, setEditGeometryPoints] = useState<DraftPoint[]>([])
  const [selectedEditPointIndex, setSelectedEditPointIndex] = useState<number | null>(null)
  const [isAddingEditPoint, setIsAddingEditPoint] = useState(false)
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('draw')
  const [isBaseLayerMenuOpen, setIsBaseLayerMenuOpen] = useState(false)
  const [showSurveyAreas, setShowSurveyAreas] = useState(true)
  const [selectedSurveyAreaId, setSelectedSurveyAreaId] = useState<string | null>(null)
  const [enclosureListFilter, setEnclosureListFilter] = useState<EnclosureListFilter>('all')
  const [assignmentEditorEnclosureId, setAssignmentEditorEnclosureId] = useState<string | null>(null)
  const [assignmentHerdId, setAssignmentHerdId] = useState('')
  const [assignmentCount, setAssignmentCount] = useState('')
  const [assignmentNotes, setAssignmentNotes] = useState('')
  const [assignmentError, setAssignmentError] = useState('')
  const [isAssignmentSaving, setIsAssignmentSaving] = useState(false)
  const [endingAssignmentId, setEndingAssignmentId] = useState<string | null>(null)
  const [baseLayer, setBaseLayer] = useState<MapBaseLayer>('south-tyrol-orthophoto-2023')
  const [prefetchStatus, setPrefetchStatus] = useState('')
  const [prefetchingMapArea, setPrefetchingMapArea] = useState(false)
  const [lastPositionDecision, setLastPositionDecision] = useState<PositionDecision | null>(
    null
  )

  const settings = useLiveQuery(() => db.settings.get('app'), [])
  const herds = useLiveQuery(() => db.herds.orderBy('name').toArray(), [])
  const animals = useLiveQuery(() => db.animals.toArray(), [])
  const assignments = useLiveQuery(
    () => db.enclosureAssignments.orderBy('updatedAt').reverse().toArray(),
    []
  )
  const selectedTrackpoints = useLiveQuery(async () => {
    if (!selectedEnclosureId) return []
    return db.trackpoints
      .where('enclosureWalkId')
      .equals(selectedEnclosureId)
      .sortBy('seq')
  }, [selectedEnclosureId])

  const safeEnclosures = useMemo(() => enclosures ?? [], [enclosures])
  const safeSurveyAreas = useMemo(() => surveyAreas ?? [], [surveyAreas])
  const safeHerds = useMemo(() => herds ?? [], [herds])
  const safeAnimals = useMemo(() => animals ?? [], [animals])
  const safeAssignments = useMemo(() => assignments ?? [], [assignments])
  const safeSelectedTrackpoints = useMemo(
    () => selectedTrackpoints ?? [],
    [selectedTrackpoints]
  )
  const hasLoadedSettingsRef = useRef(false)

  useEffect(() => {
    enclosuresRef.current = safeEnclosures
  }, [safeEnclosures])

  useEffect(() => {
    editingEnclosureIdRef.current = editingEnclosureId
  }, [editingEnclosureId])

  useEffect(() => {
    selectedEditPointIndexRef.current = selectedEditPointIndex
  }, [selectedEditPointIndex])

  useEffect(() => {
    isAddingEditPointRef.current = isAddingEditPoint
  }, [isAddingEditPoint])

  useEffect(() => {
    settingsRef.current = settings ?? defaultAppSettings
  }, [settings])

  useEffect(() => {
    if (hasLoadedSettingsRef.current) return
    if (settings === undefined) return

    hasLoadedSettingsRef.current = true

    if (!settings) {
      void db.settings.put(defaultAppSettings)
      return
    }

    setBaseLayer(normalizeMapBaseLayer(settings.mapBaseLayer))
  }, [settings])

  const draftFeatureCollection = useMemo(
    () => buildDraftFeatureCollection(draftPoints),
    [draftPoints]
  )

  const walkFeatureCollection = useMemo(
    () => buildWalkFeatureCollection(walkPoints),
    [walkPoints]
  )

  const savedFeatureCollection = useMemo(
    () => buildSavedFeatureCollection(safeEnclosures),
    [safeEnclosures]
  )
  const surveyAreaFeatureCollection = useMemo(
    () => buildSurveyAreaFeatureCollection(safeSurveyAreas),
    [safeSurveyAreas]
  )

  const selectedEnclosure = useMemo(
    () =>
      selectedEnclosureId
        ? safeEnclosures.find((enclosure) => enclosure.id === selectedEnclosureId) ?? null
        : null,
    [safeEnclosures, selectedEnclosureId]
  )

  const selectedSurveyArea = useMemo(
    () =>
      selectedSurveyAreaId
        ? safeSurveyAreas.find((surveyArea) => surveyArea.id === selectedSurveyAreaId) ?? null
        : null,
    [safeSurveyAreas, selectedSurveyAreaId]
  )

  const selectedFeatureCollection = useMemo(
    () => buildSelectedFeatureCollection(selectedEnclosure),
    [selectedEnclosure]
  )

  const selectedTrackFeatureCollection = useMemo(
    () => buildTrackpointsFeatureCollection(safeSelectedTrackpoints),
    [safeSelectedTrackpoints]
  )

  const selectedTrackSummary = useMemo(
    () => getWalkTrackSummary(safeSelectedTrackpoints),
    [safeSelectedTrackpoints]
  )

  const herdsById = useMemo(
    () => new Map(safeHerds.map((herd) => [herd.id, herd])),
    [safeHerds]
  )

  const animalsByHerdId = useMemo(() => {
    const map = new Map<string, Animal[]>()

    safeAnimals.forEach((animal) => {
      const currentAnimals = map.get(animal.herdId) ?? []
      currentAnimals.push(animal)
      map.set(animal.herdId, currentAnimals)
    })

    return map
  }, [safeAnimals])

  const activeAssignmentsByEnclosureId = useMemo(() => {
    const map = new Map<string, EnclosureAssignment>()

    safeAssignments.forEach((assignment) => {
      if (!assignment.endTime && !map.has(assignment.enclosureId)) {
        map.set(assignment.enclosureId, assignment)
      }
    })

    return map
  }, [safeAssignments])

  const assignmentHistoryByEnclosureId = useMemo(() => {
    const map = new Map<string, EnclosureAssignment[]>()

    safeAssignments.forEach((assignment) => {
      const currentAssignments = map.get(assignment.enclosureId) ?? []
      currentAssignments.push(assignment)
      map.set(assignment.enclosureId, currentAssignments)
    })

    return map
  }, [safeAssignments])

  const enclosureStatsById = useMemo(() => {
    const map = new Map<
      string,
      {
        totalAssignments: number
        totalDurationS: number
        averageCount: number | null
        lastEndTime: string | null
        uniqueHerdsCount: number
      }
    >()

    safeEnclosures.forEach((enclosure) => {
      const history = assignmentHistoryByEnclosureId.get(enclosure.id) ?? []
      const totalDurationS = history.reduce(
        (sum, assignment) =>
          sum + getDurationSecondsFromIso(assignment.startTime, assignment.endTime),
        0
      )

      const counts = history
        .map((assignment) => {
          if (typeof assignment.count === 'number') return assignment.count

          const herd = herdsById.get(assignment.herdId)
          return getEffectiveHerdCount(
            herd,
            animalsByHerdId.get(assignment.herdId) ?? []
          )
        })
        .filter((count): count is number => typeof count === 'number')

      const uniqueHerdsCount = new Set(history.map((assignment) => assignment.herdId)).size

      map.set(enclosure.id, {
        totalAssignments: history.length,
        totalDurationS,
        averageCount:
          counts.length > 0
            ? Math.round(counts.reduce((sum, count) => sum + count, 0) / counts.length)
            : null,
        lastEndTime:
          history
            .map((assignment) => assignment.endTime ?? assignment.startTime ?? null)
            .filter((value): value is string => Boolean(value))
            .sort()
            .at(-1) ?? null,
        uniqueHerdsCount,
      })
    })

    return map
  }, [animalsByHerdId, assignmentHistoryByEnclosureId, herdsById, safeEnclosures])

  const filteredEnclosures = useMemo(() => {
    const withMeta = safeEnclosures.map((enclosure) => {
      const stats = enclosureStatsById.get(enclosure.id)
      const activeAssignment = activeAssignmentsByEnclosureId.get(enclosure.id)

      return {
        enclosure,
        stats,
        activeAssignment,
      }
    })

    switch (enclosureListFilter) {
      case 'active':
        return withMeta
          .filter((item) => Boolean(item.activeAssignment))
          .sort((left, right) => right.enclosure.updatedAt.localeCompare(left.enclosure.updatedAt))
      case 'unused':
        return withMeta
          .filter((item) => (item.stats?.totalAssignments ?? 0) === 0)
          .sort((left, right) => left.enclosure.name.localeCompare(right.enclosure.name, 'de'))
      case 'most-used':
        return withMeta.sort((left, right) => {
          const assignmentsDiff =
            (right.stats?.totalAssignments ?? 0) - (left.stats?.totalAssignments ?? 0)
          if (assignmentsDiff !== 0) return assignmentsDiff

          const durationDiff =
            (right.stats?.totalDurationS ?? 0) - (left.stats?.totalDurationS ?? 0)
          if (durationDiff !== 0) return durationDiff

          return left.enclosure.name.localeCompare(right.enclosure.name, 'de')
        })
      case 'all':
      default:
        return withMeta.sort((left, right) =>
          right.enclosure.updatedAt.localeCompare(left.enclosure.updatedAt)
        )
    }
  }, [activeAssignmentsByEnclosureId, enclosureListFilter, enclosureStatsById, safeEnclosures])

  const selectedWalkPoint = useMemo(
    () =>
      selectedWalkPointIndex !== null
        ? walkPoints[selectedWalkPointIndex] ?? null
        : null,
    [selectedWalkPointIndex, walkPoints]
  )

  const selectedWalkPointFeatureCollection = useMemo(
    () =>
      buildSelectedWalkPointFeatureCollection(selectedWalkPoint, selectedWalkPointIndex),
    [selectedWalkPoint, selectedWalkPointIndex]
  )

  const editFeatureCollection = useMemo(
    () => buildDraftFeatureCollection(editGeometryPoints),
    [editGeometryPoints]
  )

  const draftAreaM2 = useMemo(() => {
    const draftPolygon = getDraftPolygon(draftPoints)
    return draftPolygon ? area(draftPolygon) : 0
  }, [draftPoints])

  const editAreaM2 = useMemo(() => {
    const editPolygon = getDraftPolygon(editGeometryPoints)
    return editPolygon ? area(editPolygon) : 0
  }, [editGeometryPoints])

  const walkAreaM2 = useMemo(() => {
    if (walkPoints.length < 3) return 0

    const coordinates = walkPoints.map(
      (point) => [point.longitude, point.latitude] as [number, number]
    )
    coordinates.push([walkPoints[0].longitude, walkPoints[0].latitude])

    return area(polygon([coordinates]))
  }, [walkPoints])

  useEffect(() => {
    let cancelled = false

    async function setupMap() {
      if (!containerRef.current || mapRef.current) return

      const maplibre = await import('maplibre-gl')
      if (cancelled || !containerRef.current) return

      const map = new maplibre.Map({
        container: containerRef.current,
        style: rasterStyle,
        center: fallbackCenter,
        zoom: 11,
        attributionControl: false,
      })

      map.addControl(new maplibre.NavigationControl(), 'top-right')
      map.addControl(
        new maplibre.AttributionControl({
          compact:
            typeof window !== 'undefined'
              ? window.matchMedia('(max-width: 768px)').matches
              : false,
        }),
        'bottom-right'
      )

      map.on('load', () => {
        if (cancelled) return

        map.addSource('saved-enclosures', {
          type: 'geojson',
          data: emptyFeatureCollection,
        })

        map.addSource('survey-areas', {
          type: 'geojson',
          data: emptyFeatureCollection,
        })

        map.addLayer({
          id: 'survey-areas-fill',
          type: 'fill',
          source: 'survey-areas',
          paint: {
            'fill-color': '#7c3aed',
            'fill-opacity': 0.1,
          },
        })

        map.addLayer({
          id: 'survey-areas-line',
          type: 'line',
          source: 'survey-areas',
          paint: {
            'line-color': '#6d28d9',
            'line-width': 2,
            'line-dasharray': [2, 2],
          },
        })

        map.addLayer({
          id: 'saved-enclosures-fill',
          type: 'fill',
          source: 'saved-enclosures',
          paint: {
            'fill-color': '#15803d',
            'fill-opacity': 0.18,
          },
        })

        map.addLayer({
          id: 'saved-enclosures-line',
          type: 'line',
          source: 'saved-enclosures',
          paint: {
            'line-color': '#166534',
            'line-width': 2,
          },
        })

        map.addSource(southTyrolOrthoSourceId, {
          type: 'raster',
          tiles: southTyrolOrthoTiles,
          tileSize: 256,
          attribution: 'Provincia autonoma di Bolzano - Orthofoto 2023 (20 cm)',
        })

        map.addLayer({
          id: southTyrolOrthoLayerId,
          type: 'raster',
          source: southTyrolOrthoSourceId,
          layout: {
            visibility: 'visible',
          },
          paint: {
            'raster-opacity': 1,
          },
        })

        map.addSource('selected-enclosure', {
          type: 'geojson',
          data: emptyFeatureCollection,
        })

        map.addLayer({
          id: 'selected-enclosure-fill',
          type: 'fill',
          source: 'selected-enclosure',
          paint: {
            'fill-color': '#f59e0b',
            'fill-opacity': 0.2,
          },
        })

        map.addLayer({
          id: 'selected-enclosure-line',
          type: 'line',
          source: 'selected-enclosure',
          paint: {
            'line-color': '#d97706',
            'line-width': 4,
          },
        })

        map.addSource('draft-enclosure', {
          type: 'geojson',
          data: emptyFeatureCollection,
        })

        map.addLayer({
          id: 'draft-enclosure-fill',
          type: 'fill',
          source: 'draft-enclosure',
          paint: {
            'fill-color': '#2563eb',
            'fill-opacity': 0.16,
          },
          filter: ['==', '$type', 'Polygon'],
        })

        map.addLayer({
          id: 'draft-enclosure-line',
          type: 'line',
          source: 'draft-enclosure',
          paint: {
            'line-color': '#1d4ed8',
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
            'circle-color': '#1d4ed8',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
          filter: ['==', '$type', 'Point'],
        })

        map.addSource('edit-enclosure', {
          type: 'geojson',
          data: emptyFeatureCollection,
        })

        map.addLayer({
          id: 'edit-enclosure-fill',
          type: 'fill',
          source: 'edit-enclosure',
          paint: {
            'fill-color': '#0891b2',
            'fill-opacity': 0.14,
          },
          filter: ['==', '$type', 'Polygon'],
        })

        map.addLayer({
          id: 'edit-enclosure-line',
          type: 'line',
          source: 'edit-enclosure',
          paint: {
            'line-color': '#0f766e',
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
            'circle-color': '#0f766e',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff',
          },
          filter: ['==', '$type', 'Point'],
        })

        map.addLayer({
          id: 'edit-enclosure-touch-target',
          type: 'circle',
          source: 'edit-enclosure',
          paint: {
            'circle-radius': 18,
            'circle-color': '#ffffff',
            'circle-opacity': 0.01,
          },
          filter: ['==', '$type', 'Point'],
        })

        map.addSource('walk-track', {
          type: 'geojson',
          data: emptyFeatureCollection,
        })

        map.addLayer({
          id: 'walk-track-fill',
          type: 'fill',
          source: 'walk-track',
          paint: {
            'fill-color': '#ea580c',
            'fill-opacity': 0.14,
          },
          filter: ['==', '$type', 'Polygon'],
        })

        map.addLayer({
          id: 'walk-track-line',
          type: 'line',
          source: 'walk-track',
          paint: {
            'line-color': '#f97316',
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
            'circle-color': '#f97316',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
          filter: ['==', '$type', 'Point'],
        })

        map.addSource('selected-walk-point', {
          type: 'geojson',
          data: emptyFeatureCollection,
        })

        map.addLayer({
          id: 'selected-walk-point',
          type: 'circle',
          source: 'selected-walk-point',
          paint: {
            'circle-radius': 8,
            'circle-color': '#111827',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#fbbf24',
          },
          filter: ['==', '$type', 'Point'],
        })

        map.addSource('selected-walk-track', {
          type: 'geojson',
          data: emptyFeatureCollection,
        })

        map.addLayer({
          id: 'selected-walk-track-line',
          type: 'line',
          source: 'selected-walk-track',
          paint: {
            'line-color': '#7c3aed',
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
            'circle-color': '#7c3aed',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
          filter: ['==', '$type', 'Point'],
        })

        setMapReady(true)
      })

      map.on('click', (event: MapMouseEvent) => {
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
      })

      map.on('click', 'saved-enclosures-fill', (event) => {
        const clickedFeature = event.features?.[0]
        const enclosureId = clickedFeature?.properties?.id

        if (typeof enclosureId === 'string') {
          openEnclosureDetailsRef.current(enclosureId)
        }
      })

      map.on('click', 'selected-enclosure-fill', (event) => {
        const clickedFeature = event.features?.[0]
        const enclosureId = clickedFeature?.properties?.id

        if (typeof enclosureId === 'string') {
          openEnclosureDetailsRef.current(enclosureId)
        }
      })

      map.on('click', 'walk-track-points', (event) => {
        const clickedFeature = event.features?.[0]
        const pointIndex = Number(clickedFeature?.properties?.index)

        if (Number.isInteger(pointIndex) && pointIndex >= 1) {
          setSelectedWalkPointIndex(pointIndex - 1)
        }
      })

      map.on('click', 'edit-enclosure-touch-target', (event) => {
        const clickedFeature = event.features?.[0]
        const pointIndex = Number(clickedFeature?.properties?.index)

        if (Number.isInteger(pointIndex) && pointIndex >= 1) {
          setSelectedEditPointIndex(pointIndex - 1)
        }
      })

      map.on('mouseenter', 'saved-enclosures-fill', () => {
        map.getCanvas().style.cursor = 'pointer'
      })

      map.on('mouseleave', 'saved-enclosures-fill', () => {
        map.getCanvas().style.cursor = ''
      })

      map.on('mouseenter', 'selected-enclosure-fill', () => {
        map.getCanvas().style.cursor = 'pointer'
      })

      map.on('mouseleave', 'selected-enclosure-fill', () => {
        map.getCanvas().style.cursor = ''
      })

      map.on('mouseenter', 'walk-track-points', () => {
        map.getCanvas().style.cursor = 'pointer'
      })

      map.on('mouseleave', 'walk-track-points', () => {
        map.getCanvas().style.cursor = ''
      })

      map.on('mouseenter', 'edit-enclosure-touch-target', () => {
        map.getCanvas().style.cursor = 'pointer'
      })

      map.on('mouseleave', 'edit-enclosure-touch-target', () => {
        map.getCanvas().style.cursor = ''
      })

      mapRef.current = map
      markerRef.current = new maplibre.Marker({
        color: '#111827',
      })
    }

    setupMap()

    return () => {
      cancelled = true
      markerRef.current?.remove()
      markerRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGpsState('unsupported')
      return
    }

    setGpsState('requesting')

    const watchId = navigator.geolocation.watchPosition(
      (nextPosition) => {
        const next: PositionData = {
          latitude: nextPosition.coords.latitude,
          longitude: nextPosition.coords.longitude,
          accuracy: nextPosition.coords.accuracy,
          timestamp: nextPosition.timestamp,
        }

        const currentSettings = settingsRef.current
        const decision = getPositionDecision(
          acceptedPositionRef.current,
          next,
          currentSettings.gpsAccuracyThresholdM,
          currentSettings.gpsMinTimeS,
          currentSettings.gpsMinDistanceM
        )

        setLastPositionDecision(decision)

        if (!decision.accepted) {
          setGpsState('tracking')
          return
        }

        acceptedPositionRef.current = next
        setPosition(next)
        setGpsState('tracking')

        if (isWalkingRef.current) {
          void appendWalkPointRef.current(next)
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGpsState('denied')
          return
        }

        setGpsState('error')
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 20_000,
      }
    )

    watchIdRef.current = watchId

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const source = mapRef.current?.getSource('saved-enclosures') as GeoJSONSource | undefined
    if (!source) return
    source.setData(savedFeatureCollection)
  }, [savedFeatureCollection])

  useEffect(() => {
    const source = mapRef.current?.getSource('survey-areas') as GeoJSONSource | undefined
    if (!source) return
    source.setData(surveyAreaFeatureCollection)
  }, [surveyAreaFeatureCollection])

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
  }, [mapReady, showSurveyAreas])

  useEffect(() => {
    if (selectedSurveyAreaId && !safeSurveyAreas.some((surveyArea) => surveyArea.id === selectedSurveyAreaId)) {
      setSelectedSurveyAreaId(null)
    }
  }, [safeSurveyAreas, selectedSurveyAreaId])

  useEffect(() => {
    const source = mapRef.current?.getSource('draft-enclosure') as GeoJSONSource | undefined
    if (!source) return
    source.setData(draftFeatureCollection)
  }, [draftFeatureCollection])

  useEffect(() => {
    const source = mapRef.current?.getSource('edit-enclosure') as GeoJSONSource | undefined
    if (!source) return
    source.setData(editingEnclosureId ? editFeatureCollection : emptyFeatureCollection)
  }, [editFeatureCollection, editingEnclosureId])

  useEffect(() => {
    const source = mapRef.current?.getSource('walk-track') as GeoJSONSource | undefined
    if (!source) return
    source.setData(walkFeatureCollection)
  }, [walkFeatureCollection])

  useEffect(() => {
    const source = mapRef.current?.getSource('selected-walk-point') as
      | GeoJSONSource
      | undefined
    if (!source) return
    source.setData(selectedWalkPointFeatureCollection)
  }, [selectedWalkPointFeatureCollection])

  useEffect(() => {
    const source = mapRef.current?.getSource('selected-enclosure') as
      | GeoJSONSource
      | undefined
    if (!source) return
    source.setData(selectedFeatureCollection)
  }, [selectedFeatureCollection])

  useEffect(() => {
    const source = mapRef.current?.getSource('selected-walk-track') as
      | GeoJSONSource
      | undefined
    if (!source) return
    source.setData(showSelectedTrack ? selectedTrackFeatureCollection : emptyFeatureCollection)
  }, [selectedTrackFeatureCollection, showSelectedTrack])

  useEffect(() => {
    if (!showSelectedTrack || !mapRef.current || safeSelectedTrackpoints.length === 0) return

    const bounds = getBoundsFromTrackpoints(safeSelectedTrackpoints)
    if (!bounds) return

    mapRef.current.fitBounds(bounds, {
      padding: 50,
      duration: 800,
      maxZoom: 18,
    })
  }, [safeSelectedTrackpoints, showSelectedTrack])

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
  }, [baseLayer, mapReady])

  useEffect(() => {
    if (selectedWalkPointIndex === null) return
    if (selectedWalkPointIndex < walkPoints.length) return
    setSelectedWalkPointIndex(null)
  }, [selectedWalkPointIndex, walkPoints])

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
    if (!settingsRef.current.tileCachingEnabled) {
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

  async function appendWalkPoint(nextPosition: PositionData) {
    const enclosureWalkId = walkEnclosureIdRef.current
    if (!enclosureWalkId) return

    if (walkLastTimestampRef.current === nextPosition.timestamp) {
      return
    }

    walkLastTimestampRef.current = nextPosition.timestamp
    walkSeqRef.current += 1

    const trackPoint: TrackPoint = {
      id: createId('trackpoint'),
      enclosureWalkId,
      sessionId: null,
      seq: walkSeqRef.current,
      timestamp: new Date(nextPosition.timestamp).toISOString(),
      lat: nextPosition.latitude,
      lon: nextPosition.longitude,
      accuracyM: nextPosition.accuracy,
      accepted: true,
    }

    await db.trackpoints.add(trackPoint)

    let nextPoints: PositionData[] = []
    setWalkPoints((currentPoints) => {
      nextPoints = [...currentPoints, nextPosition]
      return nextPoints
    })
    focusWalkPoints(nextPoints)
  }

  useEffect(() => {
    if (!editingEnclosureId) {
      setEditName('')
      setEditNotes('')
      setEditError('')
      setEditGeometryPoints([])
      setSelectedEditPointIndex(null)
      setIsAddingEditPoint(false)
      return
    }

    const enclosure = safeEnclosures.find(
      (currentEnclosure) => currentEnclosure.id === editingEnclosureId
    )

    if (!enclosure) {
      setEditingEnclosureId(null)
      setEditName('')
      setEditNotes('')
      setEditError('')
      setEditGeometryPoints([])
      setSelectedEditPointIndex(null)
      setIsAddingEditPoint(false)
      return
    }

    setEditName(enclosure.name)
    setEditNotes(enclosure.notes ?? '')
    setEditError('')
    setSelectedEditPointIndex(null)
    setIsAddingEditPoint(false)
    setEditGeometryPoints(
      enclosure.geometry
        ? enclosure.geometry.coordinates[0]
            .slice(0, -1)
            .map(([lon, lat]) => ({ lon, lat }))
        : []
    )
  }, [editingEnclosureId, safeEnclosures])

  useEffect(() => {
    if (editingEnclosureId || selectedEnclosureId) {
      setMobilePanel('saved')
      return
    }

    if (isWalking || walkPoints.length > 0) {
      setMobilePanel('walk')
      return
    }

    if (isDrawing || draftPoints.length > 0) {
      setMobilePanel('draw')
    }
  }, [
    draftPoints.length,
    editingEnclosureId,
    isDrawing,
    isWalking,
    selectedEnclosureId,
    walkPoints.length,
  ])

  useEffect(() => {
    if (!mapReady || !position || !mapRef.current || !markerRef.current) return

    const lngLat: LngLatLike = [position.longitude, position.latitude]

    markerRef.current.setLngLat(lngLat).addTo(mapRef.current)

    if (!isDrawing && draftPoints.length === 0) {
      mapRef.current.easeTo({
        center: lngLat,
        zoom: Math.max(mapRef.current.getZoom(), 15),
        duration: 800,
      })
    }
  }, [draftPoints.length, isDrawing, mapReady, position])

  function startDrawing() {
    isDrawingRef.current = true
    setIsDrawing(true)
    setSaveError('')
  }

  function finishDrawing() {
    if (draftPoints.length < 3) {
      setSaveError('Mindestens drei Punkte sind für einen Pferch nötig.')
      return
    }

    isDrawingRef.current = false
    setIsDrawing(false)
    setSaveError('')
  }

  function clearDraft() {
    isDrawingRef.current = false
    setDraftPoints([])
    setIsDrawing(false)
    setSaveError('')
  }

  function undoLastPoint() {
    setDraftPoints((currentPoints) => currentPoints.slice(0, -1))
    setSaveError('')
  }

  async function startWalkMode() {
    const enclosureId = createId('enclosure')

    isWalkingRef.current = true
    walkEnclosureIdRef.current = enclosureId
    walkSeqRef.current = 0
    walkLastTimestampRef.current = null

    setWalkPoints([])
    setWalkError('')
    setIsWalking(true)
    setSelectedWalkPointIndex(null)
    setSelectedEnclosureId(null)
    setEditingEnclosureId(null)

    if (acceptedPositionRef.current) {
      await appendWalkPoint(acceptedPositionRef.current)
    }
  }

  function stopWalkMode() {
    if (walkPoints.length < 3) {
      setWalkError('Mindestens drei akzeptierte GPS-Punkte sind für einen Pferch nötig.')
      return
    }

    isWalkingRef.current = false
    setIsWalking(false)
    setWalkError('')
  }

  async function discardWalkMode() {
    const enclosureWalkId = walkEnclosureIdRef.current

    isWalkingRef.current = false
    setIsWalking(false)
    setWalkPoints([])
    setWalkError('')
    setWalkName('')
    setWalkNotes('')
    setSelectedWalkPointIndex(null)
    walkSeqRef.current = 0
    walkLastTimestampRef.current = null
    walkEnclosureIdRef.current = null

    if (enclosureWalkId) {
      await db.trackpoints.where('enclosureWalkId').equals(enclosureWalkId).delete()
    }
  }

  async function undoLastWalkPoint() {
    await removeWalkPointAtIndex(walkPoints.length - 1)
  }

  async function removeWalkPointAtIndex(pointIndex: number) {
    const enclosureWalkId = walkEnclosureIdRef.current
    if (!enclosureWalkId || walkPoints.length === 0) return
    if (pointIndex < 0 || pointIndex >= walkPoints.length) return

    const walkTrackPoints = await db.trackpoints
      .where('enclosureWalkId')
      .equals(enclosureWalkId)
      .sortBy('seq')

    const trackPointToDelete = walkTrackPoints[pointIndex]
    if (!trackPointToDelete) return

    await db.transaction('rw', db.trackpoints, async () => {
      await db.trackpoints.delete(trackPointToDelete.id)

      const remainingTrackPoints = walkTrackPoints.filter(
        (trackPoint) => trackPoint.id !== trackPointToDelete.id
      )

      await Promise.all(
        remainingTrackPoints.map((trackPoint, index) =>
          db.trackpoints.update(trackPoint.id, {
            seq: index + 1,
          })
        )
      )
    })

    const nextPoints = walkPoints.filter((_, index) => index !== pointIndex)
    setWalkPoints(nextPoints)
    walkSeqRef.current = nextPoints.length
    walkLastTimestampRef.current =
      nextPoints.length > 0 ? nextPoints[nextPoints.length - 1].timestamp : null
    focusWalkPoints(nextPoints)
    setSelectedWalkPointIndex((currentIndex) => {
      if (currentIndex === null) return null
      if (currentIndex === pointIndex) return null
      if (currentIndex > pointIndex) return currentIndex - 1
      return currentIndex
    })

    setWalkError(
      pointIndex === walkPoints.length - 1
        ? 'Letzter Walk-Punkt entfernt.'
        : `Walk-Punkt ${pointIndex + 1} entfernt.`
    )
  }

  function focusEnclosure(enclosure: Enclosure) {
    setSelectedEnclosureId(enclosure.id)
    setShowSelectedTrack(false)

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

  function openEnclosureDetailsById(enclosureId: string) {
    const enclosure = enclosuresRef.current.find(
      (currentEnclosure) => currentEnclosure.id === enclosureId
    )

    if (!enclosure) return

    focusEnclosure(enclosure)
    startEditEnclosure(enclosure)
  }
  appendWalkPointRef.current = appendWalkPoint
  openEnclosureDetailsRef.current = openEnclosureDetailsById

  function startEditEnclosure(enclosure: Enclosure) {
    setSelectedEnclosureId(enclosure.id)
    setShowSelectedTrack(false)
    setEditingEnclosureId(enclosure.id)
  }

  function cancelEditEnclosure() {
    setEditingEnclosureId(null)
    setEditName('')
    setEditNotes('')
    setEditError('')
    setEditGeometryPoints([])
    setSelectedEditPointIndex(null)
    setIsAddingEditPoint(false)
  }

  function startAddEditPoint() {
    setIsAddingEditPoint(true)
    setSelectedEditPointIndex(null)
    setEditError('')
  }

  function openAssignmentEditor(enclosure: Enclosure) {
    setAssignmentEditorEnclosureId(enclosure.id)
    setAssignmentError('')

    const firstActiveHerd = safeHerds.find((herd) => !herd.isArchived) ?? safeHerds[0]
    const nextHerdId = firstActiveHerd?.id ?? ''
    setAssignmentHerdId(nextHerdId)

    const effectiveCount = nextHerdId
      ? getEffectiveHerdCount(firstActiveHerd, animalsByHerdId.get(nextHerdId) ?? [])
      : null

    setAssignmentCount(effectiveCount !== null ? String(effectiveCount) : '')
    setAssignmentNotes('')
  }

  function cancelAssignmentEditor() {
    setAssignmentEditorEnclosureId(null)
    setAssignmentHerdId('')
    setAssignmentCount('')
    setAssignmentNotes('')
    setAssignmentError('')
  }

  async function assignHerdToEnclosure(enclosure: Enclosure) {
    const activeAssignment = activeAssignmentsByEnclosureId.get(enclosure.id)
    if (activeAssignment) {
      setAssignmentError('Dieser Pferch ist bereits aktiv belegt.')
      return
    }

    const herd = herdsById.get(assignmentHerdId)
    if (!herd) {
      setAssignmentError('Bitte eine Herde für die Zuweisung wählen.')
      return
    }

    const parsedCount =
      assignmentCount.trim() === '' ? null : Number.parseInt(assignmentCount.trim(), 10)

    if (parsedCount !== null && (!Number.isFinite(parsedCount) || parsedCount < 0)) {
      setAssignmentError('Tierzahl muss leer oder eine gültige Zahl sein.')
      return
    }

    setIsAssignmentSaving(true)
    setAssignmentError('')

    try {
      const timestamp = nowIso()

      await db.transaction('rw', db.enclosureAssignments, db.enclosures, async () => {
        await db.enclosureAssignments.add({
          id: createId('enclosure_assignment'),
          enclosureId: enclosure.id,
          herdId: herd.id,
          count: parsedCount,
          startTime: timestamp,
          endTime: null,
          notes: assignmentNotes.trim() || undefined,
          createdAt: timestamp,
          updatedAt: timestamp,
        })

        await db.enclosures.update(enclosure.id, {
          herdId: herd.id,
          updatedAt: timestamp,
        })
      })

      cancelAssignmentEditor()
      setSelectedEnclosureId(enclosure.id)
    } catch (error) {
      setAssignmentError(
        error instanceof Error ? error.message : 'Zuweisung konnte nicht gespeichert werden.'
      )
    } finally {
      setIsAssignmentSaving(false)
    }
  }

  async function endEnclosureAssignment(assignment: EnclosureAssignment) {
    setEndingAssignmentId(assignment.id)
    setAssignmentError('')

    try {
      const timestamp = nowIso()

      await db.transaction('rw', db.enclosureAssignments, db.enclosures, async () => {
        await db.enclosureAssignments.update(assignment.id, {
          endTime: timestamp,
          updatedAt: timestamp,
        })

        await db.enclosures.update(assignment.enclosureId, {
          herdId: null,
          updatedAt: timestamp,
        })
      })
    } catch (error) {
      setAssignmentError(
        error instanceof Error ? error.message : 'Ausweisung konnte nicht gespeichert werden.'
      )
    } finally {
      setEndingAssignmentId(null)
    }
  }

  function removeSelectedEditPoint() {
    if (selectedEditPointIndex === null) return

    if (editGeometryPoints.length <= 3) {
      setEditError('Ein Pferch braucht mindestens drei Punkte.')
      return
    }

    setEditGeometryPoints((currentPoints) =>
      currentPoints.filter((_, index) => index !== selectedEditPointIndex)
    )
    setSelectedEditPointIndex(null)
    setIsAddingEditPoint(false)
    setEditError('')
  }

  async function persistEditedEnclosure() {
    if (!editingEnclosureId) return

    const currentEnclosure =
      safeEnclosures.find((enclosure) => enclosure.id === editingEnclosureId) ?? null
    if (!currentEnclosure) {
      setEditError('Pferch konnte nicht gefunden werden.')
      return false
    }

    const cleanedName = editName.trim()
    if (!cleanedName) {
      setEditError('Bitte einen Namen für den Pferch vergeben.')
      return false
    }

    const editPolygon = getDraftPolygon(editGeometryPoints)
    if (!editPolygon) {
      setEditError('Mindestens drei Punkte sind für den Pferch nötig.')
      return false
    }

    setIsEditing(true)
    setEditError('')

    try {
      const timestamp = nowIso()
      await db.enclosures.update(editingEnclosureId, {
        name: cleanedName,
        geometry: editPolygon.geometry,
        areaM2: editAreaM2,
        areaHa: editAreaM2 / 10_000,
        pointsCount: editGeometryPoints.length,
        notes: editNotes.trim() || undefined,
        updatedAt: timestamp,
      })

      setEditingEnclosureId(null)
      setSelectedEnclosureId(editingEnclosureId)
      return true
    } catch {
      setEditError('Pferch konnte nicht aktualisiert werden.')
      return false
    } finally {
      setIsEditing(false)
    }
  }

  async function saveEditedEnclosure(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await persistEditedEnclosure()
  }

  async function deleteEnclosure(enclosure: Enclosure) {
    const confirmed = window.confirm(
      `Pferch "${enclosure.name}" wirklich lokal löschen?`
    )

    if (!confirmed) return

    await db.enclosures.delete(enclosure.id)
    await db.trackpoints.where('enclosureWalkId').equals(enclosure.id).delete()

    if (selectedEnclosureId === enclosure.id) {
      setSelectedEnclosureId(null)
    }

    if (editingEnclosureId === enclosure.id) {
      cancelEditEnclosure()
    }
  }

  async function saveWalkEnclosure(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const enclosureId = walkEnclosureIdRef.current
    const cleanedName = walkName.trim()

    if (!enclosureId) {
      setWalkError('Kein aktiver Ablauf vorhanden.')
      return
    }

    if (isWalking) {
      setWalkError('Ablaufen zuerst beenden, dann speichern.')
      return
    }

    if (!cleanedName) {
      setWalkError('Bitte einen Namen für den abgelaufenen Pferch vergeben.')
      return
    }

    if (walkPoints.length < 3) {
      setWalkError('Es fehlen noch genug akzeptierte GPS-Punkte.')
      return
    }

    const coordinates = walkPoints.map(
      (point) => [point.longitude, point.latitude] as [number, number]
    )
    coordinates.push([walkPoints[0].longitude, walkPoints[0].latitude])

    setIsWalkSaving(true)
    setWalkError('')

    try {
      const timestamp = nowIso()
      const averageAccuracy =
        walkPoints.reduce((sum, point) => sum + point.accuracy, 0) / walkPoints.length

      const enclosure: Enclosure = {
        id: enclosureId,
        name: cleanedName,
        method: 'walk',
        geometry: {
          type: 'Polygon',
          coordinates: [coordinates],
        },
        areaM2: walkAreaM2,
        areaHa: walkAreaM2 / 10_000,
        notes: walkNotes.trim() || undefined,
        pointsCount: walkPoints.length,
        avgAccuracyM: averageAccuracy,
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      await db.enclosures.put(enclosure)

      setSelectedEnclosureId(enclosure.id)
      setWalkPoints([])
      setWalkName('')
      setWalkNotes('')
      setSelectedWalkPointIndex(null)
      setIsWalking(false)
      isWalkingRef.current = false
      walkEnclosureIdRef.current = null
      walkSeqRef.current = 0
      walkLastTimestampRef.current = null
    } catch {
      setWalkError('Abgelaufener Pferch konnte nicht gespeichert werden.')
    } finally {
      setIsWalkSaving(false)
    }
  }

  async function saveEnclosure(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const cleanedName = name.trim()
    if (!cleanedName) {
      setSaveError('Bitte einen Namen für den Pferch vergeben.')
      return
    }

    const draftPolygon = getDraftPolygon(draftPoints)
    if (!draftPolygon) {
      setSaveError('Es fehlt noch ein gültiges Polygon.')
      return
    }

    setIsSaving(true)
    setSaveError('')

    try {
      const timestamp = nowIso()
      const enclosureId = createId('enclosure')

      const enclosure: Enclosure = {
        id: enclosureId,
        name: cleanedName,
        method: 'draw',
        geometry: draftPolygon.geometry,
        areaM2: draftAreaM2,
        areaHa: draftAreaM2 / 10_000,
        notes: notes.trim() || undefined,
        pointsCount: draftPoints.length,
        avgAccuracyM: position?.accuracy ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      await db.enclosures.add(enclosure)

      isDrawingRef.current = false
      setName('')
      setNotes('')
      setDraftPoints([])
      setIsDrawing(false)
    } catch {
      setSaveError('Pferch konnte nicht gespeichert werden.')
    } finally {
      setIsSaving(false)
    }
  }

  const gpsLabel =
    gpsState === 'tracking'
      ? 'GPS aktiv'
      : gpsState === 'requesting'
        ? 'GPS wird angefragt'
        : gpsState === 'denied'
          ? 'GPS nicht erlaubt'
          : gpsState === 'unsupported'
            ? 'GPS nicht verfügbar'
            : gpsState === 'error'
              ? 'GPS Fehler'
              : 'GPS bereit'

  const gpsAccuracySuffix = position
    ? ` Letzte Genauigkeit: ${formatAccuracy(position.accuracy)}.`
    : ''

  const gpsDetail =
    gpsState === 'tracking' && position
      ? `Genauigkeit ca. ${formatAccuracy(position.accuracy)}`
      : gpsState === 'denied'
        ? `Standortfreigabe im Browser oder auf dem Gerät aktivieren.${gpsAccuracySuffix}`
        : gpsState === 'unsupported'
          ? `Dieses Gerät unterstützt keine Geolocation.${gpsAccuracySuffix}`
          : gpsState === 'error'
            ? `Standort konnte nicht ermittelt werden.${gpsAccuracySuffix}`
            : `Warte auf Standortdaten.${gpsAccuracySuffix}`

  const gpsFilterDetail =
    lastPositionDecision?.accepted === false
      ? lastPositionDecision.reason === 'accuracy'
        ? `Letzter Punkt verworfen: Genauigkeit schlechter als ${settingsRef.current.gpsAccuracyThresholdM} m.`
        : lastPositionDecision.reason === 'time'
          ? `Letzter Punkt verworfen: Mindestzeit von ${settingsRef.current.gpsMinTimeS} s noch nicht erreicht.`
          : `Letzter Punkt verworfen: Mindestdistanz von ${settingsRef.current.gpsMinDistanceM} m noch nicht erreicht.`
      : lastPositionDecision?.accepted
        ? 'Letzter Punkt wurde für Karte und Tracking akzeptiert.'
        : 'GPS-Filter noch ohne Entscheidung.'

  const drawStatusText = isDrawing
    ? 'Jeder Tap auf die Karte setzt einen neuen Punkt.'
    : 'Zeichnen starten und die Ecken direkt auf der Karte setzen.'

  const drawControls = (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      <button
        type="button"
        onClick={startDrawing}
        className="rounded-[1.1rem] border border-[#5a5347] bg-[#f1efeb] px-3 py-3 text-sm font-semibold text-[#17130f] disabled:opacity-50 sm:px-4 sm:py-4"
        disabled={isDrawing}
      >
        Start
      </button>
      <button
        type="button"
        onClick={finishDrawing}
        className="rounded-[1.1rem] bg-[#f1efeb] px-3 py-3 text-sm font-semibold text-neutral-950 disabled:opacity-50 sm:px-4 sm:py-4"
        disabled={!isDrawing}
      >
        Ende
      </button>
      <button
        type="button"
        onClick={undoLastPoint}
        className="rounded-[1.1rem] bg-[#f1efeb] px-3 py-3 text-sm font-semibold text-neutral-950 disabled:opacity-50 sm:px-4 sm:py-4"
        disabled={draftPoints.length === 0}
      >
        Letzter Punkt
      </button>
      <button
        type="button"
        onClick={clearDraft}
        className="rounded-[1.1rem] bg-[#f1efeb] px-3 py-3 text-sm font-semibold text-neutral-950 disabled:opacity-50 sm:px-4 sm:py-4"
        disabled={draftPoints.length === 0}
      >
        Verwerfen
      </button>
    </div>
  )

  const drawSummary = (
    <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm text-neutral-800 shadow-sm">
      Punkte gesetzt: <span className="font-medium text-neutral-900">{draftPoints.length}</span>
      <span className="ml-2">
        · Fläche <span className="font-medium text-neutral-900">{formatArea(draftAreaM2)}</span>
      </span>
    </div>
  )

  const drawSaveForm = (
    <form className="mt-4 space-y-4" onSubmit={saveEnclosure}>
      <div>
        <label className="mb-1 block text-sm font-medium">Pferchname</label>
        <input
          className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="z. B. Nordhang 1"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Notiz</label>
        <textarea
          className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="optionale Bemerkungen zum Pferch"
        />
      </div>

      {saveError ? (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSaving || draftPoints.length < 3}
        className="w-full rounded-2xl border border-[#5a5347] bg-[#f1efeb] px-4 py-4 font-medium text-[#17130f] disabled:opacity-50"
      >
        {isSaving ? 'Speichert ...' : 'Pferch speichern'}
      </button>
    </form>
  )

  const drawWorkspaceContent = (
    <>
      <p className="mt-2 text-sm text-neutral-700">{drawStatusText}</p>
      <div className="mt-4">{drawControls}</div>
      <div className="mt-4">{drawSummary}</div>
      {drawSaveForm}
    </>
  )

  const walkStatusText = isWalking
    ? 'GPS-Aufnahme laeuft. Punkte werden direkt auf der Karte markiert.'
    : 'Walk starten und den Pferch mit GPS-Punkten abgehen.'

  const walkControls = (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      <button
        type="button"
        onClick={() => void startWalkMode()}
        className="rounded-[1.1rem] border border-[#5a5347] bg-[#f1efeb] px-3 py-3 text-sm font-semibold text-[#17130f] disabled:opacity-50 sm:px-4 sm:py-4"
        disabled={isWalking || isDrawing}
      >
        Start
      </button>
      <button
        type="button"
        onClick={stopWalkMode}
        className="rounded-[1.1rem] bg-[#f1efeb] px-3 py-3 text-sm font-semibold text-neutral-950 disabled:opacity-50 sm:px-4 sm:py-4"
        disabled={!isWalking}
      >
        Ende
      </button>
      <button
        type="button"
        onClick={() => void undoLastWalkPoint()}
        className="rounded-[1.1rem] bg-[#f1efeb] px-3 py-3 text-sm font-semibold text-neutral-950 disabled:opacity-50 sm:px-4 sm:py-4"
        disabled={walkPoints.length === 0}
      >
        Letzter Punkt
      </button>
      <button
        type="button"
        onClick={() =>
          selectedWalkPointIndex !== null
            ? void removeWalkPointAtIndex(selectedWalkPointIndex)
            : undefined
        }
        className="rounded-[1.1rem] bg-[#f1efeb] px-3 py-3 text-sm font-semibold text-neutral-950 disabled:opacity-50 sm:px-4 sm:py-4"
        disabled={selectedWalkPointIndex === null}
      >
        Ausgewählt
      </button>
      <button
        type="button"
        onClick={() => void discardWalkMode()}
        className="col-span-2 rounded-[1.1rem] bg-[#f1efeb] px-3 py-3 text-sm font-semibold text-neutral-950 disabled:opacity-50 sm:px-4 sm:py-4"
        disabled={walkPoints.length === 0 && !isWalking}
      >
        Verwerfen
      </button>
    </div>
  )

  const walkSummary = (
    <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm text-neutral-800 shadow-sm">
      Akzeptierte Walk-Punkte:{' '}
      <span className="font-medium text-neutral-900">{walkPoints.length}</span>
      <span className="ml-2">
        · Fläche <span className="font-medium text-neutral-900">{formatArea(walkAreaM2)}</span>
      </span>
    </div>
  )

  const walkStats = (
    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
      <div className="rounded-2xl bg-neutral-50 px-4 py-3">
        <div className="text-neutral-500">Mittlere Genauigkeit</div>
        <div className="mt-1 font-medium text-neutral-900">
          {walkPoints.length > 0
            ? formatAccuracy(
                walkPoints.reduce((sum, point) => sum + point.accuracy, 0) / walkPoints.length
              )
            : 'noch keine Daten'}
        </div>
      </div>
      <div className="rounded-2xl bg-neutral-50 px-4 py-3">
        <div className="text-neutral-500">Letzter akzeptierter Punkt</div>
        <div className="mt-1 font-medium text-neutral-900">
          {walkPoints.length > 0
            ? formatTimestamp(walkPoints[walkPoints.length - 1].timestamp)
            : 'noch keiner'}
        </div>
      </div>
    </div>
  )

  const walkPointsList = walkPoints.length > 0 ? (
    <div className="mt-4 rounded-2xl bg-neutral-50 px-4 py-3">
      <button
        type="button"
        onClick={() => setIsWalkPointsOpen((current) => !current)}
        aria-expanded={isWalkPointsOpen}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div>
          <h3 className="text-sm font-medium text-neutral-900">Aufgenommene Weidegaenge</h3>
          <p className="mt-1 text-xs text-neutral-500">
            {walkPoints.length} Punkte gespeichert
          </p>
        </div>
        <span className="text-base text-neutral-900">{isWalkPointsOpen ? '−' : '+'}</span>
      </button>

      {isWalkPointsOpen ? (
        <>
          {selectedWalkPoint ? (
            <div className="mt-3 rounded-2xl border border-[#d2cbc0] bg-[#efe4c8] px-3 py-3 text-sm text-[#17130f]">
              Ausgewaehlt: Punkt {selectedWalkPointIndex !== null ? selectedWalkPointIndex + 1 : ''}{' '}
              um {formatPointTimestamp(selectedWalkPoint.timestamp)} mit{' '}
              {formatAccuracy(selectedWalkPoint.accuracy)}.
            </div>
          ) : null}

          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {walkPoints.map((point, index) => (
              <div
                key={`${point.timestamp}-${index}`}
                className={[
                  'grid grid-cols-[1fr_auto] gap-3 rounded-2xl px-3 py-3 text-sm',
                  selectedWalkPointIndex === index ? 'bg-[#efe4c8]' : 'bg-[#fffdf6]',
                ].join(' ')}
              >
                <button
                  type="button"
                  onClick={() => setSelectedWalkPointIndex(index)}
                  className="text-left"
                >
                  <div className="font-medium text-neutral-900">Punkt {index + 1}</div>
                  <div className="mt-1 text-neutral-600">
                    {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    {formatPointTimestamp(point.timestamp)} · Genauigkeit {formatAccuracy(point.accuracy)}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => void removeWalkPointAtIndex(index)}
                  className="rounded-2xl bg-[#fffdf6] px-3 py-2 text-xs font-medium text-neutral-900"
                >
                  Entfernen
                </button>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  ) : null

  const walkSaveForm = (
    <form className="mt-4 space-y-4" onSubmit={saveWalkEnclosure}>
      <div>
        <label className="mb-1 block text-sm font-medium">Pferchname</label>
        <input
          className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
          value={walkName}
          onChange={(event) => setWalkName(event.target.value)}
          placeholder="z. B. Weidekante Ost"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Notiz</label>
        <textarea
          className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
          rows={3}
          value={walkNotes}
          onChange={(event) => setWalkNotes(event.target.value)}
          placeholder="optionale Notiz zum abgelaufenen Pferch"
        />
      </div>

      {walkError ? (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {walkError}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isWalkSaving || walkPoints.length < 3}
        className="w-full rounded-2xl border border-[#5a5347] bg-[#f1efeb] px-4 py-4 font-medium text-[#17130f] disabled:opacity-50"
      >
        {isWalkSaving ? 'Speichert ...' : 'Abgelaufenen Pferch speichern'}
      </button>
    </form>
  )

  const walkWorkspaceContent = (
    <>
      <p className="mt-2 text-sm text-neutral-700">{walkStatusText}</p>
      <p className="mt-2 text-xs font-medium text-neutral-700">
        Walk-Punkte können direkt auf der Karte angetippt und bearbeitet werden.
      </p>
      <div className="mt-4">{walkControls}</div>
      <div className="mt-4">{walkSummary}</div>
      {walkStats}
      {walkPointsList}
      {walkSaveForm}
    </>
  )

  return (
    <section className="space-y-4">
      <div className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsLiveStatusOpen((current) => !current)}
            aria-expanded={isLiveStatusOpen}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-600"
          >
            <span>Live-Status</span>
            <span className="text-sm text-neutral-900">{isLiveStatusOpen ? '−' : '+'}</span>
          </button>
          <div
            className={[
              'rounded-full px-3 py-1.5 text-xs font-semibold',
              gpsState === 'tracking'
                ? 'bg-[#efe4c8] text-[#17130f]'
                : gpsState === 'denied' || gpsState === 'error'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-[#f1efeb] text-stone-900',
            ].join(' ')}
          >
            {gpsLabel}
          </div>
        </div>

        {isLiveStatusOpen ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                GPS
              </div>
              <div className="mt-1 text-sm font-medium text-neutral-900">{gpsDetail}</div>
            </div>
            <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                Filter
              </div>
              <div className="mt-1 text-sm font-medium text-neutral-900">{gpsFilterDetail}</div>
            </div>
            <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                Koordinaten
              </div>
              <div className="mt-1 text-sm font-medium text-neutral-900">
                {position
                  ? `${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`
                  : 'Noch keine Position'}
              </div>
            </div>
            <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                Update
              </div>
              <div className="mt-1 text-sm font-medium text-neutral-900">
                {position ? formatTimestamp(position.timestamp) : 'Warte auf GPS'}
              </div>
            </div>
          </div>
        ) : null}

      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.95fr)] lg:items-start">
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] shadow-[0_18px_40px_rgba(23,20,18,0.08)] lg:sticky lg:top-4">
            <div ref={containerRef} className="h-[420px] w-full bg-[#fffdf6] sm:h-[520px] lg:h-[calc(100vh-8rem)]" />
            {mobilePanel === 'draw' && !editingEnclosureId ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-2 lg:hidden">
                <MobileMapToolbar>
                  <MobileMapToolbarStat>
                    {draftPoints.length} P · {formatArea(draftAreaM2)}
                  </MobileMapToolbarStat>
                  <MobileMapToolbarButton
                    aria-label="Zeichnen starten"
                    title="Zeichnen starten"
                    onClick={startDrawing}
                    disabled={isDrawing}
                    variant="primary"
                    label="Start"
                  >
                    +
                  </MobileMapToolbarButton>
                  <MobileMapToolbarButton
                    aria-label="Zeichnen beenden"
                    title="Zeichnen beenden"
                    onClick={finishDrawing}
                    disabled={!isDrawing}
                    label="Fertig"
                  >
                    ✓
                  </MobileMapToolbarButton>
                  <MobileMapToolbarButton
                    aria-label="Letzten Punkt löschen"
                    title="Letzten Punkt löschen"
                    onClick={undoLastPoint}
                    disabled={draftPoints.length === 0}
                    label="Zurück"
                  >
                    ↶
                  </MobileMapToolbarButton>
                  <MobileMapToolbarButton
                    aria-label="Entwurf verwerfen"
                    title="Entwurf verwerfen"
                    onClick={clearDraft}
                    disabled={draftPoints.length === 0}
                    label="Abbruch"
                  >
                    ×
                  </MobileMapToolbarButton>
                </MobileMapToolbar>
              </div>
            ) : null}
            {mobilePanel === 'walk' && !editingEnclosureId ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-2 lg:hidden">
                <MobileMapToolbar>
                  <MobileMapToolbarStat>
                    {walkPoints.length} P · {formatArea(walkAreaM2)}
                  </MobileMapToolbarStat>
                  <MobileMapToolbarButton
                    aria-label="Walk starten"
                    title="Walk starten"
                    onClick={() => void startWalkMode()}
                    disabled={isWalking || isDrawing}
                    variant="primary"
                    label="Start"
                  >
                    <PlayIcon />
                  </MobileMapToolbarButton>
                  <MobileMapToolbarButton
                    aria-label="Walk beenden"
                    title="Walk beenden"
                    onClick={stopWalkMode}
                    disabled={!isWalking}
                    label="Stop"
                  >
                    <StopIcon />
                  </MobileMapToolbarButton>
                  <MobileMapToolbarButton
                    aria-label="Letzten Walk-Punkt löschen"
                    title="Letzten Walk-Punkt löschen"
                    onClick={() => void undoLastWalkPoint()}
                    disabled={walkPoints.length === 0}
                    label="Zurück"
                  >
                    <UndoIcon />
                  </MobileMapToolbarButton>
                  <MobileMapToolbarButton
                    aria-label="Walk verwerfen"
                    title="Walk verwerfen"
                    onClick={() => void discardWalkMode()}
                    disabled={walkPoints.length === 0 && !isWalking}
                    label="Abbruch"
                  >
                    <CloseIcon />
                  </MobileMapToolbarButton>
                </MobileMapToolbar>
              </div>
            ) : null}
            <MobileMapTopControls>
                <div className="mb-2 flex justify-start gap-2">
                  <button
                    type="button"
                    aria-label="Auf aktuelle Position zentrieren"
                    onClick={centerMapOnPosition}
                    disabled={!position}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ccb98a] bg-[#fffdf6] text-neutral-950 shadow-lg disabled:opacity-50"
                  >
                    <CenterIcon />
                  </button>
                  <button
                    type="button"
                    aria-label="Kartengrundlage wählen"
                    onClick={() => setIsBaseLayerMenuOpen((current) => !current)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ccb98a] bg-[#fffdf6] text-neutral-950 shadow-lg"
                  >
                    <LayersIcon />
                  </button>
                </div>

              {isBaseLayerMenuOpen ? (
                <div className="max-h-[48vh] overflow-y-auto rounded-[1rem] border border-[#ccb98a] bg-[rgba(255,253,246,0.96)] p-1.5 shadow-lg">
                  <div className="mb-1 px-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-700">
                    Kartengrundlage
                  </div>
                  <button
                    type="button"
                    onClick={() => void updateBaseLayer('south-tyrol-orthophoto-2023')}
                    className={[
                      'w-full rounded-xl px-2.5 py-2 text-left text-xs font-medium',
                      baseLayer === 'south-tyrol-orthophoto-2023'
                        ? 'border border-[#5a5347] bg-[#f1efeb] text-[#17130f]'
                        : 'bg-[#f1efeb] text-neutral-950',
                    ].join(' ')}
                  >
                    Orthofoto 2023
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateBaseLayer('south-tyrol-basemap')}
                    className={[
                      'mt-1.5 w-full rounded-xl px-2.5 py-2 text-left text-xs font-medium',
                      baseLayer === 'south-tyrol-basemap'
                        ? 'border border-[#5a5347] bg-[#f1efeb] text-[#17130f]'
                        : 'bg-[#f1efeb] text-neutral-950',
                    ].join(' ')}
                  >
                    BaseMap Südtirol
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSurveyAreas((current) => !current)}
                    className={[
                      'mt-1.5 w-full rounded-xl px-2.5 py-2 text-left text-xs font-medium',
                      showSurveyAreas ? 'bg-[#efe4c8] text-[#17130f]' : 'bg-[#f1efeb] text-neutral-950',
                    ].join(' ')}
                  >
                    Flächen {showSurveyAreas ? 'an' : 'aus'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void prefetchVisibleMapArea()}
                    disabled={prefetchingMapArea}
                    className="mt-1.5 w-full rounded-xl border border-[#ccb98a] bg-[#fffdf6] px-2.5 py-2 text-left text-xs font-medium text-[#17130f] disabled:opacity-50"
                  >
                    {prefetchingMapArea ? 'Sichert ...' : 'Ausschnitt sichern'}
                  </button>
                  {prefetchStatus ? (
                    <div className="mt-1.5 rounded-xl bg-[#f1efeb] px-2.5 py-2 text-[11px] font-medium text-neutral-900">
                    {prefetchStatus}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </MobileMapTopControls>
          </div>
          {editingEnclosureId ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2 sm:p-4">
                <MobileMapFloatingCard>
                  <div className="flex items-center justify-between gap-2 px-1 pb-2 sm:gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-neutral-900 sm:text-sm">
                        Pferch bearbeiten
                      </div>
                      <div className="text-[11px] text-neutral-800 sm:hidden">
                        {isAddingEditPoint
                          ? 'Neuer Punkt: nächster Tap auf Karte.'
                          : selectedEditPointIndex !== null
                            ? `Punkt ${selectedEditPointIndex + 1} aktiv.`
                            : 'Punkt antippen oder Aktion wählen.'}
                      </div>
                      <div className="mt-1 hidden text-xs text-neutral-800 sm:block">
                        {isAddingEditPoint
                          ? 'Nächster Kartenklick setzt einen neuen Punkt.'
                          : selectedEditPointIndex !== null
                            ? `Punkt ${selectedEditPointIndex + 1} ist zum Verschieben ausgewählt.`
                            : 'Punkt antippen und neu setzen oder unten Aktion wählen.'}
                      </div>
                    </div>
                    <div className="shrink-0 rounded-full border border-[#ccb98a] bg-[#fffdf6] px-2 py-1 text-[11px] font-medium text-[#17130f] sm:px-3 sm:text-xs">
                      {editGeometryPoints.length} Punkte
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={startAddEditPoint}
                      className="rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-2 py-2.5 text-xs font-medium text-[#17130f] sm:px-3 sm:py-3 sm:text-sm"
                    >
                      Punkt +
                    </button>
                    <button
                      type="button"
                      onClick={removeSelectedEditPoint}
                      disabled={selectedEditPointIndex === null || editGeometryPoints.length <= 3}
                      className="rounded-2xl bg-[#f1efeb] px-2 py-2.5 text-xs font-semibold text-neutral-950 disabled:opacity-50 sm:px-3 sm:py-3 sm:text-sm"
                    >
                      Punkt -
                    </button>
                    <button
                      type="button"
                      onClick={() => void persistEditedEnclosure()}
                      disabled={isEditing}
                      className="rounded-2xl border border-[#5a5347] bg-[#f1efeb] px-2 py-2.5 text-xs font-semibold text-[#17130f] disabled:opacity-50 sm:px-3 sm:py-3 sm:text-sm"
                    >
                      {isEditing ? '...' : 'Speichern'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditEnclosure}
                      className="rounded-2xl bg-[#f1efeb] px-2 py-2.5 text-xs font-semibold text-neutral-950 sm:px-3 sm:py-3 sm:text-sm"
                    >
                      Schließen
                    </button>
                  </div>
                </MobileMapFloatingCard>
              </div>
            ) : null}
          <MobileMapSegmentedControl>
              <MobileMapSegmentButton
                onClick={() => setMobilePanel('draw')}
                active={mobilePanel === 'draw'}
              >
                Zeichnen
              </MobileMapSegmentButton>
              <MobileMapSegmentButton
                onClick={() => setMobilePanel('walk')}
                active={mobilePanel === 'walk'}
              >
                Walk
              </MobileMapSegmentButton>
              <MobileMapSegmentButton
                onClick={() => setMobilePanel('saved')}
                active={mobilePanel === 'saved'}
              >
                Pferche
              </MobileMapSegmentButton>
          </MobileMapSegmentedControl>

          <div className={mobilePanel === 'draw' ? 'lg:hidden' : 'hidden'}>
            <MobileMapSectionCard>
              <h2 className="text-lg font-semibold">Pferch zeichnen</h2>
              <p className="mt-2 text-sm text-neutral-700">
                Die Zeichenwerkzeuge liegen direkt auf der Karte. Name und Notiz werden hier ergänzt.
              </p>
              <div className="mt-4">{drawSummary}</div>
              {drawSaveForm}
            </MobileMapSectionCard>
          </div>

          <div className={mobilePanel === 'walk' ? 'lg:hidden' : 'hidden'}>
            <MobileMapSectionCard>
              <h2 className="text-lg font-semibold">Pferch per GPS erfassen</h2>
              <p className="mt-2 text-sm text-neutral-700">{walkStatusText}</p>
              <div className="mt-4">{walkSummary}</div>
              {walkStats}
              {walkPointsList}
              {walkSaveForm}
            </MobileMapSectionCard>
          </div>

          <div className={mobilePanel === 'saved' ? 'lg:hidden' : 'hidden'}>
            <div className="rounded-[1.4rem] border-2 border-[#3a342a] bg-[#fff8ea] p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Gespeicherte Pferche</h2>
                <span className="text-sm text-neutral-500">{filteredEnclosures.length}</span>
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium">Pferch wählen</label>
                <select
                  className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
                  value={selectedEnclosureId ?? ''}
                  onChange={(event) => {
                    const nextId = event.target.value
                    if (!nextId) {
                      setSelectedEnclosureId(null)
                      setShowSelectedTrack(false)
                      setIsSelectedEnclosureInfoOpen(false)
                      return
                    }

                    const nextEnclosure =
                      safeEnclosures.find((enclosure) => enclosure.id === nextId) ?? null
                    if (!nextEnclosure) return

                    focusEnclosure(nextEnclosure)
                    setIsSelectedEnclosureInfoOpen(true)
                  }}
                >
                  <option value="">Bitte wählen</option>
                  {filteredEnclosures.map(({ enclosure }) => (
                    <option key={enclosure.id} value={enclosure.id}>
                      {enclosure.name}
                    </option>
                  ))}
                </select>
              </div>

              {filteredEnclosures.length === 0 ? (
                <p className="mt-3 text-sm text-neutral-600">
                  Für diesen Filter gibt es aktuell keine Pferche.
                </p>
              ) : null}

              {selectedEnclosure ? (
                <div className="mt-4 rounded-2xl border border-[#d2cbc0] bg-[#efe4c8] px-4 py-3 text-sm text-[#17130f]">
                  <button
                    type="button"
                    onClick={() => setIsSelectedEnclosureInfoOpen((current) => !current)}
                    aria-expanded={isSelectedEnclosureInfoOpen}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <span>
                      Fokus: <span className="font-medium">{selectedEnclosure.name}</span>
                    </span>
                    <span className="text-base text-[#17130f]">
                      {isSelectedEnclosureInfoOpen ? '−' : '+'}
                    </span>
                  </button>
                  {isSelectedEnclosureInfoOpen ? (
                    <>
                      <div className="mt-2">
                        {formatArea(selectedEnclosure.areaM2)} · {selectedEnclosure.pointsCount ?? 0} Punkte
                      </div>
                      {selectedEnclosure.notes ? (
                        <div className="mt-1 text-[#4f473c]">{selectedEnclosure.notes}</div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              ) : null}

              {selectedEnclosure?.method === 'walk' ? (
                <button
                  type="button"
                  onClick={() => setShowSelectedTrack((current) => !current)}
                  className="mt-4 w-full rounded-2xl bg-[#fffdf6] px-4 py-3 text-sm font-medium text-neutral-900"
                >
                  {showSelectedTrack ? 'Spur ausblenden' : 'Spur anzeigen'}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div
            className={[
              'rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)]',
              'hidden lg:block',
            ].join(' ')}
          >
            <h2 className="text-lg font-semibold">Zeichenwerkzeuge</h2>
            {drawWorkspaceContent}
          </div>

          <div
            className={[
              'rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)]',
              'hidden lg:block',
            ].join(' ')}
          >
            <h2 className="text-lg font-semibold">Pferch per GPS erfassen</h2>
            {walkWorkspaceContent}
          </div>

          <div
            className={[
              'rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(40,34,26,0.08)]',
              mobilePanel !== 'saved' ? 'hidden lg:block' : '',
            ].join(' ')}
          >
            <div className="rounded-2xl bg-[#fffdf6] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Untersuchungsflächen</h2>
                <span className="text-sm text-neutral-500">{safeSurveyAreas.length}</span>
              </div>
              <p className="mt-2 text-sm text-neutral-700">
                Importierte Kontroll- oder Untersuchungsflächen können hier fokussiert und auf der Karte ein- oder ausgeblendet werden.
              </p>

              {selectedSurveyArea ? (
                <div className="mt-3 rounded-2xl border border-[#d2cbc0] bg-[#efe4c8] px-4 py-3 text-sm text-[#17130f]">
                  Fokus: <span className="font-medium">{selectedSurveyArea.name}</span> ·{' '}
                  {formatArea(selectedSurveyArea.areaM2)}
                </div>
              ) : null}

              {safeSurveyAreas.length === 0 ? (
                <p className="mt-3 text-sm text-neutral-600">
                  Noch keine Untersuchungsflächen importiert.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {safeSurveyAreas.slice(0, 8).map((surveyArea) => (
                    <div
                      key={surveyArea.id}
                      className={[
                        'rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-3 py-3',
                        selectedSurveyAreaId === surveyArea.id
                          ? 'border-[#d2cbc0] bg-[#efe4c8]'
                          : 'border-[#ccb98a] bg-[#fffdf6]',
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-neutral-900">{surveyArea.name}</div>
                          <div className="mt-1 text-xs text-neutral-600">
                            {formatArea(surveyArea.areaM2)} · {formatDate(surveyArea.updatedAt)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => focusSurveyArea(surveyArea)}
                          className="rounded-full border border-[#ccb98a] bg-[#fffdf6] px-3 py-2 text-xs font-semibold text-neutral-950 shadow-sm"
                        >
                          Fokus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Gespeicherte Pferche</h2>
              <span className="text-sm text-neutral-500">{filteredEnclosures.length}</span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { id: 'all', label: 'Alle' },
                { id: 'active', label: 'Aktiv belegt' },
                { id: 'unused', label: 'Ohne Nutzung' },
                { id: 'most-used', label: 'Meist genutzt' },
              ].map((filterOption) => (
                <button
                  key={filterOption.id}
                  type="button"
                  onClick={() => setEnclosureListFilter(filterOption.id as EnclosureListFilter)}
                  className={[
                    'rounded-2xl px-3 py-3 text-sm font-medium',
                    enclosureListFilter === filterOption.id
                      ? 'border border-[#5a5347] bg-[#f1efeb] text-[#17130f]'
                      : 'bg-[#f1efeb] text-neutral-950',
                  ].join(' ')}
                >
                  {filterOption.label}
                </button>
              ))}
            </div>

            {selectedEnclosure ? (
              <div className="mt-4 rounded-2xl border border-[#d2cbc0] bg-[#efe4c8] px-4 py-3 text-sm text-[#17130f]">
                Fokus: <span className="font-medium">{selectedEnclosure.name}</span>. Auf
                ein Polygon in der Karte tippen, um die Bearbeitung direkt zu öffnen.
              </div>
            ) : null}

            {filteredEnclosures.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-600">
                Für diesen Filter gibt es aktuell keine Pferche.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {filteredEnclosures.map(({ enclosure }) => (
              <div
                key={enclosure.id}
                className={[
                  'rounded-2xl px-4 py-3',
                  selectedEnclosureId === enclosure.id ? 'bg-[#efe4c8]' : 'bg-neutral-50',
                ].join(' ')}
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedSavedEnclosureId((current) =>
                      current === enclosure.id ? null : enclosure.id
                    )
                  }
                  aria-expanded={expandedSavedEnclosureId === enclosure.id}
                  className="flex w-full items-start justify-between gap-3 text-left"
                >
                  <div>
                    <div className="font-medium text-neutral-900">{enclosure.name}</div>
                    <div className="mt-1 text-sm text-neutral-600">
                      {formatArea(enclosure.areaM2)} · {enclosure.pointsCount ?? 0} Punkte
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs text-neutral-500">
                      {new Date(enclosure.updatedAt).toLocaleDateString('de-DE')}
                    </div>
                    <div className="mt-1 text-base text-neutral-900">
                      {expandedSavedEnclosureId === enclosure.id ? '−' : '+'}
                    </div>
                  </div>
                </button>
                {expandedSavedEnclosureId === enclosure.id && enclosure.notes ? (
                  <p className="mt-2 text-sm text-neutral-600">{enclosure.notes}</p>
                ) : null}

                {expandedSavedEnclosureId === enclosure.id &&
                (() => {
                  const activeAssignment = activeAssignmentsByEnclosureId.get(enclosure.id)
                  const assignmentHistory =
                    assignmentHistoryByEnclosureId.get(enclosure.id)?.slice(0, 4) ?? []
                  const enclosureStats = enclosureStatsById.get(enclosure.id)
                  const activeHerd = activeAssignment
                    ? herdsById.get(activeAssignment.herdId)
                    : null
                  const effectiveCurrentCount =
                    activeAssignment && activeHerd
                      ? activeAssignment.count ??
                        getEffectiveHerdCount(
                          activeHerd,
                          animalsByHerdId.get(activeHerd.id) ?? []
                        )
                      : null

                  return (
                    <div className="mt-3 space-y-3">
                      <div className="rounded-2xl bg-[#fffdf6] px-4 py-3 text-sm text-neutral-800">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-600">
                          Auswertung
                        </div>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <div className="rounded-[1rem] border border-[#ccb98a] bg-[#fffdf6] px-3 py-3">
                            <div className="text-xs font-medium text-neutral-600">Nutzungen</div>
                            <div className="mt-1 text-base font-semibold text-neutral-950">
                              {enclosureStats?.totalAssignments ?? 0}
                            </div>
                          </div>
                          <div className="rounded-[1rem] border border-[#ccb98a] bg-[#fffdf6] px-3 py-3">
                            <div className="text-xs font-medium text-neutral-600">Gesamtdauer</div>
                            <div className="mt-1 text-base font-semibold text-neutral-950">
                              {formatDurationSeconds(enclosureStats?.totalDurationS ?? 0)}
                            </div>
                          </div>
                          <div className="rounded-[1rem] border border-[#ccb98a] bg-[#fffdf6] px-3 py-3">
                            <div className="text-xs font-medium text-neutral-600">Herden</div>
                            <div className="mt-1 text-base font-semibold text-neutral-950">
                              {enclosureStats?.uniqueHerdsCount ?? 0}
                            </div>
                          </div>
                          <div className="rounded-[1rem] border border-[#ccb98a] bg-[#fffdf6] px-3 py-3">
                            <div className="text-xs font-medium text-neutral-600">Ø Besatz</div>
                            <div className="mt-1 text-base font-semibold text-neutral-950">
                              {enclosureStats?.averageCount ?? 'unbekannt'}
                            </div>
                          </div>
                        </div>
                        {enclosureStats?.lastEndTime ? (
                          <div className="mt-2 text-xs text-neutral-700">
                            Letzte Nutzung:{' '}
                            <span className="font-medium text-neutral-900">
                              {formatDateTime(enclosureStats.lastEndTime)}
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <div className="rounded-2xl bg-[#fffdf6] px-4 py-3 text-sm text-neutral-700">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                          Belegung
                        </div>
                        {activeAssignment && activeHerd ? (
                          <div className="mt-2">
                            <div className="font-medium text-neutral-900">{activeHerd.name}</div>
                            <div className="mt-1">
                              Seit{' '}
                              <span className="font-medium text-neutral-900">
                                {formatDateTime(activeAssignment.startTime)}
                              </span>
                            </div>
                            <div className="mt-1">
                              Verweildauer{' '}
                              <span className="font-medium text-neutral-900">
                                {formatDurationFromIso(activeAssignment.startTime)}
                              </span>
                            </div>
                            <div className="mt-1">
                              Besatz{' '}
                              <span className="font-medium text-neutral-900">
                                {effectiveCurrentCount ?? 'unbekannt'}
                              </span>
                            </div>
                            {activeAssignment.notes ? (
                              <div className="mt-1 text-neutral-600">{activeAssignment.notes}</div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="mt-2 text-neutral-600">Aktuell keiner Herde zugewiesen.</div>
                        )}
                      </div>

                      {activeAssignment ? (
                        <button
                          type="button"
                          onClick={() => void endEnclosureAssignment(activeAssignment)}
                          disabled={endingAssignmentId === activeAssignment.id}
                          className="w-full rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-[#17130f] disabled:opacity-50"
                        >
                          {endingAssignmentId === activeAssignment.id
                            ? 'Weist aus ...'
                            : 'Herde ausweisen'}
                        </button>
                      ) : assignmentEditorEnclosureId === enclosure.id ? (
                        <div className="rounded-2xl bg-[#fffdf6] px-4 py-4">
                          <div className="text-sm font-medium text-neutral-900">Herde zuweisen</div>
                          <div className="mt-3 space-y-3">
                            <div>
                              <label className="mb-1 block text-sm font-medium">Herde</label>
                              <select
                                className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
                                value={assignmentHerdId}
                                onChange={(event) => {
                                  const nextHerdId = event.target.value
                                  const nextHerd = herdsById.get(nextHerdId)
                                  const effectiveCount = nextHerd
                                    ? getEffectiveHerdCount(
                                        nextHerd,
                                        animalsByHerdId.get(nextHerdId) ?? []
                                      )
                                    : null

                                  setAssignmentHerdId(nextHerdId)
                                  setAssignmentCount(
                                    effectiveCount !== null ? String(effectiveCount) : ''
                                  )
                                }}
                              >
                                <option value="">Bitte wählen</option>
                                {safeHerds
                                  .filter((herd) => !herd.isArchived)
                                  .map((herd) => (
                                    <option key={herd.id} value={herd.id}>
                                      {herd.name}
                                    </option>
                                  ))}
                              </select>
                            </div>

                            <div>
                              <label className="mb-1 block text-sm font-medium">Tierzahl</label>
                              <input
                                type="number"
                                min="0"
                                inputMode="numeric"
                                className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
                                value={assignmentCount}
                                onChange={(event) => setAssignmentCount(event.target.value)}
                                placeholder="automatisch aus Herde"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-sm font-medium">Notiz</label>
                              <textarea
                                className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
                                rows={2}
                                value={assignmentNotes}
                                onChange={(event) => setAssignmentNotes(event.target.value)}
                                placeholder="optionale Bemerkung zur Belegung"
                              />
                            </div>

                            {assignmentError ? (
                              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                                {assignmentError}
                              </div>
                            ) : null}

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => void assignHerdToEnclosure(enclosure)}
                                disabled={isAssignmentSaving || !assignmentHerdId}
                                className="rounded-2xl border border-[#5a5347] bg-[#f1efeb] px-4 py-3 text-sm font-medium text-[#17130f] disabled:opacity-50"
                              >
                                {isAssignmentSaving ? 'Speichert ...' : 'Zuweisen'}
                              </button>
                              <button
                                type="button"
                                onClick={cancelAssignmentEditor}
                                className="rounded-2xl bg-[#fffdf6] px-4 py-3 text-sm font-medium text-neutral-900"
                              >
                                Abbrechen
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openAssignmentEditor(enclosure)}
                          className="w-full rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-[#17130f]"
                        >
                          Herde zuweisen
                        </button>
                      )}

                      {assignmentHistory.length > 0 ? (
                        <div className="rounded-2xl bg-[#fffdf6] px-4 py-3 text-sm text-neutral-700">
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                            Letzte Aufenthalte
                          </div>
                          <div className="mt-2 space-y-2">
                            {assignmentHistory.map((assignment) => {
                              const herd = herdsById.get(assignment.herdId)
                              const count =
                                assignment.count ??
                                getEffectiveHerdCount(
                                  herd,
                                  animalsByHerdId.get(assignment.herdId) ?? []
                                )

                              return (
                                <div
                                  key={assignment.id}
                                  className="rounded-2xl bg-neutral-50 px-3 py-3"
                                >
                                  <div className="font-medium text-neutral-900">
                                    {herd?.name ?? 'Unbekannte Herde'}
                                  </div>
                                  <div className="mt-1 text-xs text-neutral-600">
                                    {formatDateTime(assignment.startTime)}
                                    {assignment.endTime
                                      ? ` bis ${formatDateTime(assignment.endTime)}`
                                      : ' bis jetzt'}
                                  </div>
                                  <div className="mt-1 text-xs text-neutral-600">
                                    Dauer {formatDurationFromIso(assignment.startTime, assignment.endTime)}
                                    {' '}· Besatz {count ?? 'unbekannt'}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })()}

                {expandedSavedEnclosureId === enclosure.id &&
                selectedEnclosureId === enclosure.id &&
                enclosure.method === 'walk' ? (
                  <div className="mt-3 rounded-2xl bg-[#fffdf6] px-4 py-3 text-sm text-neutral-600">
                    <div>
                      Spurpunkte:{' '}
                      <span className="font-medium text-neutral-900">
                        {selectedTrackSummary.count}
                      </span>
                    </div>
                    <div className="mt-1">
                      Mittlere Genauigkeit:{' '}
                      <span className="font-medium text-neutral-900">
                        {selectedTrackSummary.avgAccuracyM !== null
                          ? formatAccuracy(selectedTrackSummary.avgAccuracyM)
                          : 'unbekannt'}
                      </span>
                    </div>
                    <div className="mt-1">
                      Start:{' '}
                      <span className="font-medium text-neutral-900">
                        {selectedTrackSummary.firstTimestamp
                          ? new Date(selectedTrackSummary.firstTimestamp).toLocaleString('de-DE')
                          : 'unbekannt'}
                      </span>
                    </div>
                    <div className="mt-1">
                      Ende:{' '}
                      <span className="font-medium text-neutral-900">
                        {selectedTrackSummary.lastTimestamp
                          ? new Date(selectedTrackSummary.lastTimestamp).toLocaleString('de-DE')
                          : 'unbekannt'}
                      </span>
                    </div>
                  </div>
                ) : null}

                {expandedSavedEnclosureId === enclosure.id ? (
                <div
                  className={[
                    'mt-3 grid gap-2',
                    enclosure.method === 'walk' ? 'grid-cols-2' : 'grid-cols-3',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    onClick={() => focusEnclosure(enclosure)}
                    className="rounded-2xl bg-[#fffdf6] px-3 py-3 text-sm font-medium text-neutral-900"
                  >
                    Fokussieren
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditEnclosure(enclosure)}
                    className="rounded-2xl bg-[#fffdf6] px-3 py-3 text-sm font-medium text-neutral-900"
                  >
                    Bearbeiten
                  </button>
                  {enclosure.method === 'walk' ? (
                    <button
                      type="button"
                      onClick={() =>
                        setShowSelectedTrack(
                          selectedEnclosureId === enclosure.id ? !showSelectedTrack : true
                        )
                      }
                      className="rounded-2xl bg-[#fffdf6] px-3 py-3 text-sm font-medium text-neutral-900"
                    >
                      {selectedEnclosureId === enclosure.id && showSelectedTrack
                        ? 'Spur ausblenden'
                        : 'Spur zeigen'}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => deleteEnclosure(enclosure)}
                    className="rounded-2xl bg-red-50 px-3 py-3 text-sm font-medium text-red-700"
                    >
                      Löschen
                    </button>
                </div>
                ) : null}

                {expandedSavedEnclosureId === enclosure.id && editingEnclosureId === enclosure.id ? (
                  <form className="mt-4 space-y-3" onSubmit={saveEditedEnclosure}>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Pferchname</label>
                      <input
                        className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">Notiz</label>
                      <textarea
                        className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
                        rows={3}
                        value={editNotes}
                        onChange={(event) => setEditNotes(event.target.value)}
                      />
                    </div>

                    <div className="rounded-2xl border border-[#d2cbc0] bg-[#efe4c8] px-4 py-3 text-sm text-[#17130f]">
                      Punkte auf der Karte antippen und danach die neue Position in der Karte klicken.
                      Mit Hinzufügen setzt der nächste Kartenklick einen neuen Punkt.
                      Aktuell: <span className="font-medium">{editGeometryPoints.length}</span> Punkte
                      {' '}· Fläche {formatArea(editAreaM2)}
                      {selectedEditPointIndex !== null ? (
                        <span>
                          {' '}· Punkt {selectedEditPointIndex + 1} zum Verschieben ausgewählt
                        </span>
                      ) : null}
                      {isAddingEditPoint ? (
                        <span>{' '}· Neuer Punkt wird mit dem nächsten Kartenklick gesetzt</span>
                      ) : null}
                    </div>

                    <div className="hidden grid-cols-2 gap-2 lg:grid">
                      <button
                        type="button"
                        onClick={startAddEditPoint}
                        className="rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-[#17130f]"
                      >
                        Punkt hinzufügen
                      </button>
                      <button
                        type="button"
                        onClick={removeSelectedEditPoint}
                        disabled={selectedEditPointIndex === null || editGeometryPoints.length <= 3}
                        className="rounded-2xl bg-[#fffdf6] px-4 py-3 text-sm font-medium text-neutral-900 disabled:opacity-50"
                      >
                        Ausgewählten Punkt entfernen
                      </button>
                    </div>

                    {editError ? (
                      <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                        {editError}
                      </div>
                    ) : null}

                    <div className="hidden grid-cols-2 gap-2 lg:grid">
                      <button
                        type="submit"
                        disabled={isEditing}
                        className="rounded-2xl border border-[#5a5347] bg-[#f1efeb] px-4 py-4 text-sm font-medium text-[#17130f] disabled:opacity-50"
                      >
                        {isEditing ? 'Speichert ...' : 'Änderungen speichern'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditEnclosure}
                        className="rounded-2xl bg-[#fffdf6] px-4 py-4 text-sm font-medium text-neutral-900"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
