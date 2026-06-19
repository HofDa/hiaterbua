import { describe, expect, it } from 'vitest'
import {
  getWorkSessionStatusEventType,
  getWorkSessionStatusPatch,
} from './work-session-rules'
import type { WorkSession } from '@/types/domain'

function makeWorkSession(overrides: Partial<WorkSession> = {}): WorkSession {
  return {
    id: 'work_1',
    type: 'herding',
    status: 'active',
    startTime: '2026-01-01T00:00:00.000Z',
    endTime: null,
    activeSince: '2026-01-01T00:00:00.000Z',
    durationS: 10,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const oneMinuteLater = '2026-01-01T00:01:00.000Z'

describe('getWorkSessionStatusPatch', () => {
  it('banks elapsed time and clears activeSince when pausing a running session', () => {
    const session = makeWorkSession({ status: 'active', durationS: 10 })

    const patch = getWorkSessionStatusPatch(session, 'paused', oneMinuteLater)

    expect(patch).toMatchObject({
      status: 'paused',
      durationS: 70,
      activeSince: null,
      updatedAt: oneMinuteLater,
    })
  })

  it('does not accrue duration when resuming a paused session, and re-arms the clocks', () => {
    const session = makeWorkSession({
      status: 'paused',
      durationS: 70,
      activeSince: null,
      reminderIntervalMin: 30,
    })

    const patch = getWorkSessionStatusPatch(session, 'active', oneMinuteLater)

    expect(patch).toMatchObject({
      status: 'active',
      durationS: 70,
      activeSince: oneMinuteLater,
      lastReminderAt: oneMinuteLater,
    })
  })

  it('leaves lastReminderAt null on resume when no reminder interval is set', () => {
    const session = makeWorkSession({ status: 'paused', activeSince: null, reminderIntervalMin: null })

    const patch = getWorkSessionStatusPatch(session, 'active', oneMinuteLater)

    expect(patch.lastReminderAt).toBeNull()
  })

  it('accrues and stamps endTime when finishing a running session', () => {
    const session = makeWorkSession({ status: 'active', durationS: 10 })

    const patch = getWorkSessionStatusPatch(session, 'finished', oneMinuteLater)

    expect(patch).toMatchObject({
      status: 'finished',
      durationS: 70,
      activeSince: null,
      endTime: oneMinuteLater,
    })
  })

  it('does not accrue when the running session has no activeSince mark', () => {
    const session = makeWorkSession({ status: 'active', durationS: 42, activeSince: null })

    const patch = getWorkSessionStatusPatch(session, 'paused', oneMinuteLater)

    expect(patch.durationS).toBe(42)
  })
})

describe('getWorkSessionStatusEventType', () => {
  it('maps each status to its event type', () => {
    expect(getWorkSessionStatusEventType('paused')).toBe('pause')
    expect(getWorkSessionStatusEventType('active')).toBe('resume')
    expect(getWorkSessionStatusEventType('finished')).toBe('stop')
  })
})
