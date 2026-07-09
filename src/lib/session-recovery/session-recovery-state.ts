import type { GrazingSession, WorkSession } from '@/types/domain'

export const SESSION_RECOVERY_METADATA_KEY = 'pastore:session-recovery:v1'
export const SESSION_RECOVERY_RECOVERED_KEY_PREFIX = 'pastore:session-recovered:'
export const SESSION_RECOVERY_LONG_GAP_MS = 15 * 60 * 1000

export type RecoverableSessionKind = 'grazing' | 'work'

export type RecoverableSession = {
  key: string
  kind: RecoverableSessionKind
  id: string
  label: string
  href: string
  status: 'active' | 'paused'
  startTime: string
  updatedAt: string
  durationS: number
  activeSince?: string | null
}

export type RecoveryMetadataEntry = {
  sessionKey: string
  lastSeenAt: string
  lastLocalSaveAt: string
  wasOffline: boolean
  wasBackgrounded: boolean
  offlineSince?: string | null
  backgroundedSince?: string | null
  longInactivityDetectedAt?: string | null
}

export type RecoveryMetadata = Record<string, RecoveryMetadataEntry>

export function getRecoverableSessionKey(
  kind: RecoverableSessionKind,
  sessionId: string
) {
  return `${kind}:${sessionId}`
}

export function isRecoverableStatus(status: string) {
  return status === 'active' || status === 'paused'
}

export function getCurrentRecoverableSession(sessions: RecoverableSession[]) {
  return (
    [...sessions].sort((left, right) => {
      if (left.kind !== right.kind) return left.kind === 'grazing' ? -1 : 1
      if (left.status !== right.status) return left.status === 'active' ? -1 : 1
      return right.startTime.localeCompare(left.startTime)
    })[0] ?? null
  )
}

export function getLiveRecoverableDurationS(session: RecoverableSession, nowMs: number) {
  if (session.kind === 'work') {
    if (!session.activeSince) return session.durationS

    const activeSinceMs = new Date(session.activeSince).getTime()
    if (!Number.isFinite(activeSinceMs)) return session.durationS

    return session.durationS + Math.max(0, Math.round((nowMs - activeSinceMs) / 1000))
  }

  if (session.status === 'active') {
    const startMs = new Date(session.startTime).getTime()
    if (!Number.isFinite(startMs)) return session.durationS

    return Math.max(0, Math.round((nowMs - startMs) / 1000))
  }

  return session.durationS
}

export function buildGrazingRecoverableSession(params: {
  session: GrazingSession
  herdName?: string
}): RecoverableSession {
  const { session, herdName } = params

  return {
    key: getRecoverableSessionKey('grazing', session.id),
    kind: 'grazing',
    id: session.id,
    label: herdName ? `Weidegang · ${herdName}` : 'Weidegang',
    href: '/sessions',
    status: session.status as RecoverableSession['status'],
    startTime: session.startTime,
    updatedAt: session.updatedAt,
    durationS: session.durationS ?? 0,
  }
}

export function buildWorkRecoverableSession(params: {
  session: WorkSession
  label: string
}): RecoverableSession {
  const { session, label } = params

  return {
    key: getRecoverableSessionKey('work', session.id),
    kind: 'work',
    id: session.id,
    label,
    href: '/work',
    status: session.status as RecoverableSession['status'],
    startTime: session.startTime,
    updatedAt: session.updatedAt,
    durationS: session.durationS ?? 0,
    activeSince: session.activeSince ?? null,
  }
}

export function readRecoveryMetadata(snapshot: string | null): RecoveryMetadata {
  if (!snapshot) return {}

  try {
    const parsed = JSON.parse(snapshot)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as RecoveryMetadata
  } catch {
    return {}
  }
}

export function writeRecoveryMetadata(
  current: RecoveryMetadata,
  session: Pick<RecoverableSession, 'key' | 'updatedAt'>,
  patch: Partial<Omit<RecoveryMetadataEntry, 'sessionKey'>>
): RecoveryMetadata {
  const previous = current[session.key]
  const nextEntry: RecoveryMetadataEntry = {
    sessionKey: session.key,
    lastSeenAt: patch.lastSeenAt ?? previous?.lastSeenAt ?? new Date().toISOString(),
    lastLocalSaveAt: patch.lastLocalSaveAt ?? previous?.lastLocalSaveAt ?? session.updatedAt,
    wasOffline: patch.wasOffline ?? previous?.wasOffline ?? false,
    wasBackgrounded: patch.wasBackgrounded ?? previous?.wasBackgrounded ?? false,
    offlineSince: patch.offlineSince ?? previous?.offlineSince ?? null,
    backgroundedSince: patch.backgroundedSince ?? previous?.backgroundedSince ?? null,
    longInactivityDetectedAt:
      patch.longInactivityDetectedAt ?? previous?.longInactivityDetectedAt ?? null,
  }

  return {
    ...current,
    [session.key]: nextEntry,
  }
}

export function pruneRecoveryMetadata(
  current: RecoveryMetadata,
  activeSessionKeys: Set<string>
): RecoveryMetadata {
  return Object.fromEntries(
    Object.entries(current).filter(([sessionKey]) => activeSessionKeys.has(sessionKey))
  )
}

export function shouldLogLongInactivityGap(params: {
  metadata?: RecoveryMetadataEntry
  nowIso: string
  thresholdMs?: number
}) {
  const { metadata, nowIso, thresholdMs = SESSION_RECOVERY_LONG_GAP_MS } = params
  if (!metadata?.lastSeenAt) return false
  if (metadata.longInactivityDetectedAt && metadata.longInactivityDetectedAt >= metadata.lastSeenAt) {
    return false
  }

  const lastSeenMs = new Date(metadata.lastSeenAt).getTime()
  const nowMs = new Date(nowIso).getTime()
  if (!Number.isFinite(lastSeenMs) || !Number.isFinite(nowMs)) return false

  return nowMs - lastSeenMs >= thresholdMs
}
