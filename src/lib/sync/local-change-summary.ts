import { db } from '@/lib/db/dexie'
import { getRecordChangeTimestamp } from '@/lib/sync/local-metadata'

const LOCAL_DATA_TABLES = [
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
] as const

export type LocalChangeSummary = {
  recordCount: number
  dirtyCount: number
  latestLocalChangeAt: string | null
}

export async function getLocalChangeSummary(): Promise<LocalChangeSummary> {
  const tableRecords = await Promise.all(
    LOCAL_DATA_TABLES.map((tableName) => db.table(tableName).toArray())
  )
  const records = tableRecords.flat() as Array<Record<string, unknown>>

  const timestamps = records
    .map((record) => getRecordChangeTimestamp(record, ''))
    .filter((value) => value.length > 0)

  return {
    recordCount: records.length,
    dirtyCount: records.filter((record) => record.syncStatus === 'dirty').length,
    latestLocalChangeAt:
      timestamps.length > 0
        ? timestamps.reduce((latest, value) => (value > latest ? value : latest))
        : null,
  }
}

export function hasLocalChangesSinceBackup(
  latestLocalChangeAt: string | null,
  lastExportAt: string | null | undefined
) {
  if (!latestLocalChangeAt) return false
  if (!lastExportAt) return true
  return new Date(latestLocalChangeAt).getTime() > new Date(lastExportAt).getTime()
}

