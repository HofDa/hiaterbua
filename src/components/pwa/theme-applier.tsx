'use client'

import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getAppSettings } from '@/lib/db/repositories/settings'

/**
 * Applies the "Darstellung" setting. High contrast is the default and is
 * already set on <html> by the server, so there is no flash; only an explicit
 * "Standard" ('light') choice removes it. The legacy 'system' value was the
 * old untouched default, so those users move to high contrast once.
 */
export function ThemeApplier() {
  const settings = useLiveQuery(() => getAppSettings(), [])

  useEffect(() => {
    if (settings === undefined) return
    const root = document.documentElement
    if (settings?.theme === 'light') {
      delete root.dataset.theme
    } else {
      root.dataset.theme = 'contrast'
    }
  }, [settings])

  return null
}
