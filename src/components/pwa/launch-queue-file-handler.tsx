'use client'

import { useEffect } from 'react'
import { initLaunchQueueFileHandling } from '@/lib/import-export/launch-files'

/**
 * Wires the (Chromium-only) PWA Launch Handler API to the import flow: files
 * opened via the manifest `file_handlers` land in the launch-files queue and
 * are picked up by the import card on /export. On browsers without
 * `window.launchQueue` this renders nothing and does nothing.
 */
export function LaunchQueueFileHandler() {
  useEffect(() => {
    initLaunchQueueFileHandling()
  }, [])

  return null
}
