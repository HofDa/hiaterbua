import { db } from '@/lib/db/dexie'

export async function deleteHerdCascade(herdId: string) {
  const herdEnclosures = await db.enclosures.where('herdId').equals(herdId).toArray()
  const herdAssignments = await db.enclosureAssignments.where('herdId').equals(herdId).toArray()
  const herdSessions = await db.sessions.where('herdId').equals(herdId).toArray()
  const herdWorkSessions = await db.workSessions.where('herdId').equals(herdId).toArray()
  const herdAnimals = await db.animals.where('herdId').equals(herdId).toArray()

  await db.transaction(
    'rw',
    [
      db.herds,
      db.animals,
      db.enclosures,
      db.enclosureAssignments,
      db.sessions,
      db.trackpoints,
      db.events,
      db.workSessions,
      db.workEvents,
    ],
    async () => {
      for (const enclosure of herdEnclosures) {
        await db.enclosures.update(enclosure.id, {
          herdId: null,
        })
      }

      for (const assignment of herdAssignments) {
        await db.enclosureAssignments.delete(assignment.id)
      }

      for (const animal of herdAnimals) {
        await db.animals.delete(animal.id)
      }

      for (const session of herdSessions) {
        await db.trackpoints.where('sessionId').equals(session.id).delete()
        await db.events.where('sessionId').equals(session.id).delete()
        await db.sessions.delete(session.id)
      }

      for (const workSession of herdWorkSessions) {
        await db.workEvents.where('workSessionId').equals(workSession.id).delete()
        await db.workSessions.delete(workSession.id)
      }

      await db.herds.delete(herdId)
    }
  )
}
