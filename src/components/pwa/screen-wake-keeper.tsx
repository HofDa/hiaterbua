'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { useActiveRecording } from '@/components/layout/use-active-recording'
import { useWakeLock } from '@/hooks/use-wake-lock'
import { getAppSettings } from '@/lib/db/repositories/settings'

/**
 * App-wide screen wake lock. Holds the screen on while any recording is active
 * — on every screen, not just the map — so a track keeps going when the
 * shepherd switches to Herden or Pflege mid-walk. With "Immer an" in the
 * settings it holds the screen whenever the app is open.
 */
export function ScreenWakeKeeper() {
  const recording = useActiveRecording()
  const keepScreenAwake = useLiveQuery(async () => (await getAppSettings())?.keepScreenAwake, [])

  useWakeLock(recording?.status === 'active' || keepScreenAwake === 'always')

  return null
}
