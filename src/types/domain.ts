import type * as GeoJSON from 'geojson'

export type Species = 'cattle' | 'sheep' | 'goats' | 'horses' | 'other'

export type EnclosureMethod = 'draw' | 'walk'

export type SessionStatus = 'active' | 'paused' | 'finished'

export type WorkStatus = 'active' | 'paused' | 'finished'

export type WorkType =
  | 'herding'
  | 'driving'
  | 'fence'
  | 'control'
  | 'water'
  | 'transport'
  | 'other'

export type WorkActivityId =
  | 'guided_access_to_grazing_animals'
  | 'guided_lead_grazing_animals'
  | 'guided_herd_grazing_animals'
  | 'guided_collect_grazing_animals'
  | 'guided_fence_work'
  | 'guided_overnight_fence_work'
  | 'guided_material_shift'
  | 'guided_water_supply'
  | 'guided_check_grazing_animals'
  | 'guided_check_lambing'
  | 'guided_check_herding_dogs'
  | 'guided_check_guard_dogs'
  | 'guided_brush_clearing_with_grazers'
  | 'guided_detangling'
  | 'guided_follow_up_grazing'
  | 'guided_fence_work_for_brush_clearing'
  | 'guided_trampling_via_overdrive'

export type SessionEventType =
  | 'water'
  | 'rest'
  | 'move'
  | 'disturbance'
  | 'note'
  | 'start'
  | 'pause'
  | 'resume'
  | 'stop'

export type WorkEventType = 'start' | 'pause' | 'resume' | 'stop' | 'note'

export type MapBaseLayer = 'south-tyrol-basemap' | 'south-tyrol-orthophoto-2023'

export interface MapTileRecord {
  url: string
  blob: Blob
  contentType?: string
  status: number
  statusText?: string
  updatedAt: string
}

export interface Herd {
  id: string
  name: string
  fallbackCount?: number | null
  notes?: string
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

export interface Animal {
  id: string
  herdId: string
  earTag: string
  species: Species
  name?: string
  notes?: string
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

export interface Enclosure {
  id: string
  name: string
  method: EnclosureMethod
  rootEnclosureId?: string | null
  version?: number | null
  supersededByEnclosureId?: string | null
  supersededAt?: string | null
  geometry: GeoJSON.Polygon | null
  areaM2: number
  areaHa: number
  herdId?: string | null
  notes?: string
  avgAccuracyM?: number | null
  pointsCount?: number | null
  createdAt: string
  updatedAt: string
}

export interface SurveyArea {
  id: string
  name: string
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
  notes?: string
  areaM2: number
  areaHa: number
  createdAt: string
  updatedAt: string
  importOrder?: number
}

export interface EnclosureAssignment {
  id: string
  enclosureId: string
  herdId: string
  count?: number | null
  startTime?: string | null
  endTime?: string | null
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface GrazingSession {
  id: string
  herdId: string
  animalCount?: number | null
  status: SessionStatus
  startTime: string
  endTime?: string | null
  durationS: number
  movingTimeS: number
  distanceM: number
  avgSpeedMps?: number | null
  avgAccuracyM?: number | null
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface WorkSession {
  id: string
  type: WorkType
  activityId?: WorkActivityId | null
  status: WorkStatus
  herdId?: string | null
  enclosureId?: string | null
  startTime: string
  endTime?: string | null
  activeSince?: string | null
  durationS: number
  reminderIntervalMin?: number | null
  lastReminderAt?: string | null
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface WorkEvent {
  id: string
  workSessionId: string
  timestamp: string
  type: WorkEventType
  comment?: string
}

export interface TrackPoint {
  id: string
  sessionId?: string | null
  enclosureWalkId?: string | null
  seq: number
  timestamp: string
  lat: number
  lon: number
  accuracyM?: number | null
  speedMps?: number | null
  headingDeg?: number | null
  accepted: boolean
}

export interface SessionEvent {
  id: string
  sessionId: string
  timestamp: string
  type: SessionEventType
  lat?: number | null
  lon?: number | null
  comment?: string
}

export interface AppSettings {
  id: 'app'
  userName: string
  accessPasswordHash: string
  language: 'de' | 'it'
  mapBaseLayer: MapBaseLayer
  gpsAccuracyThresholdM: number
  gpsMinTimeS: number
  gpsMinDistanceM: number
  tileCachingEnabled: boolean
  theme: 'system' | 'light'
}
