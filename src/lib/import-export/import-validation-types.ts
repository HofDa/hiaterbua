import type {
  Animal,
  AppSettings,
  Enclosure,
  EnclosureAssignment,
  GrazingSession,
  Herd,
  SessionEvent,
  SurveyArea,
  TrackPoint,
  WorkEvent,
  WorkSession,
} from '@/types/domain'

export const importPayloadKeys = [
  'herds',
  'animals',
  'enclosures',
  'surveyAreas',
  'enclosureAssignments',
  'grazingSessions',
  'trackpoints',
  'sessionEvents',
  'workSessions',
  'workEvents',
  'settings',
] as const

export type ImportPayloadKey = (typeof importPayloadKeys)[number]

export type ImportPayload = Partial<Record<ImportPayloadKey, unknown[]>>

export type ImportSourceKind = 'zip-export' | 'app-data-json' | 'survey-geojson'

export type ImportCounts = Record<ImportPayloadKey, number>

export type ImportPreviewMeta = {
  kind: ImportSourceKind
  presentKeys: ImportPayloadKey[]
  isCompleteAppData: boolean
}

export type PreparedImportPayload = {
  clearKeys: ImportPayloadKey[]
  counts: {
    herds: number
    animals: number
    enclosures: number
    surveyAreas: number
    enclosureAssignments: number
    grazingSessions: number
    trackpoints: number
    sessionEvents: number
    workSessions: number
    workEvents: number
    settings: number
  }
  payload: {
    herds: Herd[]
    animals: Animal[]
    enclosures: Enclosure[]
    surveyAreas: SurveyArea[]
    enclosureAssignments: EnclosureAssignment[]
    grazingSessions: GrazingSession[]
    trackpoints: TrackPoint[]
    sessionEvents: SessionEvent[]
    workSessions: WorkSession[]
    workEvents: WorkEvent[]
    settings: AppSettings[]
  }
}

export type ExistingImportRefs = {
  animalEarTags: Map<string, string>
  enclosureIds: Set<string>
  herdIds: Set<string>
  sessionIds: Set<string>
  workSessionIds: Set<string>
}
