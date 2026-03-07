'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import type * as GeoJSON from 'geojson'
import type {
  GeoJSONSource,
  LngLatLike,
  Map as MapLibreMap,
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
  LayersIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
  TrackpointsIcon,
} from '@/components/maps/map-toolbar-icons'
import {
  MobileMapToolbar,
  MobileMapToolbarButton,
  MobileMapToolbarStat,
} from '@/components/maps/mobile-map-toolbar'
import {
  MobileMapFloatingCard,
  MobileMapTopControls,
} from '@/components/maps/mobile-map-ui'
import { defaultAppSettings, normalizeMapBaseLayer } from '@/lib/settings/defaults'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type {
  GrazingSession,
  Herd,
  MapBaseLayer,
  SessionEvent,
  SessionEventType,
  SessionStatus,
  SurveyArea,
  TrackPoint,
} from '@/types/domain'

type GpsState = 'idle' | 'requesting' | 'tracking' | 'unsupported' | 'denied' | 'error'

type PositionData = {
  latitude: number
  longitude: number
  accuracy: number
  speed: number | null
  heading: number | null
  timestamp: number
}

type PositionDecision =
  | { accepted: true; reason: 'initial' | 'accepted' }
  | { accepted: false; reason: 'accuracy' | 'time' | 'distance' }

type SessionMetrics = {
  durationS: number
  movingTimeS: number
  distanceM: number
  avgSpeedMps: number | null
  avgAccuracyM: number | null
}

type EditableTrackPoint = {
  lat: number
  lon: number
  timestamp: string
  accuracyM: number | null
  speedMps: number | null
  headingDeg: number | null
}

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

function formatAccuracy(accuracy: number | null | undefined) {
  if (typeof accuracy !== 'number' || !Number.isFinite(accuracy)) return 'unbekannt'
  return `${Math.round(accuracy)} m`
}

function formatDistance(distanceM: number) {
  if (!Number.isFinite(distanceM) || distanceM <= 0) return '0 m'
  if (distanceM >= 1000) return `${(distanceM / 1000).toFixed(2)} km`
  return `${Math.round(distanceM)} m`
}

function formatArea(areaM2: number) {
  if (!Number.isFinite(areaM2) || areaM2 <= 0) return '0 m² · 0,00 ha'
  return `${Math.round(areaM2)} m² · ${(areaM2 / 10_000).toFixed(2)} ha`
}

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':')
}

function formatTimestamp(timestamp: number) {
  return new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(timestamp)
}

function formatDateTime(timestamp: string) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function formatDateLabel(timestamp: string) {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(timestamp))
}

function getSessionEventLabel(type: SessionEventType) {
  switch (type) {
    case 'water':
      return 'Wasser'
    case 'rest':
      return 'Rast'
    case 'move':
      return 'Bewegung'
    case 'disturbance':
      return 'Störung'
    case 'note':
      return 'Notiz'
    case 'start':
      return 'Start'
    case 'pause':
      return 'Pause'
    case 'resume':
      return 'Fortsetzen'
    case 'stop':
      return 'Ende'
    default:
      return type
  }
}

function haversineDistanceM(
  from: Pick<PositionData, 'latitude' | 'longitude'>,
  to: Pick<PositionData, 'latitude' | 'longitude'>
) {
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

function buildTrackpointsFeatureCollection(trackpoints: TrackPoint[]): GeoJSON.FeatureCollection {
  if (trackpoints.length === 0) {
    return emptyFeatureCollection
  }

  const sorted = [...trackpoints].sort((left, right) => left.seq - right.seq)

  const pointFeatures: GeoJSON.Feature<GeoJSON.Point>[] = sorted.map((point) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [point.lon, point.lat],
    },
    properties: {
      seq: point.seq,
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
        kind: 'session-line',
      },
    })
  }

  return {
    type: 'FeatureCollection',
    features,
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
      },
    })),
  }
}

function buildSessionEventFeatureCollection(
  sessionEvents: SessionEvent[]
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: sessionEvents
      .filter(
        (sessionEvent): sessionEvent is SessionEvent & { lat: number; lon: number } =>
          typeof sessionEvent.lat === 'number' && typeof sessionEvent.lon === 'number'
      )
      .map((sessionEvent) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [sessionEvent.lon, sessionEvent.lat],
        },
        properties: {
          id: sessionEvent.id,
          type: sessionEvent.type,
          label: getSessionEventLabel(sessionEvent.type),
          timestamp: sessionEvent.timestamp,
          comment: sessionEvent.comment ?? null,
        },
      })),
  }
}

function buildEditableTrackpointsFeatureCollection(
  trackpoints: EditableTrackPoint[]
): GeoJSON.FeatureCollection {
  if (trackpoints.length === 0) {
    return emptyFeatureCollection
  }

  const pointFeatures: GeoJSON.Feature<GeoJSON.Point>[] = trackpoints.map((point, index) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [point.lon, point.lat],
    },
    properties: {
      seq: index + 1,
    },
  }))

  const features: GeoJSON.Feature[] = [...pointFeatures]

  if (trackpoints.length >= 2) {
    features.unshift({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: trackpoints.map((point) => [point.lon, point.lat]),
      },
      properties: {
        kind: 'session-line',
      },
    })
  }

  return {
    type: 'FeatureCollection',
    features,
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

function buildSessionMetrics(
  trackpoints: TrackPoint[],
  startTime: string,
  endTime?: string | null
): SessionMetrics {
  const sorted = [...trackpoints].sort((left, right) => left.seq - right.seq)
  const sessionEnd = endTime ?? nowIso()
  const durationS = Math.max(
    0,
    Math.round((new Date(sessionEnd).getTime() - new Date(startTime).getTime()) / 1000)
  )

  if (sorted.length === 0) {
    return {
      durationS,
      movingTimeS: 0,
      distanceM: 0,
      avgSpeedMps: null,
      avgAccuracyM: null,
    }
  }

  let distanceM = 0
  let movingTimeS = 0

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1]
    const current = sorted[index]
    const segmentDistance = haversineDistanceM(
      { latitude: previous.lat, longitude: previous.lon },
      { latitude: current.lat, longitude: current.lon }
    )
    const timeDiffS = Math.max(
      0,
      Math.round(
        (new Date(current.timestamp).getTime() - new Date(previous.timestamp).getTime()) / 1000
      )
    )

    distanceM += segmentDistance
    movingTimeS += timeDiffS
  }

  const accuracies = sorted
    .map((point) => point.accuracyM)
    .filter((accuracy): accuracy is number => typeof accuracy === 'number')

  return {
    durationS,
    movingTimeS,
    distanceM,
    avgSpeedMps: movingTimeS > 0 ? distanceM / movingTimeS : null,
    avgAccuracyM:
      accuracies.length > 0
        ? accuracies.reduce((sum, accuracy) => sum + accuracy, 0) / accuracies.length
        : null,
  }
}

async function logSessionEvent(
  sessionId: string,
  type: SessionEventType,
  position: PositionData | null,
  comment?: string
) {
  const event: SessionEvent = {
    id: createId('event'),
    sessionId,
    timestamp: nowIso(),
    type,
    lat: position?.latitude ?? null,
    lon: position?.longitude ?? null,
    comment,
  }

  await db.events.add(event)
}

export function GrazingSessionMap() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markerRef = useRef<Marker | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const settingsRef = useRef(defaultAppSettings)
  const acceptedPositionRef = useRef<PositionData | null>(null)
  const currentSessionIdRef = useRef<string | null>(null)
  const currentSessionStatusRef = useRef<SessionStatus | null>(null)
  const currentSessionStartTimeRef = useRef<string | null>(null)
  const currentTrackpointsRef = useRef<TrackPoint[]>([])
  const currentSeqRef = useRef(0)
  const currentLastTimestampRef = useRef<number | null>(null)
  const editingSessionIdRef = useRef<string | null>(null)
  const selectedEditTrackpointIndexRef = useRef<number | null>(null)
  const isAddingEditTrackpointRef = useRef(false)
  const positionAccuracyRef = useRef<number | null>(null)
  const appendSessionPointRef = useRef<(nextPosition: PositionData) => Promise<void>>(
    async () => {}
  )

  const herds = useLiveQuery(() => db.herds.orderBy('name').toArray(), [])
  const surveyAreas = useLiveQuery(
    () => db.surveyAreas.orderBy('updatedAt').reverse().toArray(),
    []
  )
  const settings = useLiveQuery(() => db.settings.get('app'), [])
  const activeSession = useLiveQuery(async () => {
    const sessions = await db.sessions.orderBy('updatedAt').reverse().toArray()
    return (
      sessions.find((session) => session.status === 'active' || session.status === 'paused') ??
      null
    )
  }, [])
  const recentSessions = useLiveQuery(
    () => db.sessions.orderBy('updatedAt').reverse().toArray(),
    []
  )

  const [gpsState, setGpsState] = useState<GpsState>('idle')
  const [position, setPosition] = useState<PositionData | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [baseLayer, setBaseLayer] = useState<MapBaseLayer>('south-tyrol-orthophoto-2023')
  const [isBaseLayerMenuOpen, setIsBaseLayerMenuOpen] = useState(false)
  const [showSurveyAreas, setShowSurveyAreas] = useState(true)
  const [showSessionEventsOnMap, setShowSessionEventsOnMap] = useState(true)
  const [selectedSurveyAreaId, setSelectedSurveyAreaId] = useState<string | null>(null)
  const [prefetchStatus, setPrefetchStatus] = useState('')
  const [prefetchingMapArea, setPrefetchingMapArea] = useState(false)
  const [selectedHerdId, setSelectedHerdId] = useState('')
  const [sessionNotes, setSessionNotes] = useState('')
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [currentSessionStatus, setCurrentSessionStatus] = useState<SessionStatus | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editTrackpoints, setEditTrackpoints] = useState<EditableTrackPoint[]>([])
  const [selectedEditTrackpointIndex, setSelectedEditTrackpointIndex] = useState<number | null>(
    null
  )
  const [isAddingEditTrackpoint, setIsAddingEditTrackpoint] = useState(false)
  const [actionError, setActionError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isEventSaving, setIsEventSaving] = useState(false)
  const [eventNote, setEventNote] = useState('')
  const [eventStatus, setEventStatus] = useState('')
  const [lastPositionDecision, setLastPositionDecision] = useState<PositionDecision | null>(
    null
  )
  const [liveDurationTick, setLiveDurationTick] = useState(() => Date.now())
  const [isLiveStatusOpen, setIsLiveStatusOpen] = useState(false)
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false)
  const [expandedHistoryDays, setExpandedHistoryDays] = useState<string[]>([])
  const [expandedHistorySessionId, setExpandedHistorySessionId] = useState<string | null>(null)

  const currentTrackpoints = useLiveQuery(async () => {
    if (!currentSessionId) return []
    return db.trackpoints.where('sessionId').equals(currentSessionId).sortBy('seq')
  }, [currentSessionId])

  const selectedTrackpoints = useLiveQuery(async () => {
    if (!selectedSessionId) return []
    return db.trackpoints.where('sessionId').equals(selectedSessionId).sortBy('seq')
  }, [selectedSessionId])

  const currentSessionEvents = useLiveQuery(async () => {
    if (!currentSessionId) return []
    const events = await db.events.where('sessionId').equals(currentSessionId).sortBy('timestamp')
    return events.reverse()
  }, [currentSessionId])

  const selectedSessionEvents = useLiveQuery(async () => {
    if (!selectedSessionId) return []
    const events = await db.events.where('sessionId').equals(selectedSessionId).sortBy('timestamp')
    return events.reverse()
  }, [selectedSessionId])

  const safeHerds = useMemo(
    () => (herds ?? []).filter((herd) => !herd.isArchived),
    [herds]
  )
  const safeSurveyAreas = useMemo(() => surveyAreas ?? [], [surveyAreas])
  const safeRecentSessions = useMemo(() => recentSessions ?? [], [recentSessions])
  const safeCurrentTrackpoints = useMemo(() => currentTrackpoints ?? [], [currentTrackpoints])
  const safeSelectedTrackpoints = useMemo(() => selectedTrackpoints ?? [], [selectedTrackpoints])
  const safeCurrentSessionEvents = useMemo(
    () => currentSessionEvents ?? [],
    [currentSessionEvents]
  )
  const safeSelectedSessionEvents = useMemo(
    () => selectedSessionEvents ?? [],
    [selectedSessionEvents]
  )

  const currentSession = useMemo(
    () =>
      currentSessionId
        ? (activeSession?.id === currentSessionId
            ? activeSession
            : safeRecentSessions.find((session) => session.id === currentSessionId)) ?? null
        : null,
    [activeSession, currentSessionId, safeRecentSessions]
  )

  const selectedSession = useMemo(
    () =>
      selectedSessionId
        ? safeRecentSessions.find((session) => session.id === selectedSessionId) ?? null
        : null,
    [safeRecentSessions, selectedSessionId]
  )

  const selectedSurveyArea = useMemo(
    () =>
      selectedSurveyAreaId
        ? safeSurveyAreas.find((surveyArea) => surveyArea.id === selectedSurveyAreaId) ?? null
        : null,
    [safeSurveyAreas, selectedSurveyAreaId]
  )

  const currentTrackFeatureCollection = useMemo(
    () => buildTrackpointsFeatureCollection(safeCurrentTrackpoints),
    [safeCurrentTrackpoints]
  )

  const selectedTrackFeatureCollection = useMemo(
    () => buildTrackpointsFeatureCollection(safeSelectedTrackpoints),
    [safeSelectedTrackpoints]
  )

  const editTrackFeatureCollection = useMemo(
    () => buildEditableTrackpointsFeatureCollection(editTrackpoints),
    [editTrackpoints]
  )
  const surveyAreaFeatureCollection = useMemo(
    () => buildSurveyAreaFeatureCollection(safeSurveyAreas),
    [safeSurveyAreas]
  )
  const sessionEventFeatureCollection = useMemo(() => {
    const mergedEvents = new Map<string, SessionEvent>()

    ;[...safeCurrentSessionEvents, ...safeSelectedSessionEvents].forEach((sessionEvent) => {
      mergedEvents.set(sessionEvent.id, sessionEvent)
    })

    return buildSessionEventFeatureCollection(Array.from(mergedEvents.values()))
  }, [safeCurrentSessionEvents, safeSelectedSessionEvents])

  useEffect(() => {
    if (currentSession?.status !== 'active') return

    const intervalId = window.setInterval(() => {
      setLiveDurationTick(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [currentSession?.status])

  const currentMetrics = useMemo(() => {
    if (!currentSession) return null

    const effectiveEndTime =
      currentSession.status === 'active'
        ? new Date(liveDurationTick).toISOString()
        : currentSession.status === 'finished'
          ? currentSession.endTime
          : currentSession.updatedAt

    return buildSessionMetrics(
      safeCurrentTrackpoints,
      currentSession.startTime,
      effectiveEndTime
    )
  }, [currentSession, liveDurationTick, safeCurrentTrackpoints])

  const selectedMetrics = useMemo(() => {
    if (!selectedSession) return null
    return buildSessionMetrics(
      safeSelectedTrackpoints,
      selectedSession.startTime,
      selectedSession.endTime
    )
  }, [safeSelectedTrackpoints, selectedSession])

  const sessionHistoryStats = useMemo(() => {
    const finishedSessions = safeRecentSessions.filter((session) => session.status === 'finished')
    const totalDistanceM = finishedSessions.reduce((sum, session) => sum + session.distanceM, 0)
    const totalDurationS = finishedSessions.reduce((sum, session) => sum + session.durationS, 0)
    const uniqueHerds = new Set(finishedSessions.map((session) => session.herdId)).size

    return {
      totalSessions: safeRecentSessions.length,
      finishedSessions: finishedSessions.length,
      totalDistanceM,
      totalDurationS,
      uniqueHerds,
    }
  }, [safeRecentSessions])

  const groupedSessionHistory = useMemo(() => {
    const groups = new Map<
      string,
      {
        label: string
        sessions: GrazingSession[]
      }
    >()

    safeRecentSessions.forEach((session) => {
      const dayKey = session.startTime.slice(0, 10)
      const current = groups.get(dayKey)

      if (current) {
        current.sessions.push(session)
        return
      }

      groups.set(dayKey, {
        label: formatDateLabel(session.startTime),
        sessions: [session],
      })
    })

    return Array.from(groups.entries()).map(([dayKey, group]) => ({
      dayKey,
      label: group.label,
      sessions: group.sessions,
    }))
  }, [safeRecentSessions])

  useEffect(() => {
    if (groupedSessionHistory.length === 0) {
      setExpandedHistoryDays([])
      return
    }

    setExpandedHistoryDays((current) =>
      current.length > 0 ? current : [groupedSessionHistory[0].dayKey]
    )
  }, [groupedSessionHistory])

  const editMetrics = useMemo(() => {
    if (!selectedSession) return null
    const nextTrackpoints: TrackPoint[] = editTrackpoints.map((point, index) => ({
      id: `preview-${index}`,
      sessionId: selectedSession.id,
      enclosureWalkId: null,
      seq: index + 1,
      timestamp: point.timestamp,
      lat: point.lat,
      lon: point.lon,
      accuracyM: point.accuracyM,
      speedMps: point.speedMps,
      headingDeg: point.headingDeg,
      accepted: true,
    }))

    return buildSessionMetrics(nextTrackpoints, selectedSession.startTime, selectedSession.endTime)
  }, [editTrackpoints, selectedSession])

  useEffect(() => {
    settingsRef.current = settings ?? defaultAppSettings
  }, [settings])

  useEffect(() => {
    positionAccuracyRef.current = position?.accuracy ?? null
  }, [position?.accuracy])

  useEffect(() => {
    if (settings === undefined) return

    if (!settings) {
      void db.settings.put(defaultAppSettings)
      return
    }

    setBaseLayer(normalizeMapBaseLayer(settings.mapBaseLayer))
  }, [settings])

  useEffect(() => {
    currentTrackpointsRef.current = safeCurrentTrackpoints
    currentSeqRef.current =
      safeCurrentTrackpoints.length > 0
        ? safeCurrentTrackpoints[safeCurrentTrackpoints.length - 1].seq
        : 0
    currentLastTimestampRef.current =
      safeCurrentTrackpoints.length > 0
        ? new Date(
            safeCurrentTrackpoints[safeCurrentTrackpoints.length - 1].timestamp
          ).getTime()
        : null
  }, [safeCurrentTrackpoints])

  useEffect(() => {
    editingSessionIdRef.current = editingSessionId
  }, [editingSessionId])

  useEffect(() => {
    selectedEditTrackpointIndexRef.current = selectedEditTrackpointIndex
  }, [selectedEditTrackpointIndex])

  useEffect(() => {
    isAddingEditTrackpointRef.current = isAddingEditTrackpoint
  }, [isAddingEditTrackpoint])

  useEffect(() => {
    if (!editingSessionId || editingSessionId !== selectedSessionId) {
      setEditTrackpoints([])
      setSelectedEditTrackpointIndex(null)
      setIsAddingEditTrackpoint(false)
      return
    }

    setEditTrackpoints(
      safeSelectedTrackpoints.map((point) => ({
        lat: point.lat,
        lon: point.lon,
        timestamp: point.timestamp,
        accuracyM: point.accuracyM ?? null,
        speedMps: point.speedMps ?? null,
        headingDeg: point.headingDeg ?? null,
      }))
    )
    setSelectedEditTrackpointIndex(null)
    setIsAddingEditTrackpoint(false)
  }, [editingSessionId, safeSelectedTrackpoints, selectedSessionId])

  useEffect(() => {
    if (!activeSession) return

    currentSessionIdRef.current = activeSession.id
    currentSessionStatusRef.current = activeSession.status
    currentSessionStartTimeRef.current = activeSession.startTime
    setCurrentSessionId(activeSession.id)
    setCurrentSessionStatus(activeSession.status)
    setSelectedHerdId(activeSession.herdId)
    setSessionNotes(activeSession.notes ?? '')
  }, [activeSession])

  useEffect(() => {
    if (activeSession) return
    if (currentSessionStatusRef.current === null && currentSessionIdRef.current === null) return

    currentSessionIdRef.current = null
    currentSessionStatusRef.current = null
    currentSessionStartTimeRef.current = null
    currentSeqRef.current = 0
    currentLastTimestampRef.current = null
    setCurrentSessionId(null)
    setCurrentSessionStatus(null)
    setEventNote('')
    setEventStatus('')
  }, [activeSession])

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

        map.addSource('session-events', {
          type: 'geojson',
          data: emptyFeatureCollection,
        })

        map.addLayer({
          id: 'session-events-points',
          type: 'circle',
          source: 'session-events',
          paint: {
            'circle-radius': 7,
            'circle-color': [
              'match',
              ['get', 'type'],
              'water',
              '#0369a1',
              'rest',
              '#b45309',
              'disturbance',
              '#be123c',
              'note',
              '#111827',
              'move',
              '#047857',
              'pause',
              '#7c2d12',
              'resume',
              '#166534',
              'stop',
              '#4b5563',
              '#2563eb',
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        })

        map.addSource('current-session-track', {
          type: 'geojson',
          data: emptyFeatureCollection,
        })

        map.addLayer({
          id: 'current-session-track-line',
          type: 'line',
          source: 'current-session-track',
          paint: {
            'line-color': '#2563eb',
            'line-width': 4,
          },
          filter: ['==', '$type', 'LineString'],
        })

        map.addLayer({
          id: 'current-session-track-points',
          type: 'circle',
          source: 'current-session-track',
          paint: {
            'circle-radius': 4,
            'circle-color': '#2563eb',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
          filter: ['==', '$type', 'Point'],
        })

        map.addSource('selected-session-track', {
          type: 'geojson',
          data: emptyFeatureCollection,
        })

        map.addLayer({
          id: 'selected-session-track-line',
          type: 'line',
          source: 'selected-session-track',
          paint: {
            'line-color': '#0f766e',
            'line-width': 4,
          },
          filter: ['==', '$type', 'LineString'],
        })

        map.addLayer({
          id: 'selected-session-track-points',
          type: 'circle',
          source: 'selected-session-track',
          paint: {
            'circle-radius': 7,
            'circle-color': '#0f766e',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff',
          },
          filter: ['==', '$type', 'Point'],
        })

        map.addLayer({
          id: 'selected-session-track-touch-target',
          type: 'circle',
          source: 'selected-session-track',
          paint: {
            'circle-radius': 18,
            'circle-color': '#ffffff',
            'circle-opacity': 0.01,
          },
          filter: ['==', '$type', 'Point'],
        })

        setMapReady(true)
      })

      map.on('click', (event) => {
        if (editingSessionIdRef.current && isAddingEditTrackpointRef.current) {
          setEditTrackpoints((currentPoints) => [
            ...currentPoints,
            {
              lat: event.lngLat.lat,
              lon: event.lngLat.lng,
              timestamp: nowIso(),
              accuracyM: positionAccuracyRef.current,
              speedMps: null,
              headingDeg: null,
            },
          ])
          setIsAddingEditTrackpoint(false)
          setActionError('')
          return
        }

        if (
          editingSessionIdRef.current &&
          selectedEditTrackpointIndexRef.current !== null
        ) {
          setEditTrackpoints((currentPoints) =>
            currentPoints.map((point, index) =>
              index === selectedEditTrackpointIndexRef.current
                ? { ...point, lat: event.lngLat.lat, lon: event.lngLat.lng }
                : point
            )
          )
          setSelectedEditTrackpointIndex(null)
          setActionError('')
        }
      })

      map.on('click', 'selected-session-track-touch-target', (event) => {
        const clickedFeature = event.features?.[0]
        const pointIndex = Number(clickedFeature?.properties?.seq)

        if (Number.isInteger(pointIndex) && pointIndex >= 1) {
          setSelectedEditTrackpointIndex(pointIndex - 1)
        }
      })

      map.on('mouseenter', 'selected-session-track-touch-target', () => {
        map.getCanvas().style.cursor = 'pointer'
      })

      map.on('mouseleave', 'selected-session-track-touch-target', () => {
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
          speed: nextPosition.coords.speed ?? null,
          heading: nextPosition.coords.heading ?? null,
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

        if (currentSessionStatusRef.current === 'active') {
          void appendSessionPointRef.current(next)
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
    const source = mapRef.current?.getSource('current-session-track') as
      | GeoJSONSource
      | undefined
    if (!source) return
    source.setData(currentTrackFeatureCollection)
  }, [currentTrackFeatureCollection])

  useEffect(() => {
    const source = mapRef.current?.getSource('survey-areas') as GeoJSONSource | undefined
    if (!source) return
    source.setData(surveyAreaFeatureCollection)
  }, [surveyAreaFeatureCollection])

  useEffect(() => {
    const source = mapRef.current?.getSource('session-events') as GeoJSONSource | undefined
    if (!source) return
    source.setData(sessionEventFeatureCollection)
  }, [sessionEventFeatureCollection])

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
    const map = mapRef.current
    if (!mapReady || !map) return

    if (map.getLayer('session-events-points')) {
      map.setLayoutProperty(
        'session-events-points',
        'visibility',
        showSessionEventsOnMap ? 'visible' : 'none'
      )
    }
  }, [mapReady, showSessionEventsOnMap])

  useEffect(() => {
    if (selectedSurveyAreaId && !safeSurveyAreas.some((surveyArea) => surveyArea.id === selectedSurveyAreaId)) {
      setSelectedSurveyAreaId(null)
    }
  }, [safeSurveyAreas, selectedSurveyAreaId])

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
  }, [editTrackFeatureCollection, editingSessionId, selectedSessionId, selectedTrackFeatureCollection])

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
  }, [mapReady, position, safeCurrentTrackpoints.length, safeSelectedTrackpoints.length])

  useEffect(() => {
    if (!mapRef.current || safeCurrentTrackpoints.length < 2) return

    const bounds = getBoundsFromTrackpoints(safeCurrentTrackpoints)
    if (!bounds) return

    mapRef.current.fitBounds(bounds, {
      padding: 50,
      duration: 700,
      maxZoom: 17,
    })
  }, [safeCurrentTrackpoints])

  useEffect(() => {
    if (!mapRef.current || !selectedSessionId || safeSelectedTrackpoints.length === 0) return

    const bounds = getBoundsFromTrackpoints(safeSelectedTrackpoints)
    if (!bounds) return

    mapRef.current.fitBounds(bounds, {
      padding: 50,
      duration: 700,
      maxZoom: 17,
    })
  }, [safeSelectedTrackpoints, selectedSessionId])

  async function updateBaseLayer(nextBaseLayer: MapBaseLayer) {
    setBaseLayer(nextBaseLayer)
    setIsBaseLayerMenuOpen(false)

    const existingSettings = await db.settings.get('app')

    await db.settings.put({
      id: 'app',
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

  async function appendSessionPoint(nextPosition: PositionData) {
    const sessionId = currentSessionIdRef.current
    if (!sessionId) return

    if (currentLastTimestampRef.current === nextPosition.timestamp) {
      return
    }

    currentSeqRef.current += 1
    currentLastTimestampRef.current = nextPosition.timestamp

    const trackPoint: TrackPoint = {
      id: createId('trackpoint'),
      sessionId,
      enclosureWalkId: null,
      seq: currentSeqRef.current,
      timestamp: new Date(nextPosition.timestamp).toISOString(),
      lat: nextPosition.latitude,
      lon: nextPosition.longitude,
      accuracyM: nextPosition.accuracy,
      speedMps: nextPosition.speed,
      headingDeg: nextPosition.heading,
      accepted: true,
    }

    await db.trackpoints.add(trackPoint)

    const nextTrackpoints = [...currentTrackpointsRef.current, trackPoint]
    currentTrackpointsRef.current = nextTrackpoints

    const startTime = currentSessionStartTimeRef.current ?? nowIso()
    const metrics = buildSessionMetrics(nextTrackpoints, startTime)

    await db.sessions.update(sessionId, {
      durationS: metrics.durationS,
      movingTimeS: metrics.movingTimeS,
      distanceM: metrics.distanceM,
      avgSpeedMps: metrics.avgSpeedMps,
      avgAccuracyM: metrics.avgAccuracyM,
      updatedAt: nowIso(),
    })
  }
  appendSessionPointRef.current = appendSessionPoint

  async function startSession() {
    if (!selectedHerdId) {
      setActionError('Bitte zuerst eine Herde für den Weidegang auswählen.')
      return
    }

    if (activeSession) {
      setActionError('Es gibt bereits einen laufenden oder pausierten Weidegang.')
      return
    }

    setIsSaving(true)
    setActionError('')

    try {
      const timestamp = nowIso()
      const session: GrazingSession = {
        id: createId('session'),
        herdId: selectedHerdId,
        status: 'active',
        startTime: timestamp,
        endTime: null,
        durationS: 0,
        movingTimeS: 0,
        distanceM: 0,
        avgSpeedMps: null,
        avgAccuracyM: null,
        notes: sessionNotes.trim() || undefined,
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      await db.sessions.add(session)
      await logSessionEvent(session.id, 'start', acceptedPositionRef.current)

      currentSessionIdRef.current = session.id
      currentSessionStatusRef.current = 'active'
      currentSessionStartTimeRef.current = session.startTime
      currentTrackpointsRef.current = []
      currentSeqRef.current = 0
      currentLastTimestampRef.current = null
      setCurrentSessionId(session.id)
      setCurrentSessionStatus('active')
      setSelectedSessionId(null)

      if (acceptedPositionRef.current) {
        await appendSessionPoint(acceptedPositionRef.current)
      }
    } catch {
      setActionError('Weidegang konnte nicht gestartet werden.')
    } finally {
      setIsSaving(false)
    }
  }

  async function pauseSession() {
    const sessionId = currentSessionIdRef.current
    const startTime = currentSessionStartTimeRef.current
    if (!sessionId || !startTime) return

    setIsSaving(true)
    setActionError('')

    try {
      const metrics = buildSessionMetrics(
        currentTrackpointsRef.current,
        startTime
      )

      await db.sessions.update(sessionId, {
        status: 'paused',
        durationS: metrics.durationS,
        movingTimeS: metrics.movingTimeS,
        distanceM: metrics.distanceM,
        avgSpeedMps: metrics.avgSpeedMps,
        avgAccuracyM: metrics.avgAccuracyM,
        updatedAt: nowIso(),
      })
      await logSessionEvent(sessionId, 'pause', acceptedPositionRef.current)

      currentSessionStatusRef.current = 'paused'
      setCurrentSessionStatus('paused')
    } catch {
      setActionError('Weidegang konnte nicht pausiert werden.')
    } finally {
      setIsSaving(false)
    }
  }

  async function resumeSession() {
    const sessionId = currentSessionIdRef.current
    if (!sessionId) return

    setIsSaving(true)
    setActionError('')

    try {
      await db.sessions.update(sessionId, {
        status: 'active',
        updatedAt: nowIso(),
      })
      await logSessionEvent(sessionId, 'resume', acceptedPositionRef.current)

      currentSessionStatusRef.current = 'active'
      setCurrentSessionStatus('active')

      if (acceptedPositionRef.current) {
        await appendSessionPoint(acceptedPositionRef.current)
      }
    } catch {
      setActionError('Weidegang konnte nicht fortgesetzt werden.')
    } finally {
      setIsSaving(false)
    }
  }

  async function stopSession() {
    const sessionId = currentSessionIdRef.current
    const startTime = currentSessionStartTimeRef.current
    if (!sessionId || !startTime) return

    setIsSaving(true)
    setActionError('')

    try {
      const endTime = nowIso()
      const metrics = buildSessionMetrics(
        currentTrackpointsRef.current,
        startTime,
        endTime
      )

      await db.sessions.update(sessionId, {
        status: 'finished',
        endTime,
        durationS: metrics.durationS,
        movingTimeS: metrics.movingTimeS,
        distanceM: metrics.distanceM,
        avgSpeedMps: metrics.avgSpeedMps,
        avgAccuracyM: metrics.avgAccuracyM,
        updatedAt: endTime,
      })
      await logSessionEvent(sessionId, 'stop', acceptedPositionRef.current)

      setSelectedSessionId(sessionId)
      currentSessionIdRef.current = null
      currentSessionStatusRef.current = null
      currentSessionStartTimeRef.current = null
      currentTrackpointsRef.current = []
      currentSeqRef.current = 0
      currentLastTimestampRef.current = null
      setCurrentSessionId(null)
      setCurrentSessionStatus(null)
      setSessionNotes('')
    } catch {
      setActionError('Weidegang konnte nicht beendet werden.')
    } finally {
      setIsSaving(false)
    }
  }

  async function addSessionMarkerEvent(type: SessionEventType, comment?: string) {
    const sessionId = currentSessionIdRef.current
    if (!sessionId) {
      setActionError('Es gibt keinen aktiven Weidegang für dieses Ereignis.')
      return
    }

    const cleanedComment = comment?.trim()
    if (type === 'note' && !cleanedComment) {
      setActionError('Bitte zuerst eine Notiz eingeben.')
      return
    }

    setIsEventSaving(true)
    setActionError('')
    setEventStatus('')

    try {
      await logSessionEvent(sessionId, type, acceptedPositionRef.current, cleanedComment)
      setEventStatus(`${getSessionEventLabel(type)} gespeichert.`)

      if (type === 'note') {
        setEventNote('')
      }
    } catch {
      setActionError('Ereignis konnte nicht gespeichert werden.')
    } finally {
      setIsEventSaving(false)
    }
  }

  function startEditSession(sessionId: string) {
    setSelectedSessionId(sessionId)
    setEditingSessionId(sessionId)
    setActionError('')
  }

  function cancelEditSession() {
    setEditingSessionId(null)
    setSelectedEditTrackpointIndex(null)
    setIsAddingEditTrackpoint(false)
    setActionError('')
  }

  function startAddEditTrackpoint() {
    setIsAddingEditTrackpoint(true)
    setSelectedEditTrackpointIndex(null)
    setActionError('')
  }

  function removeSelectedEditTrackpoint() {
    if (selectedEditTrackpointIndex === null) return
    if (editTrackpoints.length <= 1) {
      setActionError('Ein Weidegang braucht mindestens einen Trackpunkt.')
      return
    }

    setEditTrackpoints((currentPoints) =>
      currentPoints.filter((_, index) => index !== selectedEditTrackpointIndex)
    )
    setSelectedEditTrackpointIndex(null)
    setIsAddingEditTrackpoint(false)
    setActionError('')
  }

  async function saveEditedSession() {
    if (!editingSessionId || !selectedSession) return
    if (editTrackpoints.length === 0) {
      setActionError('Es gibt keine Trackpunkte zum Speichern.')
      return
    }

    const nextTrackpoints: TrackPoint[] = editTrackpoints.map((point, index) => ({
      id: safeSelectedTrackpoints[index]?.id ?? createId('trackpoint'),
      sessionId: editingSessionId,
      enclosureWalkId: null,
      seq: index + 1,
      timestamp: point.timestamp,
      lat: point.lat,
      lon: point.lon,
      accuracyM: point.accuracyM,
      speedMps: point.speedMps,
      headingDeg: point.headingDeg,
      accepted: true,
    }))

    const metrics = buildSessionMetrics(
      nextTrackpoints,
      selectedSession.startTime,
      selectedSession.endTime
    )

    setIsSaving(true)
    setActionError('')

    try {
      await db.transaction('rw', db.trackpoints, db.sessions, async () => {
        await db.trackpoints.where('sessionId').equals(editingSessionId).delete()
        await db.trackpoints.bulkAdd(nextTrackpoints)
        await db.sessions.update(editingSessionId, {
          durationS: metrics.durationS,
          movingTimeS: metrics.movingTimeS,
          distanceM: metrics.distanceM,
          avgSpeedMps: metrics.avgSpeedMps,
          avgAccuracyM: metrics.avgAccuracyM,
          updatedAt: nowIso(),
        })
      })

      setEditingSessionId(null)
      setSelectedEditTrackpointIndex(null)
      setIsAddingEditTrackpoint(false)
    } catch {
      setActionError('Weidegang konnte nicht aktualisiert werden.')
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteSession(session: GrazingSession) {
    if (
      currentSessionIdRef.current === session.id ||
      session.status === 'active' ||
      session.status === 'paused'
    ) {
      setActionError('Laufende oder pausierte Weidegänge können nicht gelöscht werden.')
      return
    }

    const confirmed = window.confirm(
      `Weidegang vom ${formatDateTime(session.startTime)} wirklich löschen?`
    )

    if (!confirmed) return

    setIsSaving(true)
    setActionError('')

    try {
      await db.transaction('rw', [db.sessions, db.trackpoints, db.events], async () => {
        await db.trackpoints.where('sessionId').equals(session.id).delete()
        await db.events.where('sessionId').equals(session.id).delete()
        await db.sessions.delete(session.id)
      })

      if (selectedSessionId === session.id) {
        setSelectedSessionId(null)
      }

      if (editingSessionId === session.id) {
        cancelEditSession()
      }
    } catch {
      setActionError('Weidegang konnte nicht gelöscht werden.')
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
        ? 'Letzter Punkt wurde für den Weidegang akzeptiert.'
        : 'GPS-Filter noch ohne Entscheidung.'

  const selectedHerd = safeHerds.find((herd) => herd.id === selectedHerdId) ?? null

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
          <>
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
                  Herde
                </div>
                <div className="mt-1 text-sm font-medium text-neutral-900">
                  {selectedHerd?.name ?? 'noch nicht gewählt'}
                </div>
              </div>
              <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                  Status
                </div>
                <div className="mt-1 text-sm font-medium text-neutral-900">
                  {currentSessionStatus === 'active'
                    ? 'Läuft'
                    : currentSessionStatus === 'paused'
                      ? 'Pausiert'
                      : 'Bereit'}
                </div>
              </div>
              <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm sm:col-span-2 xl:col-span-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                  Koordinaten
                </div>
                <div className="mt-1 text-sm font-medium text-neutral-900">
                  {position
                    ? `${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`
                    : 'Noch keine Position'}
                </div>
              </div>
              <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm sm:col-span-2 xl:col-span-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                  Update
                </div>
                <div className="mt-1 text-sm font-medium text-neutral-900">
                  {position ? formatTimestamp(position.timestamp) : 'Warte auf GPS'}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <div className="relative overflow-hidden rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] shadow-[0_18px_40px_rgba(23,20,18,0.08)]">
        <div ref={containerRef} className="h-[420px] w-full bg-[#fffdf6]" />
        {!editingSessionId ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-2 lg:hidden">
            <MobileMapToolbar>
              <MobileMapToolbarStat>
                <span className="inline-flex items-center gap-1">
                  <TrackpointsIcon />
                  <span>{safeCurrentTrackpoints.length} · {formatDistance(currentMetrics?.distanceM ?? 0)}</span>
                </span>
              </MobileMapToolbarStat>
              <MobileMapToolbarStat>
                {formatDuration(currentMetrics?.durationS ?? 0)}
              </MobileMapToolbarStat>
              <MobileMapToolbarButton
                aria-label={currentSessionStatus === 'paused' ? 'Fortsetzen' : 'Weidegang starten'}
                title={currentSessionStatus === 'paused' ? 'Fortsetzen' : 'Weidegang starten'}
                onClick={() =>
                  void (currentSessionStatus === 'paused' ? resumeSession() : startSession())
                }
                disabled={
                  isSaving ||
                  currentSessionStatus === 'active' ||
                  (currentSessionStatus === null && safeHerds.length === 0)
                }
                variant="primary"
                label={currentSessionStatus === 'paused' ? 'Weiter' : 'Start'}
              >
                <PlayIcon />
              </MobileMapToolbarButton>
              <MobileMapToolbarButton
                aria-label="Pausieren"
                title="Pausieren"
                onClick={() => void pauseSession()}
                disabled={isSaving || currentSessionStatus !== 'active'}
                label="Pause"
              >
                <PauseIcon />
              </MobileMapToolbarButton>
              <MobileMapToolbarButton
                aria-label="Weidegang beenden"
                title="Weidegang beenden"
                onClick={() => void stopSession()}
                disabled={isSaving || (currentSessionStatus !== 'active' && currentSessionStatus !== 'paused')}
                label="Stop"
              >
                <StopIcon />
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
                    onClick={() => setShowSessionEventsOnMap((current) => !current)}
                    className={[
                      'mt-1.5 w-full rounded-xl px-2.5 py-2 text-left text-xs font-medium',
                      showSessionEventsOnMap
                        ? 'bg-[#efe4c8] text-[#17130f]'
                        : 'bg-[#f1efeb] text-neutral-950',
                    ].join(' ')}
                  >
                    Ereignisse {showSessionEventsOnMap ? 'an' : 'aus'}
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
        {editingSessionId ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2 sm:p-4">
              <MobileMapFloatingCard>
              <div className="flex items-center justify-between gap-2 px-1 pb-2 sm:gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-neutral-900 sm:text-sm">
                    Weidegang bearbeiten
                  </div>
                  <div className="text-[11px] text-neutral-800 sm:hidden">
                    {isAddingEditTrackpoint
                      ? 'Nächster Tap setzt Punkt.'
                      : selectedEditTrackpointIndex !== null
                        ? `Punkt ${selectedEditTrackpointIndex + 1} aktiv.`
                        : 'Punkt antippen oder Aktion wählen.'}
                  </div>
                </div>
                <div className="shrink-0 rounded-full border border-[#ccb98a] bg-[#fffdf6] px-2 py-1 text-[11px] font-medium text-[#17130f] sm:px-3 sm:text-xs">
                  {editTrackpoints.length} Punkte
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={startAddEditTrackpoint}
                  className="rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-2 py-2.5 text-xs font-medium text-[#17130f] sm:px-3 sm:py-3 sm:text-sm"
                >
                  Punkt +
                </button>
                <button
                  type="button"
                  onClick={removeSelectedEditTrackpoint}
                  disabled={selectedEditTrackpointIndex === null || editTrackpoints.length <= 1}
                  className="rounded-2xl bg-[#f1efeb] px-2 py-2.5 text-xs font-semibold text-neutral-950 disabled:opacity-50 sm:px-3 sm:py-3 sm:text-sm"
                >
                  Punkt -
                </button>
                <button
                  type="button"
                  onClick={() => void saveEditedSession()}
                  disabled={isSaving}
                  className="rounded-2xl border border-[#5a5347] bg-[#f1efeb] px-2 py-2.5 text-xs font-semibold text-[#17130f] disabled:opacity-50 sm:px-3 sm:py-3 sm:text-sm"
                >
                  {isSaving ? '...' : 'Speichern'}
                </button>
                <button
                  type="button"
                  onClick={cancelEditSession}
                  className="rounded-2xl bg-[#f1efeb] px-2 py-2.5 text-xs font-semibold text-neutral-950 sm:px-3 sm:py-3 sm:text-sm"
                  >
                    Schließen
                  </button>
                </div>
              </MobileMapFloatingCard>
          </div>
        ) : null}
      </div>

      <div className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)]">
        <h2 className="text-lg font-semibold">Weidegang verwalten</h2>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Herde</label>
            <select
              value={selectedHerdId}
              onChange={(event) => setSelectedHerdId(event.target.value)}
              disabled={currentSessionStatus !== null}
              className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
            >
              <option value="">Bitte wählen</option>
              {safeHerds.map((herd: Herd) => (
                <option key={herd.id} value={herd.id}>
                  {herd.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Notiz zum Weidegang</label>
            <textarea
              rows={3}
              value={sessionNotes}
              onChange={(event) => setSessionNotes(event.target.value)}
              disabled={currentSessionStatus !== null}
              className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
              placeholder="optionale Begleitnotiz"
            />
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-[#fffdf6] px-4 py-3 text-sm text-neutral-700 lg:hidden">
          Die Hauptsteuerung liegt direkt auf der Karte.
        </div>

        <div className="mt-4 hidden grid-cols-2 gap-3 lg:grid">
          <button
            type="button"
            onClick={() => void startSession()}
            disabled={isSaving || currentSessionStatus !== null || safeHerds.length === 0}
            className="rounded-[1.1rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-4 text-sm font-semibold text-[#17130f] disabled:opacity-50"
          >
            Weidegang starten
          </button>
          <button
            type="button"
            onClick={() => void pauseSession()}
            disabled={isSaving || currentSessionStatus !== 'active'}
            className="rounded-[1.1rem] bg-[#f1efeb] px-4 py-4 text-sm font-semibold text-neutral-950 disabled:opacity-50"
          >
            Pausieren
          </button>
          <button
            type="button"
            onClick={() => void resumeSession()}
            disabled={isSaving || currentSessionStatus !== 'paused'}
            className="rounded-[1.1rem] bg-[#f1efeb] px-4 py-4 text-sm font-semibold text-neutral-950 disabled:opacity-50"
          >
            Fortsetzen
          </button>
          <button
            type="button"
            onClick={() => void stopSession()}
            disabled={isSaving || (currentSessionStatus !== 'active' && currentSessionStatus !== 'paused')}
            className="rounded-2xl border border-[#5a5347] bg-[#f1efeb] px-4 py-4 text-sm font-medium text-[#17130f] disabled:opacity-50"
          >
            Weidegang beenden
          </button>
        </div>

        {currentSessionStatus ? (
          <div className="mt-4 rounded-[1.35rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-neutral-950">Ereignisse erfassen</h3>
              <div className="text-xs font-medium text-neutral-500">
                mit aktueller Position
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => void addSessionMarkerEvent('water')}
                disabled={isEventSaving}
                className="rounded-[1.05rem] border border-[#ccb98a] bg-[#fffdf6] px-3 py-3 text-sm font-semibold text-[#17130f] disabled:opacity-50"
              >
                Wasser
              </button>
              <button
                type="button"
                onClick={() => void addSessionMarkerEvent('rest')}
                disabled={isEventSaving}
                className="rounded-[1.05rem] border border-[#ccb98a] bg-[#fffdf6] px-3 py-3 text-sm font-semibold text-[#17130f] disabled:opacity-50"
              >
                Rast-Ort
              </button>
              <button
                type="button"
                onClick={() => void addSessionMarkerEvent('disturbance')}
                disabled={isEventSaving}
                className="rounded-[1.05rem] bg-rose-100 px-3 py-3 text-sm font-semibold text-rose-950 disabled:opacity-50"
              >
                Störung
              </button>
              <button
                type="button"
                onClick={() => void addSessionMarkerEvent('move')}
                disabled={isEventSaving}
                className="rounded-[1.05rem] border border-[#ccb98a] bg-[#fffdf6] px-3 py-3 text-sm font-semibold text-[#17130f] disabled:opacity-50"
              >
                Punkt
              </button>
            </div>

            <div className="mt-3 space-y-2">
              <label className="block text-sm font-medium text-neutral-900">Freie Notiz</label>
              <textarea
                rows={2}
                value={eventNote}
                onChange={(event) => setEventNote(event.target.value)}
                className="w-full rounded-2xl border-2 border-[#ccb98a] bg-[#fffdf6] px-4 py-3"
                placeholder="Bemerkung zum aktuellen Weidegang"
              />
              <button
                type="button"
                onClick={() => void addSessionMarkerEvent('note', eventNote)}
                disabled={isEventSaving || !eventNote.trim()}
                className="w-full rounded-[1.05rem] border border-[#5a5347] bg-[#f1efeb] px-4 py-3 text-sm font-semibold text-[#17130f] disabled:opacity-50"
              >
                Notiz speichern
              </button>
            </div>

            {eventStatus ? (
              <div className="mt-3 rounded-2xl border border-[#c5d3c8] bg-[#edf1ec] px-4 py-3 text-sm text-[#243228]">
                {eventStatus}
              </div>
            ) : null}

            <div className="mt-3 rounded-2xl bg-[#fffdf6] px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
                Letzte Ereignisse
              </div>
              {safeCurrentSessionEvents.length === 0 ? (
                <div className="mt-2 text-sm text-neutral-600">Noch keine Ereignisse erfasst.</div>
              ) : (
                <div className="mt-2 space-y-2">
                  {safeCurrentSessionEvents.slice(0, 5).map((sessionEvent) => (
                    <div
                      key={sessionEvent.id}
                      className="rounded-[1rem] border border-[#ccb98a] bg-[#fffdf6] px-3 py-3 text-sm text-neutral-800"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-medium text-neutral-950">
                          {getSessionEventLabel(sessionEvent.type)}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {formatDateTime(sessionEvent.timestamp)}
                        </div>
                      </div>
                      {sessionEvent.comment ? (
                        <div className="mt-1 text-sm text-neutral-700">{sessionEvent.comment}</div>
                      ) : null}
                      {typeof sessionEvent.lat === 'number' && typeof sessionEvent.lon === 'number' ? (
                        <div className="mt-1 text-xs text-neutral-500">
                          {sessionEvent.lat.toFixed(5)}, {sessionEvent.lon.toFixed(5)}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {actionError ? (
          <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
            <div className="text-neutral-700">Punkte</div>
            <div className="mt-1 font-medium text-neutral-900">
              {safeCurrentTrackpoints.length}
            </div>
          </div>
          <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
            <div className="text-neutral-700">Distanz</div>
            <div className="mt-1 font-medium text-neutral-900">
              {formatDistance(currentMetrics?.distanceM ?? 0)}
            </div>
          </div>
          <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
            <div className="text-neutral-700">Dauer</div>
            <div className="mt-1 font-medium text-neutral-900">
              {formatDuration(currentMetrics?.durationS ?? 0)}
            </div>
          </div>
          <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
            <div className="text-neutral-700">Mittlere Genauigkeit</div>
            <div className="mt-1 font-medium text-neutral-900">
              {formatAccuracy(currentMetrics?.avgAccuracyM)}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[1.9rem] border-2 border-[#3a342a] bg-[#fff8ea] p-5 shadow-[0_18px_40px_rgba(23,20,18,0.08)]">
        <button
          type="button"
          onClick={() => setIsHistoryExpanded((current) => !current)}
          className="flex w-full items-center justify-between gap-3 rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-left shadow-sm"
        >
          <div>
            <h2 className="text-lg font-semibold text-neutral-950">Weidegang-Historie</h2>
            <div className="mt-1 text-sm font-medium text-neutral-700">
              {safeRecentSessions.length} gespeicherte Weidegänge
            </div>
          </div>
          <span className="text-lg font-semibold text-neutral-900">
            {isHistoryExpanded ? '−' : '+'}
          </span>
        </button>

        <div className="mt-4 rounded-[1.25rem] bg-[#fffdf6] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-neutral-950">Untersuchungsflächen</h2>
            <span className="text-sm text-neutral-500">{safeSurveyAreas.length}</span>
          </div>
          <p className="mt-2 text-sm text-neutral-700">
            Importierte Flächen können für die Orientierung auf der Karte ein- oder ausgeblendet und direkt fokussiert werden.
          </p>

          {selectedSurveyArea ? (
            <div className="mt-3 rounded-2xl border border-[#d2cbc0] bg-[#efe4c8] px-4 py-3 text-sm text-[#17130f]">
              Fokus: <span className="font-medium">{selectedSurveyArea.name}</span> ·{' '}
                  {formatArea(selectedSurveyArea.areaM2)}
            </div>
          ) : null}

          {safeSurveyAreas.length === 0 ? (
            <div className="mt-3 text-sm text-neutral-600">
              Noch keine Untersuchungsflächen importiert.
            </div>
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
                        {formatArea(surveyArea.areaM2)} · {formatDateTime(surveyArea.updatedAt)}
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

        {isHistoryExpanded ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
              <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
                <div className="text-neutral-700">Sessions</div>
                <div className="mt-1 font-medium text-neutral-900">
                  {sessionHistoryStats.totalSessions}
                </div>
              </div>
              <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
                <div className="text-neutral-700">Abgeschlossen</div>
                <div className="mt-1 font-medium text-neutral-900">
                  {sessionHistoryStats.finishedSessions}
                </div>
              </div>
              <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
                <div className="text-neutral-700">Gesamtdistanz</div>
                <div className="mt-1 font-medium text-neutral-900">
                  {formatDistance(sessionHistoryStats.totalDistanceM)}
                </div>
              </div>
              <div className="rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 shadow-sm">
                <div className="text-neutral-700">Gesamtdauer</div>
                <div className="mt-1 font-medium text-neutral-900">
                  {formatDuration(sessionHistoryStats.totalDurationS)}
                </div>
              </div>
            </div>

            {safeRecentSessions.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-700">Noch kein Weidegang gespeichert.</p>
            ) : (
              <div className="mt-4 space-y-4">
            {groupedSessionHistory.map((group) => (
              <div key={group.dayKey} className="space-y-3">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedHistoryDays((current) =>
                      current.includes(group.dayKey)
                        ? current.filter((dayKey) => dayKey !== group.dayKey)
                        : [...current, group.dayKey]
                    )
                  }
                  className="flex w-full items-center justify-between gap-3 rounded-[1.1rem] border border-[#ccb98a] bg-[#fffdf6] px-4 py-3 text-left shadow-sm"
                >
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-neutral-700">
                      {group.label}
                    </h3>
                    <div className="mt-1 text-xs font-medium text-neutral-600">
                      {group.sessions.length} Weidegänge
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-neutral-900">
                    {expandedHistoryDays.includes(group.dayKey) ? '−' : '+'}
                  </span>
                </button>

                {expandedHistoryDays.includes(group.dayKey) ? (
                  <div className="space-y-3">
                    {group.sessions.map((session) => {
                    const herd = safeHerds.find((currentHerd) => currentHerd.id === session.herdId)
                    const isSelected = selectedSessionId === session.id

                    return (
                      <div
                        key={session.id}
                        className={[
                          'rounded-2xl px-4 py-3',
                          isSelected ? 'bg-[#efe4c8]' : 'bg-neutral-50',
                        ].join(' ')}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedHistorySessionId((current) =>
                              current === session.id ? null : session.id
                            )
                          }
                          aria-expanded={expandedHistorySessionId === session.id}
                          className="flex w-full items-start justify-between gap-3 text-left"
                        >
                          <div>
                            <div className="font-medium text-neutral-900">
                              {herd?.name ?? 'Unbekannte Herde'}
                            </div>
                            <div className="mt-1 text-sm text-neutral-600">
                              {formatDateTime(session.startTime)} ·{' '}
                              {session.status === 'finished'
                                ? 'abgeschlossen'
                                : session.status === 'paused'
                                  ? 'pausiert'
                                  : 'aktiv'}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-xs text-neutral-500">
                              {formatDistance(session.distanceM)}
                            </div>
                            <div className="mt-1 text-base text-neutral-900">
                              {expandedHistorySessionId === session.id ? '−' : '+'}
                            </div>
                          </div>
                        </button>

                        {expandedHistorySessionId === session.id ? (
                          <>
                            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                              <div className="rounded-2xl bg-[#fffdf6] px-3 py-3">
                                <div className="text-neutral-500">Dauer</div>
                                <div className="mt-1 font-medium text-neutral-900">
                                  {formatDuration(session.durationS)}
                                </div>
                              </div>
                              <div className="rounded-2xl bg-[#fffdf6] px-3 py-3">
                                <div className="text-neutral-500">Genauigkeit</div>
                                <div className="mt-1 font-medium text-neutral-900">
                                  {formatAccuracy(session.avgAccuracyM)}
                                </div>
                              </div>
                            </div>

                            {session.notes ? (
                              <p className="mt-3 text-sm text-neutral-600">{session.notes}</p>
                            ) : null}

                            <div className="mt-3 grid grid-cols-1 gap-2">
                              <div className="grid grid-cols-3 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedSessionId(session.id)}
                                  className="rounded-2xl bg-[#fffdf6] px-3 py-3 text-sm font-medium text-neutral-900"
                                >
                                  Spur anzeigen
                                </button>
                                <button
                                  type="button"
                                  onClick={() => startEditSession(session.id)}
                                  className="rounded-2xl bg-[#fffdf6] px-3 py-3 text-sm font-medium text-neutral-900"
                                >
                                  Bearbeiten
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void deleteSession(session)}
                                  disabled={isSaving || session.status === 'active' || session.status === 'paused'}
                                  className="rounded-2xl bg-red-50 px-3 py-3 text-sm font-medium text-red-700 disabled:opacity-50"
                                >
                                  Löschen
                                </button>
                              </div>
                            </div>
                          </>
                        ) : null}
                      </div>
                    )
                    })}
                  </div>
                ) : null}
              </div>
            ))}
              </div>
            )}
          </>
        ) : null}

        {isHistoryExpanded && selectedSession && selectedMetrics ? (
          <div className="mt-4 rounded-2xl border border-[#c5d3c8] bg-[#edf1ec] px-4 py-3 text-sm text-[#243228]">
            Fokus: <span className="font-medium">{formatDateTime(selectedSession.startTime)}</span>
            {' '}· {formatDistance(selectedMetrics.distanceM)} ·{' '}
            {formatDuration(selectedMetrics.durationS)} ·{' '}
            {safeSelectedTrackpoints.length} Punkte
          </div>
        ) : null}

        {isHistoryExpanded && selectedSession ? (
          <div className="mt-4 rounded-2xl border border-[#ccb98a] bg-[#fffdf6] px-4 py-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">
              Ereignisse im Fokus-Weidegang
            </div>
            {safeSelectedSessionEvents.length === 0 ? (
              <div className="mt-2 text-sm text-neutral-600">Keine Ereignisse gespeichert.</div>
            ) : (
              <div className="mt-3 space-y-2">
                {safeSelectedSessionEvents.slice(0, 8).map((sessionEvent) => (
                  <div
                    key={sessionEvent.id}
                    className="rounded-[1rem] bg-[#fffdf6] px-3 py-3 text-sm text-neutral-800"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-medium text-neutral-950">
                        {getSessionEventLabel(sessionEvent.type)}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {formatDateTime(sessionEvent.timestamp)}
                      </div>
                    </div>
                    {sessionEvent.comment ? (
                      <div className="mt-1 text-neutral-700">{sessionEvent.comment}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {isHistoryExpanded && editingSessionId && editMetrics ? (
          <div className="mt-4 rounded-2xl border border-[#d2cbc0] bg-[#efe4c8] px-4 py-3 text-sm text-[#17130f]">
            Bearbeitung aktiv: {formatDistance(editMetrics.distanceM)} ·{' '}
            {formatDuration(editMetrics.durationS)} · {editTrackpoints.length} Punkte
          </div>
        ) : null}
      </div>
    </section>
  )
}
