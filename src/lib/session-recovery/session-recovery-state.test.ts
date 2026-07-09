import { describe, expect, it } from 'vitest'
import {
  getCurrentRecoverableSession,
  getLiveRecoverableDurationS,
  readRecoveryMetadata,
  shouldLogLongInactivityGap,
  writeRecoveryMetadata,
  type RecoverableSession,
} from '@/lib/session-recovery/session-recovery-state'

function session(overrides: Partial<RecoverableSession>): RecoverableSession {
  return {
    key: 'work:1',
    kind: 'work',
    id: '1',
    label: 'Arbeit',
    href: '/work',
    status: 'active',
    startTime: '2026-07-09T08:00:00.000Z',
    updatedAt: '2026-07-09T08:01:00.000Z',
    durationS: 0,
    activeSince: '2026-07-09T08:00:00.000Z',
    ...overrides,
  }
}

describe('session recovery state', () => {
  it('prioritizes active grazing recovery over work recovery', () => {
    const current = getCurrentRecoverableSession([
      session({ key: 'work:1', kind: 'work', id: '1' }),
      session({ key: 'grazing:1', kind: 'grazing', id: '1', href: '/sessions' }),
    ])

    expect(current?.kind).toBe('grazing')
  })

  it('computes live work duration from activeSince', () => {
    expect(
      getLiveRecoverableDurationS(
        session({ durationS: 60, activeSince: '2026-07-09T08:05:00.000Z' }),
        Date.parse('2026-07-09T08:07:00.000Z')
      )
    ).toBe(180)
  })

  it('persists offline and background recovery metadata without schema changes', () => {
    const metadata = writeRecoveryMetadata(
      readRecoveryMetadata(null),
      session({ key: 'work:1' }),
      {
        lastSeenAt: '2026-07-09T08:10:00.000Z',
        wasOffline: true,
        wasBackgrounded: true,
      }
    )

    expect(metadata['work:1']).toMatchObject({
      wasOffline: true,
      wasBackgrounded: true,
      lastLocalSaveAt: '2026-07-09T08:01:00.000Z',
    })
  })

  it('detects a long inactivity gap once per last-seen interval', () => {
    expect(
      shouldLogLongInactivityGap({
        metadata: {
          sessionKey: 'work:1',
          lastSeenAt: '2026-07-09T08:00:00.000Z',
          lastLocalSaveAt: '2026-07-09T08:00:00.000Z',
          wasOffline: false,
          wasBackgrounded: false,
        },
        nowIso: '2026-07-09T08:20:00.000Z',
      })
    ).toBe(true)
  })
})
