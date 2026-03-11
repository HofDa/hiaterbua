import type {
  GrazingSession,
  SessionEvent,
  SessionEventType,
  TrackPoint,
} from '@/types/domain'

export type PositionData = {
  latitude: number
  longitude: number
  speed: number | null
  heading: number | null
  timestamp: number
}

export type EditableTrackPoint = {
  lat: number
  lon: number
  timestamp: string
  accuracyM: number | null
  speedMps: number | null
  headingDeg: number | null
}

export type SessionMetrics = {
  durationS: number
  movingTimeS: number
  distanceM: number
  avgSpeedMps: number | null
  avgAccuracyM: number | null
}

export type SessionHistoryStats = {
  totalSessions: number
  finishedSessions: number
  totalDistanceM: number
  totalDurationS: number
  uniqueHerds: number
}

export type GroupedSessionHistory = {
  dayKey: string
  label: string
  sessions: GrazingSession[]
}

export type {
  GrazingSession,
  SessionEvent,
  SessionEventType,
  TrackPoint,
}
