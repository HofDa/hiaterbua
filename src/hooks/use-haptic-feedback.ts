'use client'

import { useCallback } from 'react'

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'reminder'

const patterns: Record<HapticType, number[]> = {
  light: [10],
  medium: [20],
  heavy: [50],
  success: [10, 30, 10],
  warning: [100, 30, 100],
  error: [50, 50, 50, 50, 50],
  // Fires unprompted while the phone is likely pocketed, so it is the longest,
  // most distinctive pattern — three strong pulses to read clearly as "time's up".
  reminder: [160, 100, 160, 100, 160],
}

/**
 * Fire a semantic haptic pulse. Safe to call from anywhere (controllers, async
 * action handlers) — no-ops when vibration is unavailable. Use this for
 * glance-free confirmation of field actions where the user may not be looking at
 * the screen (e.g. starting/stopping a recording with gloves on).
 */
export function triggerHaptic(type: HapticType = 'light') {
  if (typeof window === 'undefined' || !window.navigator.vibrate) return
  window.navigator.vibrate(patterns[type])
}

export function useHapticFeedback() {
  return useCallback((type: HapticType = 'light') => triggerHaptic(type), [])
}
