import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '@/lib/db/dexie'
import { buildSurveyAreaFeatureCollection } from '@/lib/maps/map-core'
import {
  buildEditableTrackpointsFeatureCollection,
  buildMergedSessionEventFeatureCollection,
  buildSessionHistoryStats,
  buildSessionMetrics,
  buildTrackpointsFeatureCollection,
  buildTrackpointsFromEditableTrackpoints,
  groupSessionHistoryByDay,
  type EditableTrackPoint,
} from '@/lib/maps/grazing-session-map-helpers'

type UseGrazingSessionMapDataArgs = {
  currentSessionId: string | null
  selectedSessionId: string | null
  selectedSurveyAreaId: string | null
  editTrackpoints: EditableTrackPoint[]
  liveDurationTick: number
}

export function useGrazingSessionMapData({
  currentSessionId,
  selectedSessionId,
  selectedSurveyAreaId,
  editTrackpoints,
  liveDurationTick,
}: UseGrazingSessionMapDataArgs) {
  const herds = useLiveQuery(() => db.herds.orderBy('name').toArray(), [])
  const surveyAreas = useLiveQuery(
    () => db.surveyAreas.orderBy('updatedAt').reverse().toArray(),
    []
  )
  const settings = useLiveQuery(() => db.settings.get('app'), [])
  const activeSession = useLiveQuery(async () => {
    const sessions = await db.sessions.orderBy('updatedAt').reverse().toArray()
    return (
      sessions.find((session) => session.status === 'active' || session.status === 'paused') ??
      null
    )
  }, [])
  const recentSessions = useLiveQuery(
    () => db.sessions.orderBy('updatedAt').reverse().toArray(),
    []
  )

  const currentTrackpoints = useLiveQuery(async () => {
    if (!currentSessionId) return []
    return db.trackpoints.where('sessionId').equals(currentSessionId).sortBy('seq')
  }, [currentSessionId])

  const selectedTrackpoints = useLiveQuery(async () => {
    if (!selectedSessionId) return []
    return db.trackpoints.where('sessionId').equals(selectedSessionId).sortBy('seq')
  }, [selectedSessionId])

  const currentSessionEvents = useLiveQuery(async () => {
    if (!currentSessionId) return []
    const events = await db.events.where('sessionId').equals(currentSessionId).sortBy('timestamp')
    return events.reverse()
  }, [currentSessionId])

  const selectedSessionEvents = useLiveQuery(async () => {
    if (!selectedSessionId) return []
    const events = await db.events.where('sessionId').equals(selectedSessionId).sortBy('timestamp')
    return events.reverse()
  }, [selectedSessionId])

  const safeHerds = useMemo(
    () => (herds ?? []).filter((herd) => !herd.isArchived),
    [herds]
  )
  const safeSurveyAreas = useMemo(() => surveyAreas ?? [], [surveyAreas])
  const safeRecentSessions = useMemo(() => recentSessions ?? [], [recentSessions])
  const safeCurrentTrackpoints = useMemo(() => currentTrackpoints ?? [], [currentTrackpoints])
  const safeSelectedTrackpoints = useMemo(() => selectedTrackpoints ?? [], [selectedTrackpoints])
  const safeCurrentSessionEvents = useMemo(
    () => currentSessionEvents ?? [],
    [currentSessionEvents]
  )
  const safeSelectedSessionEvents = useMemo(
    () => selectedSessionEvents ?? [],
    [selectedSessionEvents]
  )

  const currentSession = useMemo(
    () =>
      currentSessionId
        ? (activeSession?.id === currentSessionId
            ? activeSession
            : safeRecentSessions.find((session) => session.id === currentSessionId)) ?? null
        : null,
    [activeSession, currentSessionId, safeRecentSessions]
  )
  const selectedSession = useMemo(
    () =>
      selectedSessionId
        ? safeRecentSessions.find((session) => session.id === selectedSessionId) ?? null
        : null,
    [safeRecentSessions, selectedSessionId]
  )
  const selectedSurveyArea = useMemo(
    () =>
      selectedSurveyAreaId
        ? safeSurveyAreas.find((surveyArea) => surveyArea.id === selectedSurveyAreaId) ?? null
        : null,
    [safeSurveyAreas, selectedSurveyAreaId]
  )

  const currentTrackFeatureCollection = useMemo(
    () => buildTrackpointsFeatureCollection(safeCurrentTrackpoints),
    [safeCurrentTrackpoints]
  )
  const selectedTrackFeatureCollection = useMemo(
    () => buildTrackpointsFeatureCollection(safeSelectedTrackpoints),
    [safeSelectedTrackpoints]
  )
  const editTrackFeatureCollection = useMemo(
    () => buildEditableTrackpointsFeatureCollection(editTrackpoints),
    [editTrackpoints]
  )
  const surveyAreaFeatureCollection = useMemo(
    () => buildSurveyAreaFeatureCollection(safeSurveyAreas),
    [safeSurveyAreas]
  )
  const sessionEventFeatureCollection = useMemo(
    () =>
      buildMergedSessionEventFeatureCollection(
        safeCurrentSessionEvents,
        safeSelectedSessionEvents
      ),
    [safeCurrentSessionEvents, safeSelectedSessionEvents]
  )

  const currentMetrics = useMemo(() => {
    if (!currentSession) return null

    const effectiveEndTime =
      currentSession.status === 'active'
        ? new Date(liveDurationTick).toISOString()
        : currentSession.status === 'finished'
          ? currentSession.endTime
          : currentSession.updatedAt

    return buildSessionMetrics(safeCurrentTrackpoints, currentSession.startTime, effectiveEndTime)
  }, [currentSession, liveDurationTick, safeCurrentTrackpoints])

  const selectedMetrics = useMemo(
    () =>
      selectedSession
        ? buildSessionMetrics(
            safeSelectedTrackpoints,
            selectedSession.startTime,
            selectedSession.endTime
          )
        : null,
    [safeSelectedTrackpoints, selectedSession]
  )

  const sessionHistoryStats = useMemo(
    () => buildSessionHistoryStats(safeRecentSessions),
    [safeRecentSessions]
  )
  const groupedSessionHistory = useMemo(
    () => groupSessionHistoryByDay(safeRecentSessions),
    [safeRecentSessions]
  )

  const editMetrics = useMemo(() => {
    if (!selectedSession) return null

    const nextTrackpoints = buildTrackpointsFromEditableTrackpoints(
      editTrackpoints,
      selectedSession.id
    )

    return buildSessionMetrics(nextTrackpoints, selectedSession.startTime, selectedSession.endTime)
  }, [editTrackpoints, selectedSession])

  return {
    settings,
    activeSession,
    safeHerds,
    safeSurveyAreas,
    safeRecentSessions,
    safeCurrentTrackpoints,
    safeSelectedTrackpoints,
    safeCurrentSessionEvents,
    safeSelectedSessionEvents,
    currentSession,
    selectedSession,
    selectedSurveyArea,
    currentTrackFeatureCollection,
    selectedTrackFeatureCollection,
    editTrackFeatureCollection,
    surveyAreaFeatureCollection,
    sessionEventFeatureCollection,
    currentMetrics,
    selectedMetrics,
    sessionHistoryStats,
    groupedSessionHistory,
    editMetrics,
  }
}
