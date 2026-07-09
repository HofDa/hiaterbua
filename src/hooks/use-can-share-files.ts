'use client'

import { useSyncExternalStore } from 'react'
import { canShareFiles } from '@/lib/import-export/file-formats'

// Browser support for file sharing never changes within a page lifetime, so
// there is nothing to subscribe to.
const subscribeNever = () => () => {}

/**
 * Runtime feature detection for file sharing via the Web Share API.
 * Renders `false` on the server (share buttons never flash on unsupported
 * browsers) and reflects the real browser capability after hydration.
 */
export function useCanShareFiles() {
  return useSyncExternalStore(subscribeNever, canShareFiles, () => false)
}
