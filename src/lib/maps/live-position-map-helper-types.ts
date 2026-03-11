import type { Enclosure, EnclosureAssignment } from '@/types/domain'

export type DraftPoint = {
  lat: number
  lon: number
}

export type WalkPoint = {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

export type WalkTrackSummary = {
  count: number
  avgAccuracyM: number | null
  firstTimestamp: string | null
  lastTimestamp: string | null
}

export type EnclosureListFilter = 'all' | 'active' | 'unused' | 'most-used'

export type EnclosureStats = {
  totalAssignments: number
  totalDurationS: number
  averageCount: number | null
  lastEndTime: string | null
  uniqueHerdsCount: number
}

export type FilteredEnclosureItem = {
  enclosure: Enclosure
  stats: EnclosureStats | undefined
  activeAssignment: EnclosureAssignment | undefined
}
