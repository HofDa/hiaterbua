import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db/dexie'
import { useAsyncOperation } from './use-async-operation'
import type { GrazingSession, SessionEvent, TrackPoint } from '@/types/domain'

export interface GrazingSessionStats {
  totalSessions: number
  activeSessions: number
  finishedSessions: number
  totalDuration: number
  totalDistance: number
  averageSessionDuration: number
  averageSessionDistance: number
  sessionsByHerd: Array<{ herdId: string; herdName: string; sessionCount: number }>
}

export interface UseGrazingSessionsReturn {
  sessions: GrazingSession[] | undefined
  activeSession: GrazingSession | null | undefined
  sessionStats: GrazingSessionStats | undefined
  
  // Actions
  createSession: (herdId: string, animalCount?: number) => Promise<GrazingSession | null>
  updateSessionStatus: (sessionId: string, status: 'active' | 'paused' | 'finished') => Promise<boolean>
  addSessionEvent: (sessionId: string, type: string, comment?: string, lat?: number, lon?: number) => Promise<boolean>
  addTrackPoint: (sessionId: string, lat: number, lon: number, accuracy?: number, speed?: number, heading?: number) => Promise<boolean>
  deleteSession: (sessionId: string) => Promise<boolean>
  useSessionEvents: (sessionId: string) => SessionEvent[] | undefined
  useSessionTrackPoints: (sessionId: string) => TrackPoint[] | undefined
}

export function useGrazingSessions(): UseGrazingSessionsReturn {
  const createOperation = useAsyncOperation<GrazingSession>()
  const updateOperation = useAsyncOperation<boolean>()
  const eventOperation = useAsyncOperation<SessionEvent>()
  const trackOperation = useAsyncOperation<TrackPoint>()
  const deleteOperation = useAsyncOperation<boolean>()

  // Query all sessions
  const sessions = useLiveQuery(
    () => db.sessions.orderBy('startTime').reverse().toArray(),
    []
  )

  // Query active session
  const activeSession = useLiveQuery(
    () => db.sessions
      .where('status')
      .anyOf(['active', 'paused'])
      .first(),
    []
  )

  // Query session statistics
  const sessionStats = useLiveQuery(async () => {
    const [allSessions, allHerds] = await Promise.all([
      db.sessions.toArray(),
      db.herds.toArray()
    ])

    const activeSessions = allSessions.filter(s => s.status === 'active' || s.status === 'paused')
    const finishedSessions = allSessions.filter(s => s.status === 'finished')
    
    const totalDuration = allSessions.reduce((sum, session) => sum + session.durationS, 0)
    const totalDistance = allSessions.reduce((sum, session) => sum + session.distanceM, 0)
    
    const sessionsByHerd = allHerds.map(herd => ({
      herdId: herd.id,
      herdName: herd.name,
      sessionCount: allSessions.filter(session => session.herdId === herd.id).length
    }))

    return {
      totalSessions: allSessions.length,
      activeSessions: activeSessions.length,
      finishedSessions: finishedSessions.length,
      totalDuration,
      totalDistance,
      averageSessionDuration: allSessions.length > 0 ? totalDuration / allSessions.length : 0,
      averageSessionDistance: allSessions.length > 0 ? totalDistance / allSessions.length : 0,
      sessionsByHerd
    }
  }, [])

  const createSession = async (herdId: string, animalCount?: number): Promise<GrazingSession | null> => {
    const sessionId = crypto.randomUUID()
    const now = new Date().toISOString()

    const newSession: GrazingSession = {
      id: sessionId,
      herdId,
      animalCount,
      status: 'active',
      startTime: now,
      durationS: 0,
      movingTimeS: 0,
      distanceM: 0,
      avgAccuracyM: null,
      notes: '',
      createdAt: now,
      updatedAt: now
    }

    const result = await createOperation.execute(
      async () => {
        await db.sessions.add(newSession)
        return newSession
      },
      {
        loadingMessage: 'Weidegang wird gestartet...',
        successMessage: 'Weidegang gestartet'
      }
    )

    return result.success ? result.data : null
  }

  const updateSessionStatus = async (sessionId: string, status: 'active' | 'paused' | 'finished'): Promise<boolean> => {
    const result = await updateOperation.execute(
      async () => {
        const session = await db.sessions.get(sessionId)
        if (!session) {
          throw new Error('Session not found')
        }

        const now = new Date().toISOString()
        const updates: Partial<GrazingSession> = {
          status,
          updatedAt: now
        }

        if (status === 'finished') {
          updates.endTime = now
          updates.durationS = Math.floor((new Date(now).getTime() - new Date(session.startTime).getTime()) / 1000)
        }

        await db.sessions.update(sessionId, updates)
        return true
      },
      {
        loadingMessage: 'Status wird aktualisiert...',
        successMessage: `Status aktualisiert: ${status === 'active' ? 'Aktiv' : status === 'paused' ? 'Pausiert' : 'Beendet'}`
      }
    )

    return result.success
  }

  const addSessionEvent = async (
    sessionId: string, 
    type: string, 
    comment?: string, 
    lat?: number, 
    lon?: number
  ): Promise<boolean> => {
    const eventId = crypto.randomUUID()
    const now = new Date().toISOString()

    const newEvent: SessionEvent = {
      id: eventId,
      sessionId,
      timestamp: now,
      type: type as 'water' | 'rest' | 'move' | 'disturbance' | 'note' | 'start' | 'pause' | 'resume' | 'stop', // Type assertion for predefined event types
      comment,
      lat,
      lon
    }

    const result = await eventOperation.execute(
      async () => {
        await db.events.add(newEvent)
        return newEvent
      },
      {
        loadingMessage: 'Ereignis wird hinzugefügt...',
        successMessage: 'Ereignis hinzugefügt'
      }
    )

    return result.success
  }

  const addTrackPoint = async (
    sessionId: string,
    lat: number,
    lon: number,
    accuracy?: number,
    speed?: number,
    heading?: number
  ): Promise<boolean> => {
    const trackId = crypto.randomUUID()
    const now = new Date().toISOString()

    // Get sequence number
    const allTrackPoints = await db.trackpoints.toArray()
    const lastTrackPoint = allTrackPoints
      .filter(tp => tp.sessionId === sessionId)
      .sort((a, b) => b.seq - a.seq)[0]

    const seq = (lastTrackPoint?.seq || 0) + 1

    const newTrackPoint: TrackPoint = {
      id: trackId,
      sessionId,
      seq,
      timestamp: now,
      lat,
      lon,
      accuracyM: accuracy,
      speedMps: speed,
      headingDeg: heading,
      accepted: true
    }

    const result = await trackOperation.execute(
      async () => {
        await db.trackpoints.add(newTrackPoint)
        return newTrackPoint
      },
      {
        loadingMessage: 'Trackpunkt wird gespeichert...',
        // Don't show success message for track points to avoid spam
        successMessage: ''
      }
    )

    return result.success
  }

  const deleteSession = async (sessionId: string): Promise<boolean> => {
    const result = await deleteOperation.execute(
      async () => {
        // Delete session and related data
        await db.transaction('rw', db.sessions, db.events, db.trackpoints, async () => {
          await db.sessions.delete(sessionId)
          await db.events.where('sessionId').equals(sessionId).delete()
          await db.trackpoints.where('sessionId').equals(sessionId).delete()
        })
        return true
      },
      {
        loadingMessage: 'Weidegang wird gelöscht...',
        successMessage: 'Weidegang gelöscht'
      }
    )

    return result.success
  }

  const useSessionEvents = (sessionId: string) => {
    return useLiveQuery(
      () => {
        const allEvents = db.events.toArray()
        return allEvents.then(events => 
          events.filter(event => event.sessionId === sessionId)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        )
      },
      [sessionId]
    )
  }

  const useSessionTrackPoints = (sessionId: string) => {
    return useLiveQuery(
      () => {
        const allTrackPoints = db.trackpoints.toArray()
        return allTrackPoints.then(points => 
          points.filter(point => point.sessionId === sessionId)
            .sort((a, b) => a.seq - b.seq)
        )
      },
      [sessionId]
    )
  }

  return {
    sessions,
    activeSession,
    sessionStats,
    createSession,
    updateSessionStatus,
    addSessionEvent,
    addTrackPoint,
    deleteSession,
    useSessionEvents,
    useSessionTrackPoints
  }
}
