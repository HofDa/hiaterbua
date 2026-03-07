import Dexie, { type Table } from 'dexie'
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

export class HirtenAppDB extends Dexie {
  herds!: Table<Herd, string>
  animals!: Table<Animal, string>
  enclosures!: Table<Enclosure, string>
  surveyAreas!: Table<SurveyArea, string>
  enclosureAssignments!: Table<EnclosureAssignment, string>
  sessions!: Table<GrazingSession, string>
  trackpoints!: Table<TrackPoint, string>
  events!: Table<SessionEvent, string>
  workSessions!: Table<WorkSession, string>
  workEvents!: Table<WorkEvent, string>
  settings!: Table<AppSettings, 'app'>

  constructor() {
    super('hirtenapp-db')

    this.version(2).stores({
      herds: 'id, name, isArchived, updatedAt',
      animals: 'id, herdId, earTag, species, isArchived, updatedAt',
      enclosures: 'id, name, method, herdId, createdAt, updatedAt',
      enclosureAssignments: 'id, enclosureId, herdId, startTime, endTime, updatedAt',
      sessions: 'id, herdId, status, startTime, endTime, updatedAt',
      trackpoints: 'id, sessionId, enclosureWalkId, seq, timestamp, accepted',
      events: 'id, sessionId, timestamp, type',
      settings: 'id',
    })

    this.version(3).stores({
      herds: 'id, name, isArchived, updatedAt',
      animals: 'id, herdId, earTag, species, isArchived, updatedAt',
      enclosures: 'id, name, method, herdId, createdAt, updatedAt',
      surveyAreas: 'id, name, createdAt, updatedAt',
      enclosureAssignments: 'id, enclosureId, herdId, startTime, endTime, updatedAt',
      sessions: 'id, herdId, status, startTime, endTime, updatedAt',
      trackpoints: 'id, sessionId, enclosureWalkId, seq, timestamp, accepted',
      events: 'id, sessionId, timestamp, type',
      workSessions: 'id, type, status, herdId, enclosureId, startTime, endTime, updatedAt',
      workEvents: 'id, workSessionId, timestamp, type',
      settings: 'id',
    })

    this.version(4).stores({
      herds: 'id, name, isArchived, updatedAt',
      animals: 'id, herdId, earTag, species, isArchived, updatedAt',
      enclosures: 'id, name, method, herdId, createdAt, updatedAt',
      surveyAreas: 'id, name, createdAt, updatedAt',
      enclosureAssignments: 'id, enclosureId, herdId, startTime, endTime, updatedAt',
      sessions: 'id, herdId, status, startTime, endTime, updatedAt',
      trackpoints: 'id, sessionId, enclosureWalkId, seq, timestamp, accepted',
      events: 'id, sessionId, timestamp, type',
      workSessions: 'id, type, status, herdId, enclosureId, startTime, endTime, updatedAt',
      workEvents: 'id, workSessionId, timestamp, type',
      settings: 'id',
    })

    this.version(5).stores({
      herds: 'id, name, isArchived, updatedAt',
      animals: 'id, herdId, earTag, species, isArchived, updatedAt',
      enclosures:
        'id, name, method, herdId, rootEnclosureId, version, supersededAt, supersededByEnclosureId, createdAt, updatedAt',
      surveyAreas: 'id, name, createdAt, updatedAt',
      enclosureAssignments: 'id, enclosureId, herdId, startTime, endTime, updatedAt',
      sessions: 'id, herdId, status, startTime, endTime, updatedAt',
      trackpoints: 'id, sessionId, enclosureWalkId, seq, timestamp, accepted',
      events: 'id, sessionId, timestamp, type',
      workSessions: 'id, type, status, herdId, enclosureId, startTime, endTime, updatedAt',
      workEvents: 'id, workSessionId, timestamp, type',
      settings: 'id',
    })

    this.version(6).stores({
      herds: 'id, name, isArchived, updatedAt',
      animals: 'id, herdId, earTag, species, isArchived, updatedAt',
      enclosures:
        'id, name, method, herdId, rootEnclosureId, version, supersededAt, supersededByEnclosureId, createdAt, updatedAt',
      surveyAreas: 'id, name, createdAt, updatedAt',
      enclosureAssignments: 'id, enclosureId, herdId, startTime, endTime, updatedAt',
      sessions: 'id, herdId, status, startTime, endTime, updatedAt',
      trackpoints: 'id, sessionId, enclosureWalkId, seq, timestamp, accepted',
      events: 'id, sessionId, timestamp, type',
      workSessions: 'id, type, status, herdId, enclosureId, startTime, endTime, updatedAt',
      workEvents: 'id, workSessionId, timestamp, type',
      settings: 'id',
    })

    this.version(7).stores({
      herds: 'id, name, isArchived, updatedAt',
      animals: 'id, herdId, earTag, species, isArchived, updatedAt',
      enclosures:
        'id, name, method, herdId, rootEnclosureId, version, supersededAt, supersededByEnclosureId, createdAt, updatedAt',
      surveyAreas: 'id, name, createdAt, updatedAt',
      enclosureAssignments: 'id, enclosureId, herdId, startTime, endTime, updatedAt',
      sessions: 'id, herdId, status, startTime, endTime, updatedAt',
      trackpoints: 'id, sessionId, enclosureWalkId, seq, timestamp, accepted',
      events: 'id, sessionId, timestamp, type',
      workSessions: 'id, type, status, herdId, enclosureId, startTime, endTime, updatedAt',
      workEvents: 'id, workSessionId, timestamp, type',
      settings: 'id',
    })
  }
}

export const db = new HirtenAppDB()
