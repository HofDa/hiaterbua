'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useLiveQuery } from 'dexie-react-hooks'
import { useGeolocationWatcher } from '@/components/maps/hooks/use-geolocation-watcher'
import { useLatestValueRef } from '@/components/maps/hooks/use-latest-value-ref'
import { recordFieldDiagnostic } from '@/lib/diagnostics/field-diagnostics'
import { triggerHaptic } from '@/hooks/use-haptic-feedback'
import {
  appendSessionTrackpoint,
  listSessionTrackpoints,
  listUnfinishedSessions,
} from '@/lib/db/repositories/sessions'
import { getAppSettings } from '@/lib/db/repositories/settings'
import { withSessionRecordingLock } from '@/lib/db/session-recording-lock'
import {
  createTrackpointQueue,
  type TrackpointQueueDeps,
} from '@/lib/maps/grazing-trackpoint-queue'
import type { GpsTrackPosition } from '@/lib/maps/position-types'
import { defaultAppSettings } from '@/lib/settings/defaults'

const RECORDING_RETRY_INTERVAL_MS = 5_000

// The grazing screen owns the recorder (and its UI state) while it is open.
function isGrazingScreen(pathname: string | null) {
  return pathname === '/sessions' || Boolean(pathname?.startsWith('/sessions/'))
}

// GPS UI state is irrelevant off-screen; stable no-ops keep the watcher effect
// from re-subscribing on every render.
const noop = () => {}

function buildTrackPosition(position: GeolocationPosition): GpsTrackPosition {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    speed: position.coords.speed ?? null,
    heading: position.coords.heading ?? null,
    timestamp: position.timestamp,
  }
}

/**
 * Keeps an active Weidegang recording GPS points while the user is on any
 * other screen. Without it, switching to Herden or Pflege mid-walk unmounted
 * the only geolocation watch and left a silent gap in the track.
 *
 * It hands over to the grazing screen's own recorder as soon as that screen
 * opens; both write through the same session recording lock, and the
 * repository drops points that are not newer than the last stored one, so the
 * brief overlap during navigation cannot duplicate or reorder points.
 */
export function BackgroundGrazingRecorder() {
  const pathname = usePathname()
  const activeSessionId = useLiveQuery(async () => {
    const sessions = await listUnfinishedSessions()
    return sessions.find((session) => session.status === 'active')?.id ?? null
  }, [])

  if (!activeSessionId || isGrazingScreen(pathname)) return null

  return <BackgroundTrackRecorder key={activeSessionId} sessionId={activeSessionId} />
}

function BackgroundTrackRecorder({ sessionId }: { sessionId: string }) {
  const settings = useLiveQuery(() => getAppSettings(), [])
  const settingsRef = useLatestValueRef(settings ?? defaultAppSettings)
  const buildPositionRef = useLatestValueRef(buildTrackPosition)
  const acceptedPositionRef = useRef<GpsTrackPosition | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const lastTimestampRef = useRef<number | null>(null)
  const lastErrorRef = useRef(false)
  const [queue] = useState(createTrackpointQueue)

  const deps = useMemo<TrackpointQueueDeps>(
    () => ({
      appendTrackpoint: appendSessionTrackpoint,
      withLock: withSessionRecordingLock,
      getLastTimestamp: () => lastTimestampRef.current,
      onPersisted: (_pending, result) => {
        lastTimestampRef.current = result.lastTimestamp
      },
      onHealthy: () => {
        lastErrorRef.current = false
      },
      onWriteFailed: (pending, error, pendingCount) => {
        recordFieldDiagnostic({
          type: 'indexeddb_write_failed',
          level: 'error',
          message: 'Weidegang-Trackpunkt (Hintergrund) konnte lokal nicht gespeichert werden.',
          activeGrazingSessionId: pending.sessionId,
          activeRecordingId: pending.sessionId,
          details: { error, pendingCount, background: true },
        })
        // Buzz once per failure streak: the user is on another screen and will
        // not see the grazing screen's error banner.
        if (!lastErrorRef.current) triggerHaptic('error')
        lastErrorRef.current = true
      },
      // The session was paused or stopped elsewhere; the live query unmounts
      // this recorder right after, so there is nothing to report.
      onRejected: noop,
    }),
    []
  )

  // Seed the filter and dedupe state from the stored track so the first
  // off-screen fix is judged against the last recorded point, not accepted
  // blindly.
  useEffect(() => {
    let cancelled = false

    void listSessionTrackpoints(sessionId).then((trackpoints) => {
      const last = trackpoints.at(-1)
      if (cancelled || !last || acceptedPositionRef.current) return

      const timestamp = Date.parse(last.timestamp)
      lastTimestampRef.current = timestamp
      acceptedPositionRef.current = {
        latitude: last.lat,
        longitude: last.lon,
        accuracy: last.accuracyM ?? 0,
        speed: last.speedMps ?? null,
        heading: last.headingDeg ?? null,
        timestamp,
      }
    })

    recordFieldDiagnostic({
      type: 'grazing_background_recording_started',
      message: 'Weidegang zeichnet außerhalb der Weidegang-Ansicht weiter auf.',
      activeGrazingSessionId: sessionId,
      activeRecordingId: sessionId,
    })

    return () => {
      cancelled = true
    }
  }, [sessionId])

  // Retry failed writes, and drain whatever is left when the recorder unmounts
  // (navigating back to the grazing screen, or the session ending).
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (queue.size() > 0) void queue.flush(sessionId, deps)
    }, RECORDING_RETRY_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
      if (queue.size() > 0) void queue.flush(sessionId, deps)
    }
  }, [deps, queue, sessionId])

  const onAcceptedPositionRef = useLatestValueRef<((position: GpsTrackPosition) => void) | null>(
    (position) => {
      if (!queue.enqueue(sessionId, position)) return
      void queue.flush(sessionId, deps)
    }
  )

  useGeolocationWatcher({
    acceptedPositionRef,
    buildPositionRef,
    onAcceptedPositionRef,
    settingsRef,
    watchIdRef,
    setGpsState: noop,
    setLastPositionDecision: noop,
    setPosition: noop,
  })

  return null
}
