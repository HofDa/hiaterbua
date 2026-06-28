import type * as GeoJSON from 'geojson'
import { defaultAppSettings } from '@/lib/settings/defaults'
import type { ExistingImportRefs } from '@/lib/import-export/import-validation-types'
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

/**
 * A small but referentially-complete dataset that touches every exported table.
 * Each record is written in the exact shape the import schemas emit after their
 * `.transform()` step (explicit `null`s for absent nullable fields, no extra
 * keys), so a faithful export → JSON → import round-trip is value-equal to this
 * source with `toEqual`.
 */

const START = '2026-06-01T08:00:00.000Z'
const LATER = '2026-06-01T09:30:00.000Z'

function square(lon: number, lat: number): GeoJSON.Polygon {
  return {
    type: 'Polygon',
    coordinates: [
      [
        [lon, lat],
        [lon + 0.001, lat],
        [lon + 0.001, lat + 0.001],
        [lon, lat + 0.001],
        [lon, lat],
      ],
    ],
  }
}

export type SampleDataset = {
  herds: Herd[]
  animals: Animal[]
  enclosures: Enclosure[]
  surveyAreas: SurveyArea[]
  enclosureAssignments: EnclosureAssignment[]
  sessions: GrazingSession[]
  trackpoints: TrackPoint[]
  events: SessionEvent[]
  workSessions: WorkSession[]
  workEvents: WorkEvent[]
  settings: AppSettings[]
}

export function buildSampleDataset(): SampleDataset {
  const herds: Herd[] = [
    {
      id: 'herd_a',
      name: 'Almherde',
      fallbackCount: 42,
      notes: 'Stammherde',
      isArchived: false,
      createdAt: START,
      updatedAt: START,
    },
    {
      id: 'herd_b',
      name: 'Talherde',
      fallbackCount: null,
      isArchived: false,
      createdAt: START,
      updatedAt: START,
    },
  ]

  const animals: Animal[] = [
    {
      id: 'animal_1',
      herdId: 'herd_a',
      earTag: 'IT-001',
      species: 'cattle',
      name: 'Berta',
      isArchived: false,
      createdAt: START,
      updatedAt: START,
    },
    {
      id: 'animal_2',
      herdId: 'herd_b',
      earTag: 'IT-002',
      species: 'sheep',
      isArchived: false,
      createdAt: START,
      updatedAt: START,
    },
  ]

  const enclosures: Enclosure[] = [
    {
      id: 'enclosure_draw',
      name: 'Gezeichneter Pferch',
      method: 'draw',
      rootEnclosureId: null,
      version: null,
      supersededByEnclosureId: null,
      supersededAt: null,
      geometry: square(11.0, 46.5),
      areaM2: 7700,
      areaHa: 0.77,
      herdId: 'herd_a',
      notes: 'Hauptpferch',
      avgAccuracyM: null,
      pointsCount: null,
      createdAt: START,
      updatedAt: START,
    },
    {
      id: 'enclosure_walk',
      name: 'Abgegangener Pferch',
      method: 'walk',
      rootEnclosureId: null,
      version: null,
      supersededByEnclosureId: null,
      supersededAt: null,
      geometry: square(11.01, 46.51),
      areaM2: 8800,
      areaHa: 0.88,
      herdId: 'herd_b',
      avgAccuracyM: 4.5,
      pointsCount: 1,
      createdAt: START,
      updatedAt: START,
    },
  ]

  const surveyAreas: SurveyArea[] = [
    {
      id: 'survey_1',
      name: 'Untersuchungsfläche Nord',
      geometry: square(11.02, 46.52),
      areaM2: 9900,
      areaHa: 0.99,
      createdAt: START,
      updatedAt: START,
    },
  ]

  const enclosureAssignments: EnclosureAssignment[] = [
    {
      id: 'assignment_1',
      enclosureId: 'enclosure_draw',
      herdId: 'herd_a',
      count: null,
      startTime: START,
      endTime: null,
      createdAt: START,
      updatedAt: START,
    },
  ]

  const sessions: GrazingSession[] = [
    {
      id: 'session_1',
      herdId: 'herd_a',
      animalCount: 40,
      status: 'finished',
      startTime: START,
      endTime: LATER,
      durationS: 5400,
      movingTimeS: 1200,
      distanceM: 850,
      avgSpeedMps: null,
      avgAccuracyM: null,
      notes: 'Schöner Tag',
      createdAt: START,
      updatedAt: LATER,
    },
  ]

  const trackpoints: TrackPoint[] = [
    {
      id: 'trackpoint_1',
      sessionId: 'session_1',
      enclosureWalkId: null,
      seq: 1,
      timestamp: START,
      lat: 46.5,
      lon: 11.0,
      accuracyM: 5,
      speedMps: null,
      headingDeg: null,
      accepted: true,
    },
    {
      id: 'trackpoint_2',
      sessionId: 'session_1',
      enclosureWalkId: null,
      seq: 2,
      timestamp: '2026-06-01T08:30:00.000Z',
      lat: 46.501,
      lon: 11.001,
      accuracyM: 6,
      speedMps: null,
      headingDeg: null,
      accepted: true,
    },
    {
      id: 'trackpoint_walk_1',
      sessionId: null,
      enclosureWalkId: 'enclosure_walk',
      seq: 1,
      timestamp: START,
      lat: 46.51,
      lon: 11.01,
      accuracyM: 4,
      speedMps: null,
      headingDeg: null,
      accepted: true,
    },
  ]

  const events: SessionEvent[] = [
    {
      id: 'event_start',
      sessionId: 'session_1',
      timestamp: START,
      type: 'start',
      lat: 46.5,
      lon: 11.0,
    },
    {
      id: 'event_note',
      sessionId: 'session_1',
      timestamp: '2026-06-01T08:45:00.000Z',
      type: 'note',
      lat: 46.5005,
      lon: 11.0005,
      comment: 'Wasserstelle geprüft',
    },
    {
      id: 'event_stop',
      sessionId: 'session_1',
      timestamp: LATER,
      type: 'stop',
      lat: 46.501,
      lon: 11.001,
    },
  ]

  const workSessions: WorkSession[] = [
    {
      id: 'work_1',
      type: 'fence',
      activityId: 'guided_fence_work',
      status: 'finished',
      herdId: 'herd_a',
      enclosureId: 'enclosure_draw',
      startTime: START,
      endTime: LATER,
      activeSince: null,
      durationS: 5400,
      reminderIntervalMin: null,
      lastReminderAt: null,
      notes: 'Zaun repariert',
      createdAt: START,
      updatedAt: LATER,
    },
  ]

  const workEvents: WorkEvent[] = [
    {
      id: 'work_event_start',
      workSessionId: 'work_1',
      timestamp: START,
      type: 'start',
    },
    {
      id: 'work_event_stop',
      workSessionId: 'work_1',
      timestamp: LATER,
      type: 'stop',
    },
  ]

  const settings: AppSettings[] = [{ ...defaultAppSettings }]

  return {
    herds,
    animals,
    enclosures,
    surveyAreas,
    enclosureAssignments,
    sessions,
    trackpoints,
    events,
    workSessions,
    workEvents,
    settings,
  }
}

/** Empty "existing database" references — i.e. importing into a fresh install. */
export function emptyExistingRefs(): ExistingImportRefs {
  return {
    animalEarTags: new Map(),
    enclosureIds: new Set(),
    herdIds: new Set(),
    sessionIds: new Set(),
    workSessionIds: new Set(),
  }
}
