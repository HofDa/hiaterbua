import Dexie, { type Table } from 'dexie'
import { defaultAppSettings } from '@/lib/settings/defaults'
import {
  buildLocalChangeMetadata,
  getRecordChangeTimestamp,
} from '@/lib/sync/local-metadata'
import type {
  Animal,
  AppSettings,
  CareMonitoringCheck,
  ConservationPlan,
  Enclosure,
  EnclosureAssignment,
  FieldDiagnosticEvent,
  GrazingSession,
  Herd,
  SessionEvent,
  SurveyArea,
  TrackPoint,
  WorkEvent,
  WorkSession,
  TargetPercent,
} from '@/types/domain'

export class HirtenAppDB extends Dexie {
  herds!: Table<Herd, string>
  animals!: Table<Animal, string>
  enclosures!: Table<Enclosure, string>
  conservationPlans!: Table<ConservationPlan, string>
  careMonitoringChecks!: Table<CareMonitoringCheck, string>
  surveyAreas!: Table<SurveyArea, string>
  enclosureAssignments!: Table<EnclosureAssignment, string>
  sessions!: Table<GrazingSession, string>
  trackpoints!: Table<TrackPoint, string>
  events!: Table<SessionEvent, string>
  workSessions!: Table<WorkSession, string>
  workEvents!: Table<WorkEvent, string>
  fieldDiagnostics!: Table<FieldDiagnosticEvent, string>
  settings!: Table<AppSettings, 'app'>

  constructor() {
    super('hirtenapp-db')

    this.version(1).stores({
      herds: 'id, name, isArchived, updatedAt',
      animals: 'id, herdId, earTag, species, isArchived, updatedAt',
      enclosures: 'id, name, method, herdId, createdAt, updatedAt',
      enclosureAssignments: 'id, enclosureId, herdId, startTime, endTime, updatedAt',
      sessions: 'id, herdId, status, startTime, endTime, updatedAt',
      trackpoints: 'id, sessionId, enclosureWalkId, seq, timestamp, accepted',
      events: 'id, sessionId, timestamp, type',
    })

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

    // Versions 4, 6 and 7 were no-op schema bumps (identical to 3 and 5) and
    // have been removed. The gaps in the numbering are intentional: the version
    // number is part of the stored-DB contract, so existing installs that were
    // created at those versions still upgrade cleanly to the current version.
    this.version(8)
      .stores({
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
      .upgrade(async (tx) => {
        const settingsTable = tx.table<AppSettings, 'app'>('settings')
        const existingSettings = await settingsTable.get('app')

        if (!existingSettings) {
          await settingsTable.put(defaultAppSettings)
        }
      })

    this.version(9).stores({
      herds: 'id, name, isArchived, updatedAt',
      animals: 'id, herdId, earTag, species, isArchived, updatedAt',
      enclosures:
        'id, name, method, herdId, rootEnclosureId, version, supersededAt, supersededByEnclosureId, createdAt, updatedAt',
      surveyAreas: 'id, name, createdAt, updatedAt',
      enclosureAssignments: 'id, enclosureId, herdId, startTime, endTime, updatedAt',
      sessions: 'id, herdId, status, startTime, endTime, updatedAt',
      trackpoints: 'id, sessionId, enclosureWalkId, seq, timestamp, accepted, [sessionId+seq]',
      events: 'id, sessionId, timestamp, type',
      workSessions: 'id, type, status, herdId, enclosureId, startTime, endTime, updatedAt',
      workEvents: 'id, workSessionId, timestamp, type',
      settings: 'id',
    })

    this.version(10)
      .stores({
        herds: 'id, name, isArchived, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        animals:
          'id, herdId, earTag, species, isArchived, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        enclosures:
          'id, name, method, herdId, rootEnclosureId, version, supersededAt, supersededByEnclosureId, createdAt, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        surveyAreas: 'id, name, createdAt, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        enclosureAssignments:
          'id, enclosureId, herdId, startTime, endTime, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        sessions:
          'id, herdId, status, startTime, endTime, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        trackpoints:
          'id, sessionId, enclosureWalkId, seq, timestamp, accepted, [sessionId+seq], syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        events: 'id, sessionId, timestamp, type, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        workSessions:
          'id, type, status, herdId, enclosureId, startTime, endTime, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        workEvents: 'id, workSessionId, timestamp, type, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        const localTables = [
          'herds',
          'animals',
          'enclosures',
          'surveyAreas',
          'enclosureAssignments',
          'sessions',
          'trackpoints',
          'events',
          'workSessions',
          'workEvents',
        ]

        for (const tableName of localTables) {
          await tx.table(tableName).toCollection().modify((record: Record<string, unknown>) => {
            const timestamp = getRecordChangeTimestamp(record)
            const metadata = buildLocalChangeMetadata(timestamp)

            if (record.createdAt === undefined) {
              record.createdAt = timestamp
            }

            if (record.updatedAt === undefined) {
              record.updatedAt = timestamp
            }

            record.deletedAt = record.deletedAt ?? metadata.deletedAt
            record.deviceId = record.deviceId ?? metadata.deviceId
            record.syncStatus = record.syncStatus ?? metadata.syncStatus
            record.lastLocalChangeAt = record.lastLocalChangeAt ?? metadata.lastLocalChangeAt
          })
        }
      })

    this.version(11).stores({
      herds: 'id, name, isArchived, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      animals:
        'id, herdId, earTag, species, isArchived, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      enclosures:
        'id, name, method, herdId, rootEnclosureId, version, supersededAt, supersededByEnclosureId, createdAt, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      surveyAreas: 'id, name, createdAt, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      enclosureAssignments:
        'id, enclosureId, herdId, startTime, endTime, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      sessions:
        'id, herdId, status, startTime, endTime, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      trackpoints:
        'id, sessionId, enclosureWalkId, seq, timestamp, accepted, [sessionId+seq], syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      events: 'id, sessionId, timestamp, type, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      workSessions:
        'id, type, status, herdId, enclosureId, startTime, endTime, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      workEvents: 'id, workSessionId, timestamp, type, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      fieldDiagnostics: 'id, type, level, createdAt',
      settings: 'id',
    })

    this.version(12).stores({
      herds: 'id, name, isArchived, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      animals:
        'id, herdId, earTag, species, isArchived, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      enclosures:
        'id, name, method, herdId, rootEnclosureId, version, supersededAt, supersededByEnclosureId, createdAt, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      conservationPlans:
        'id, &enclosureId, habitatType, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      surveyAreas: 'id, name, createdAt, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      enclosureAssignments:
        'id, enclosureId, herdId, startTime, endTime, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      sessions:
        'id, herdId, status, startTime, endTime, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      trackpoints:
        'id, sessionId, enclosureWalkId, seq, timestamp, accepted, [sessionId+seq], syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      events: 'id, sessionId, timestamp, type, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      workSessions:
        'id, type, status, herdId, enclosureId, startTime, endTime, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      workEvents: 'id, workSessionId, timestamp, type, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      fieldDiagnostics: 'id, type, level, createdAt',
      settings: 'id',
    })

    this.version(13)
      .stores({
        herds: 'id, name, isArchived, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        animals:
          'id, herdId, earTag, species, isArchived, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        enclosures:
          'id, name, method, herdId, rootEnclosureId, version, supersededAt, supersededByEnclosureId, createdAt, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        conservationPlans:
          'id, &enclosureId, habitatType, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        surveyAreas: 'id, name, createdAt, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        enclosureAssignments:
          'id, enclosureId, herdId, startTime, endTime, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        sessions:
          'id, herdId, status, startTime, endTime, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        trackpoints:
          'id, sessionId, enclosureWalkId, seq, timestamp, accepted, [sessionId+seq], syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        events: 'id, sessionId, timestamp, type, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        workSessions:
          'id, type, status, herdId, enclosureId, startTime, endTime, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        workEvents: 'id, workSessionId, timestamp, type, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        fieldDiagnostics: 'id, type, level, createdAt',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        await tx.table('conservationPlans').toCollection().modify((record: Record<string, unknown>) => {
          migrateLegacyConservationPlanRecord(record)
        })
      })

    this.version(14).stores({
      herds: 'id, name, isArchived, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      animals:
        'id, herdId, earTag, species, isArchived, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      enclosures:
        'id, name, method, herdId, rootEnclosureId, version, supersededAt, supersededByEnclosureId, createdAt, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      conservationPlans:
        'id, &enclosureId, habitatType, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      careMonitoringChecks:
        'id, enclosureId, conservationPlanId, grazingSessionId, observedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      surveyAreas: 'id, name, createdAt, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      enclosureAssignments:
        'id, enclosureId, herdId, startTime, endTime, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      sessions:
        'id, herdId, status, startTime, endTime, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      trackpoints:
        'id, sessionId, enclosureWalkId, seq, timestamp, accepted, [sessionId+seq], syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      events: 'id, sessionId, timestamp, type, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      workSessions:
        'id, type, status, herdId, enclosureId, startTime, endTime, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      workEvents: 'id, workSessionId, timestamp, type, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
      fieldDiagnostics: 'id, type, level, createdAt',
      settings: 'id',
    })

    this.version(15)
      .stores({
        herds: 'id, name, isArchived, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        animals:
          'id, herdId, earTag, species, isArchived, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        enclosures:
          'id, name, method, herdId, rootEnclosureId, version, supersededAt, supersededByEnclosureId, createdAt, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        conservationPlans:
          'id, &enclosureId, habitatType, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        careMonitoringChecks:
          'id, enclosureId, conservationPlanId, grazingSessionId, observedAt, [enclosureId+observedAt], syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        surveyAreas: 'id, name, createdAt, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        enclosureAssignments:
          'id, enclosureId, herdId, startTime, endTime, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        sessions:
          'id, herdId, status, startTime, endTime, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        trackpoints:
          'id, sessionId, enclosureWalkId, seq, timestamp, accepted, [sessionId+seq], syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        events: 'id, sessionId, timestamp, type, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        workSessions:
          'id, type, status, herdId, enclosureId, startTime, endTime, updatedAt, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        workEvents: 'id, workSessionId, timestamp, type, syncStatus, lastLocalChangeAt, deletedAt, deviceId',
        fieldDiagnostics: 'id, type, level, createdAt',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        await tx.table('careMonitoringChecks').toCollection().modify((record: Record<string, unknown>) => {
          record.assessmentVersion = record.assessmentVersion ?? 1
          const timestamp = getRecordChangeTimestamp(record)
          const metadata = buildLocalChangeMetadata(timestamp)
          record.deletedAt = record.deletedAt ?? metadata.deletedAt
          record.deviceId = record.deviceId ?? metadata.deviceId
          record.syncStatus = record.syncStatus ?? metadata.syncStatus
          record.lastLocalChangeAt = record.lastLocalChangeAt ?? metadata.lastLocalChangeAt
        })
      })
  }
}

export function migrateLegacyConservationPlanRecord(record: Record<string, unknown>): void {
  const hasLegacyShape =
    'targetUsePercent' in record || 'goals' in record || !('vegetationUse' in record)

  if (!hasLegacyShape && record.vegetationUse) {
    return
  }

  const legacyTargetUse = record.targetUsePercent
  const targetPercent: TargetPercent =
    legacyTargetUse === 25 || legacyTargetUse === 50 || legacyTargetUse === 75 || legacyTargetUse === 100
      ? legacyTargetUse
      : 75

  const legacyGoals = Array.isArray(record.goals) ? (record.goals as string[]) : []

  const legacyPlants = Array.isArray(record.protectedPlants) ? record.protectedPlants : []
  const protectedPlants: string[] = []
  for (const plant of legacyPlants) {
    if (typeof plant === 'string') {
      const trimmed = plant.trim()
      if (trimmed && !protectedPlants.some((p) => p.toLowerCase() === trimmed.toLowerCase())) {
        protectedPlants.push(trimmed)
      }
    } else if (typeof plant === 'object' && plant !== null && 'name' in plant) {
      const trimmed = String(plant.name).trim()
      if (trimmed && !protectedPlants.some((p) => p.toLowerCase() === trimmed.toLowerCase())) {
        protectedPlants.push(trimmed)
      }
    }
  }

  record.vegetationUse = {
    targetPercent,
    protectedPlants,
    manualRemovalPlants: [],
  }

  record.litterReduction = {
    enabled: legacyGoals.includes('reduce_thatch'),
  }

  // Do NOT invent a scrubReduction target during migration if no old equivalent exists.
  // Use a nullable/optional migration state if needed rather than fabricating data.
  record.scrubReduction = {
    targetPercent: null,
    protectedWoodyPlants: [],
    manualRemovalWoodyPlants: [],
  }

  record.openSoil = {
    mode: legacyGoals.includes('create_open_soil') ? 'punctual_desired' : 'not_desired',
  }

  record.nutrientInput = {
    mode: legacyGoals.includes('avoid_nutrients') ? 'avoid' : 'desired',
  }

  delete record.targetUsePercent
  delete record.goals
  delete record.protectedPlants
}

export const db = new HirtenAppDB()
