import { db } from '@/lib/db/dexie'
import { defaultAppSettings } from '@/lib/settings/defaults'
import type { Enclosure, Herd } from '@/types/domain'

export async function buildWorkSessionsExportArchive() {
  const workSessions = await db.workSessions.orderBy('startTime').reverse().toArray()

  if (workSessions.length === 0) {
    throw new Error('Keine Arbeitseinsaetze vorhanden.')
  }

  const herdIds = [
    ...new Set(
      workSessions
        .map((session) => session.herdId)
        .filter((herdId): herdId is string => Boolean(herdId))
    ),
  ]
  const enclosureIds = [
    ...new Set(
      workSessions
        .map((session) => session.enclosureId)
        .filter((enclosureId): enclosureId is string => Boolean(enclosureId))
    ),
  ]

  const [workEvents, referencedHerds, referencedEnclosures, settings] = await Promise.all([
    db.workEvents
      .where('workSessionId')
      .anyOf(workSessions.map((session) => session.id))
      .toArray(),
    herdIds.length > 0 ? db.herds.bulkGet(herdIds) : Promise.resolve([] as Array<Herd | undefined>),
    enclosureIds.length > 0
      ? db.enclosures.bulkGet(enclosureIds)
      : Promise.resolve([] as Array<Enclosure | undefined>),
    db.settings.get('app'),
  ])

  const exportTimestamp = new Date().toISOString()
  const sortedWorkEvents = [...workEvents].sort((left, right) =>
    left.timestamp.localeCompare(right.timestamp)
  )
  const herds = referencedHerds
    .filter((herd): herd is Herd => herd !== undefined)
    .sort((left, right) => left.name.localeCompare(right.name, 'de'))
  const enclosures = referencedEnclosures
    .filter((enclosure): enclosure is Enclosure => enclosure !== undefined)
    .sort((left, right) => left.name.localeCompare(right.name, 'de'))

  return {
    blob: new Blob(
      [
        JSON.stringify(
          {
            exportedAt: exportTimestamp,
            app: 'Pastore 1.0',
            exportType: 'work-sessions',
            summary: {
              workSessions: workSessions.length,
              workEvents: sortedWorkEvents.length,
              herds: herds.length,
              enclosures: enclosures.length,
            },
            settings: [settings ?? defaultAppSettings],
            herds,
            enclosures,
            workSessions,
            workEvents: sortedWorkEvents,
          },
          null,
          2
        ),
      ],
      { type: 'application/json' }
    ),
    filename: `pastore-arbeit-${exportTimestamp.slice(0, 10)}.json`,
    counts: {
      workSessions: workSessions.length,
      workEvents: sortedWorkEvents.length,
    },
  }
}
