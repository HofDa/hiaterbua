import { db } from '@/lib/db/dexie'
import { createId } from '@/lib/utils/ids'
import { nowIso } from '@/lib/utils/time'
import type {
  EditableTrackPoint,
  PositionData,
  SessionEvent,
  SessionEventType,
  TrackPoint,
} from '@/lib/maps/grazing-session-map-helper-types'

export function buildTrackpointsFromEditableTrackpoints(
  trackpoints: EditableTrackPoint[],
  sessionId: string,
  existingTrackpoints: TrackPoint[] = []
) {
  return trackpoints.map((point, index) => ({
    id: existingTrackpoints[index]?.id ?? createId('trackpoint'),
    sessionId,
    enclosureWalkId: null,
    seq: index + 1,
    timestamp: point.timestamp,
    lat: point.lat,
    lon: point.lon,
    accuracyM: point.accuracyM,
    speedMps: point.speedMps,
    headingDeg: point.headingDeg,
    accepted: true,
  }))
}

export async function logSessionEvent(
  sessionId: string,
  type: SessionEventType,
  position: PositionData | null,
  comment?: string
) {
  const event: SessionEvent = {
    id: createId('event'),
    sessionId,
    timestamp: nowIso(),
    type,
    lat: position?.latitude ?? null,
    lon: position?.longitude ?? null,
    comment,
  }

  await db.events.add(event)
}
