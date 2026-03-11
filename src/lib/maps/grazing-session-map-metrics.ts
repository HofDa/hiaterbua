import { haversineDistanceM } from '@/lib/maps/map-core'
import { nowIso } from '@/lib/utils/time'
import { formatDateLabel } from '@/lib/maps/grazing-session-map-formatters'
import type {
  GrazingSession,
  GroupedSessionHistory,
  SessionHistoryStats,
  SessionMetrics,
  TrackPoint,
} from '@/lib/maps/grazing-session-map-helper-types'

export function buildSessionMetrics(
  trackpoints: TrackPoint[],
  startTime: string,
  endTime?: string | null
): SessionMetrics {
  const sorted = [...trackpoints].sort((left, right) => left.seq - right.seq)
  const sessionEnd = endTime ?? nowIso()
  const durationS = Math.max(
    0,
    Math.round((new Date(sessionEnd).getTime() - new Date(startTime).getTime()) / 1000)
  )

  if (sorted.length === 0) {
    return {
      durationS,
      movingTimeS: 0,
      distanceM: 0,
      avgSpeedMps: null,
      avgAccuracyM: null,
    }
  }

  let distanceM = 0
  let movingTimeS = 0

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1]
    const current = sorted[index]
    const segmentDistance = haversineDistanceM(
      { latitude: previous.lat, longitude: previous.lon },
      { latitude: current.lat, longitude: current.lon }
    )
    const timeDiffS = Math.max(
      0,
      Math.round(
        (new Date(current.timestamp).getTime() - new Date(previous.timestamp).getTime()) / 1000
      )
    )

    distanceM += segmentDistance
    movingTimeS += timeDiffS
  }

  const accuracies = sorted
    .map((point) => point.accuracyM)
    .filter((accuracy): accuracy is number => typeof accuracy === 'number')

  return {
    durationS,
    movingTimeS,
    distanceM,
    avgSpeedMps: movingTimeS > 0 ? distanceM / movingTimeS : null,
    avgAccuracyM:
      accuracies.length > 0
        ? accuracies.reduce((sum, accuracy) => sum + accuracy, 0) / accuracies.length
        : null,
  }
}

export function buildSessionHistoryStats(
  sessions: GrazingSession[]
): SessionHistoryStats {
  const finishedSessions = sessions.filter((session) => session.status === 'finished')
  const totalDistanceM = finishedSessions.reduce((sum, session) => sum + session.distanceM, 0)
  const totalDurationS = finishedSessions.reduce((sum, session) => sum + session.durationS, 0)
  const uniqueHerds = new Set(finishedSessions.map((session) => session.herdId)).size

  return {
    totalSessions: sessions.length,
    finishedSessions: finishedSessions.length,
    totalDistanceM,
    totalDurationS,
    uniqueHerds,
  }
}

export function groupSessionHistoryByDay(
  sessions: GrazingSession[]
): GroupedSessionHistory[] {
  const groups = new Map<string, { label: string; sessions: GrazingSession[] }>()

  sessions.forEach((session) => {
    const dayKey = session.startTime.slice(0, 10)
    const current = groups.get(dayKey)

    if (current) {
      current.sessions.push(session)
      return
    }

    groups.set(dayKey, {
      label: formatDateLabel(session.startTime),
      sessions: [session],
    })
  })

  return Array.from(groups.entries()).map(([dayKey, group]) => ({
    dayKey,
    label: group.label,
    sessions: group.sessions,
  }))
}
