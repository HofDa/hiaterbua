import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/dexie'

export function useWorkSessions() {
  const workSessions = useLiveQuery(
    () => db.workSessions.orderBy('startTime').reverse().toArray(),
    []
  )

  const workEvents = useLiveQuery(
    () => db.workEvents.toArray(),
    []
  )

  const activeWorkSession = useLiveQuery(
    () => db.workSessions
      .where('status')
      .anyOf(['active', 'paused'])
      .first(),
    []
  )

  const workSessionCounts = useLiveQuery(async () => {
    const [sessions, events] = await Promise.all([
      db.workSessions.toArray(),
      db.workEvents.toArray()
    ])

    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'active' || s.status === 'paused').length,
      totalEvents: events.length
    }
  }, [])

    const useWorkSessionEvents = (sessionId: string) => {
    return useLiveQuery(
      () => db.workEvents
        .where('workSessionId')
        .equals(sessionId)
        .toArray(),
      [sessionId]
    )
  }

  return {
    workSessions,
    workEvents,
    activeWorkSession,
    workSessionCounts,
    useWorkSessionEvents,
  }
}
