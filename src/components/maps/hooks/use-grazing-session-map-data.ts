import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useRef } from 'react'
import { getAppSettings } from '@/lib/db/repositories/settings'
import { listSurveyAreas } from '@/lib/db/repositories/survey-areas'
import { listAllAnimals } from '@/lib/db/repositories/animals'
import { listHerdsByName } from '@/lib/db/repositories/herds'
import {
  listFinishedSessionsByRecent,
  listSessionEvents,
  listUnfinishedSessions,
  loadSessionTrackpointsIncremental,
} from '@/lib/db/repositories/sessions'
import { buildSurveyAreaFeatureCollection } from '@/lib/maps/map-core'
import { buildAnimalsByHerdId } from '@/lib/maps/live-position-map-helpers'
import { sortSurveyAreasByImportOrder } from '@/lib/maps/survey-area-order'
import { selectCurrentSession } from '@/lib/recordings/active-recording-selection'
import {
  buildEditableTrackpointsFeatureCollection,
  buildMergedSessionEventFeatureCollection,
  buildSessionHistoryStats,
  buildSessionMetrics,
  buildSessionMetricsFromRecord,
  buildTrackpointsFeatureCollection,
  buildTrackpointsFromEditableTrackpoints,
  groupSessionHistoryByDay,
  parseDateTimeInputValue,
  type EditableTrackPoint,
} from '@/lib/maps/grazing-session-map-helpers'
import type { GrazingSession, TrackPoint } from '@/types/domain'

/** Same order as listing all sessions by `updatedAt`, newest first. */
function mergeSessionsByRecent(
  openSessions: GrazingSession[],
  finishedSessions: GrazingSession[]
): GrazingSession[] {
  if (openSessions.length === 0) return finishedSessions

  return [...openSessions, ...finishedSessions].sort((a, b) =>
    a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0
  )
}

type UseGrazingSessionMapDataArgs = {
  currentSessionId: string | null
  selectedSessionId: string | null
  selectedSurveyAreaId: string | null
  editTrackpoints: EditableTrackPoint[]
  editStartTime: string
  editEndTime: string
  liveDurationTick: number
}

export function useGrazingSessionMapData({
  currentSessionId,
  selectedSessionId,
  selectedSurveyAreaId,
  editTrackpoints,
  editStartTime,
  editEndTime,
  liveDurationTick,
}: UseGrazingSessionMapDataArgs) {
  const herds = useLiveQuery(() => listHerdsByName(), [])
  const animals = useLiveQuery(() => listAllAnimals(), [])
  const surveyAreas = useLiveQuery(
    () => listSurveyAreas(),
    []
  )
  const settings = useLiveQuery(() => getAppSettings(), [])
  // Finished and open sessions are queried apart so the per-fix update of the
  // open session does not reload the whole history (see
  // listFinishedSessionsByRecent).
  const finishedSessions = useLiveQuery(() => listFinishedSessionsByRecent(), [])
  const openSessions = useLiveQuery(() => listUnfinishedSessions(), [])
  const recentSessions = useMemo(
    () =>
      finishedSessions && openSessions
        ? mergeSessionsByRecent(openSessions, finishedSessions)
        : undefined,
    [finishedSessions, openSessions]
  )

  // Track caches: each GPS fix then reads only the new tail, not the whole
  // track (see loadSessionTrackpointsIncremental).
  const currentTrackpointsCacheRef = useRef<TrackPoint[] | null>(null)
  const selectedTrackpointsCacheRef = useRef<TrackPoint[] | null>(null)

  const currentTrackpoints = useLiveQuery(async () => {
    if (!currentSessionId) return []
    const next = await loadSessionTrackpointsIncremental(
      currentSessionId,
      currentTrackpointsCacheRef.current
    )
    currentTrackpointsCacheRef.current = next
    return next
  }, [currentSessionId])

  const selectedTrackpoints = useLiveQuery(async () => {
    if (!selectedSessionId) return []
    const next = await loadSessionTrackpointsIncremental(
      selectedSessionId,
      selectedTrackpointsCacheRef.current
    )
    selectedTrackpointsCacheRef.current = next
    return next
  }, [selectedSessionId])

  const currentSessionEvents = useLiveQuery(async () => {
    if (!currentSessionId) return []
    const events = await listSessionEvents(currentSessionId)
    return events.reverse()
  }, [currentSessionId])

  const selectedSessionEvents = useLiveQuery(async () => {
    if (!selectedSessionId) return []
    const events = await listSessionEvents(selectedSessionId)
    return events.reverse()
  }, [selectedSessionId])

  const safeHerds = useMemo(
    () => (herds ?? []).filter((herd) => !herd.isArchived),
    [herds]
  )
  const safeAnimals = useMemo(() => animals ?? [], [animals])
  const safeSurveyAreas = useMemo(
    () => sortSurveyAreasByImportOrder(surveyAreas ?? []),
    [surveyAreas]
  )
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
  const animalsByHerdId = useMemo(() => buildAnimalsByHerdId(safeAnimals), [safeAnimals])
  const activeSession = useMemo(
    () => selectCurrentSession(safeRecentSessions),
    [safeRecentSessions]
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

    return buildSessionMetricsFromRecord(currentSession, effectiveEndTime ?? undefined)
  }, [currentSession, liveDurationTick])

  const selectedMetrics = useMemo(
    () =>
      selectedSession
        ? buildSessionMetricsFromRecord(selectedSession, selectedSession.endTime ?? undefined)
        : null,
    [selectedSession]
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
    const nextStartTime =
      selectedSession.status === 'finished'
        ? parseDateTimeInputValue(editStartTime) ?? selectedSession.startTime
        : selectedSession.startTime
    const nextEndTime =
      selectedSession.status === 'finished'
        ? editEndTime.trim().length > 0
          ? parseDateTimeInputValue(editEndTime) ?? selectedSession.endTime
          : selectedSession.endTime
        : selectedSession.endTime

    return buildSessionMetrics(nextTrackpoints, nextStartTime, nextEndTime)
  }, [editEndTime, editStartTime, editTrackpoints, selectedSession])

  return {
    settings,
    activeSession,
    safeHerds,
    safeAnimals,
    animalsByHerdId,
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
