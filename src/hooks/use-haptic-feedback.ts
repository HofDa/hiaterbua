'use client'

import { useCallback } from 'react'

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'

const patterns: Record<HapticType, number[]> = {
  light: [10],
  medium: [20],
  heavy: [50],
  success: [10, 30, 10],
  warning: [100, 30, 100],
  error: [50, 50, 50, 50, 50],
}

export function useHapticFeedback() {
  return useCallback((type: HapticType = 'light') => {
    if (typeof window === 'undefined' || !window.navigator.vibrate) return
    window.navigator.vibrate(patterns[type])
  }, [])
}
