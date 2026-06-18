import { describe, expect, test } from 'vitest'
import {
  BACKUP_REMINDER_AFTER_DAYS,
  daysSince,
  shouldRemindBackup,
} from './backup-reminder-logic'

const DAY = 1000 * 60 * 60 * 24
const NOW = Date.parse('2026-06-17T12:00:00.000Z')
const isoDaysAgo = (days: number) => new Date(NOW - days * DAY).toISOString()

describe('shouldRemindBackup', () => {
  test('no reminder when there is no data', () => {
    expect(
      shouldRemindBackup({
        hasData: false,
        lastExportAt: null,
        latestChangeAt: isoDaysAgo(0),
        now: NOW,
      }),
    ).toBe(false)
  })

  test('reminds when data exists but it was never backed up', () => {
    expect(
      shouldRemindBackup({
        hasData: true,
        lastExportAt: null,
        latestChangeAt: isoDaysAgo(0),
        now: NOW,
      }),
    ).toBe(true)
  })

  test('no reminder when nothing changed since the last backup', () => {
    expect(
      shouldRemindBackup({
        hasData: true,
        lastExportAt: isoDaysAgo(30),
        latestChangeAt: isoDaysAgo(40), // changed before the backup
        now: NOW,
      }),
    ).toBe(false)
  })

  test('no reminder when changed since backup but still within the threshold', () => {
    expect(
      shouldRemindBackup({
        hasData: true,
        lastExportAt: isoDaysAgo(5), // < 14 days
        latestChangeAt: isoDaysAgo(1), // changed after the backup
        now: NOW,
      }),
    ).toBe(false)
  })

  test('reminds when changed since backup and past the threshold', () => {
    expect(
      shouldRemindBackup({
        hasData: true,
        lastExportAt: isoDaysAgo(20), // >= 14 days
        latestChangeAt: isoDaysAgo(2), // changed after the backup
        now: NOW,
      }),
    ).toBe(true)
  })

  test('the threshold boundary is inclusive', () => {
    expect(
      shouldRemindBackup({
        hasData: true,
        lastExportAt: isoDaysAgo(BACKUP_REMINDER_AFTER_DAYS), // exactly 14 days
        latestChangeAt: isoDaysAgo(1),
        now: NOW,
      }),
    ).toBe(true)
  })

  test('missing latestChangeAt is treated as no change since backup', () => {
    expect(
      shouldRemindBackup({
        hasData: true,
        lastExportAt: isoDaysAgo(30),
        latestChangeAt: null,
        now: NOW,
      }),
    ).toBe(false)
  })
})

describe('daysSince', () => {
  test('rounds down to whole days', () => {
    expect(daysSince(new Date(NOW - (3 * DAY + 5000)).toISOString(), NOW)).toBe(3)
  })
})
