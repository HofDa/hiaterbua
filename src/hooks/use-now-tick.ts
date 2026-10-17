'use client'

import { useEffect, useState } from 'react'

/**
 * Current time in ms, refreshed every `intervalMs` while `active`. Use it in
 * the leaf component that displays a running clock, so only that text
 * re-renders each second rather than the screen or provider above it.
 */
export function useNowTick(active: boolean, intervalMs = 1000): number {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (!active) return

    const tick = () => setNowMs(Date.now())
    // Refresh right away too: the state may date from mount, long before the
    // clock (re)started, and must not show a stale value for a full interval.
    const immediateId = window.setTimeout(tick, 0)
    const intervalId = window.setInterval(tick, intervalMs)
    return () => {
      window.clearTimeout(immediateId)
      window.clearInterval(intervalId)
    }
  }, [active, intervalMs])

  return nowMs
}
