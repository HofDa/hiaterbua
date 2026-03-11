import { db } from '@/lib/db/dexie'
import { defaultAppSettings } from '@/lib/settings/defaults'
import {
  buildHerdExportBundles,
  sanitizeFilenamePart,
} from '@/lib/import-export/file-formats'
import type { Enclosure, SessionEvent, TrackPoint, WorkEvent } from '@/types/domain'

export async function buildSingleHerdExportArchive(herdId: string) {
  const herd = await db.herds.get(herdId)

  if (!herd) {
    throw new Error('Gewählte Herde wurde nicht gefunden.')
  }

  const [animals, enclosureAssignments, sessions, workSessions, directHerdEnclosures, settings] =
    await Promise.all([
      db.animals.where('herdId').equals(herd.id).toArray(),
      db.enclosureAssignments.where('herdId').equals(herd.id).toArray(),
      db.sessions.where('herdId').equals(herd.id).toArray(),
      db.workSessions.where('herdId').equals(herd.id).toArray(),
      db.enclosures.where('herdId').equals(herd.id).toArray(),
      db.settings.get('app'),
    ])

  const relatedEnclosureIds = [
    ...new Set(
      [
        ...enclosureAssignments.map((assignment) => assignment.enclosureId),
        ...workSessions
          .map((session) => session.enclosureId)
          .filter((enclosureId): enclosureId is string => Boolean(enclosureId)),
      ].filter(
        (enclosureId) => !directHerdEnclosures.some((enclosure) => enclosure.id === enclosureId)
      )
    ),
  ]

  const [trackpoints, events, workEvents, referencedEnclosures] = await Promise.all([
    sessions.length > 0
      ? db.trackpoints
          .where('sessionId')
          .anyOf(sessions.map((session) => session.id))
          .toArray()
      : Promise.resolve([] as TrackPoint[]),
    sessions.length > 0
      ? db.events
          .where('sessionId')
          .anyOf(sessions.map((session) => session.id))
          .toArray()
      : Promise.resolve([] as SessionEvent[]),
    workSessions.length > 0
      ? db.workEvents
          .where('workSessionId')
          .anyOf(workSessions.map((session) => session.id))
          .toArray()
      : Promise.resolve([] as WorkEvent[]),
    relatedEnclosureIds.length > 0
      ? db.enclosures.bulkGet(relatedEnclosureIds)
      : Promise.resolve([] as Array<Enclosure | undefined>),
  ])

  const bundle = buildHerdExportBundles({
    herds: [herd],
    animals,
    enclosures: [
      ...directHerdEnclosures,
      ...referencedEnclosures.filter(
        (enclosure): enclosure is Enclosure =>
          enclosure !== undefined &&
          !directHerdEnclosures.some((existing) => existing.id === enclosure.id)
      ),
    ],
    enclosureAssignments,
    sessions,
    trackpoints,
    events,
    workSessions,
    workEvents,
  })[0]

  return {
    blob: new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            app: 'Pastore 1.0',
            settings: [settings ?? defaultAppSettings],
            herd: bundle,
          },
          null,
          2
        ),
      ],
      { type: 'application/json' }
    ),
    filename: `pastore-herde-${sanitizeFilenamePart(herd.name)}-${new Date().toISOString().slice(0, 10)}.json`,
    herdName: herd.name,
  }
}
