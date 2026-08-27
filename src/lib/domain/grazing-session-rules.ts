import type { SessionStatus } from '@/types/domain'

const ALLOWED_GRAZING_SESSION_TRANSITIONS = {
  active: new Set<SessionStatus>(['paused', 'finished']),
  paused: new Set<SessionStatus>(['active', 'finished']),
  finished: new Set<SessionStatus>(),
} satisfies Record<SessionStatus, ReadonlySet<SessionStatus>>

export class InvalidSessionTransitionError extends Error {
  readonly sessionId: string
  readonly from: SessionStatus
  readonly to: SessionStatus

  constructor(sessionId: string, from: SessionStatus, to: SessionStatus) {
    super(`Ungültiger Weidegang-Statuswechsel: ${from} → ${to}.`)
    this.name = 'InvalidSessionTransitionError'
    this.sessionId = sessionId
    this.from = from
    this.to = to
  }
}

export class OpenGrazingSessionExistsError extends Error {
  readonly existingSessionId: string

  constructor(existingSessionId: string) {
    super('Es gibt bereits einen laufenden oder pausierten Weidegang.')
    this.name = 'OpenGrazingSessionExistsError'
    this.existingSessionId = existingSessionId
  }
}

export function canTransitionGrazingSession(from: SessionStatus, to: SessionStatus) {
  return ALLOWED_GRAZING_SESSION_TRANSITIONS[from].has(to)
}

export function assertGrazingSessionTransition(params: {
  sessionId: string
  from: SessionStatus
  to: SessionStatus
}) {
  const { sessionId, from, to } = params

  if (!canTransitionGrazingSession(from, to)) {
    throw new InvalidSessionTransitionError(sessionId, from, to)
  }
}
