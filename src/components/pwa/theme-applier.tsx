'use client'

import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getAppSettings } from '@/lib/db/repositories/settings'

/** Applies the "Design" setting: data-theme="contrast" switches the palette. */
export function ThemeApplier() {
  const theme = useLiveQuery(async () => (await getAppSettings())?.theme, [])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'contrast') {
      root.dataset.theme = 'contrast'
    } else {
      delete root.dataset.theme
    }
  }, [theme])

  return null
}
