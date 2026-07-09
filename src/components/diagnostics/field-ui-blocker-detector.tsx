'use client'

import { useEffect, useRef, useState } from 'react'
import { recordFieldDiagnostic } from '@/lib/diagnostics/field-diagnostics'
import {
  DEBUG_FIELD_DIAGNOSTICS_CHANGED_EVENT,
  findPotentialUiBlockers,
  getUiBlockerSignature,
  isDebugFieldDiagnosticsEnabled,
} from '@/lib/diagnostics/ui-blocker-detector'
import { useFieldSafety } from '@/lib/field-safety/use-field-safety'

const BLOCKER_SCAN_INTERVAL_MS = 2_000
const BLOCKER_MUTATION_DEBOUNCE_MS = 250

export function FieldUiBlockerDetector() {
  const { isFieldOperationActive, snapshot } = useFieldSafety()
  const [debugEnabled, setDebugEnabled] = useState(false)
  const seenBlockersRef = useRef(new Set<string>())

  useEffect(() => {
    const updateDebugEnabled = () => {
      setDebugEnabled(isDebugFieldDiagnosticsEnabled())
    }

    updateDebugEnabled()
    window.addEventListener(DEBUG_FIELD_DIAGNOSTICS_CHANGED_EVENT, updateDebugEnabled)
    window.addEventListener('popstate', updateDebugEnabled)

    return () => {
      window.removeEventListener(DEBUG_FIELD_DIAGNOSTICS_CHANGED_EVENT, updateDebugEnabled)
      window.removeEventListener('popstate', updateDebugEnabled)
    }
  }, [])

  useEffect(() => {
    if (!debugEnabled || !isFieldOperationActive) {
      seenBlockersRef.current.clear()
      return
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const scanForBlockers = () => {
      for (const blocker of findPotentialUiBlockers()) {
        const signature = getUiBlockerSignature(blocker)
        if (seenBlockersRef.current.has(signature)) {
          continue
        }

        seenBlockersRef.current.add(signature)
        recordFieldDiagnostic({
          type: 'ui-blocker-detected',
          level: 'warning',
          message: 'Potential UI blocker detected during active field operation',
          details: {
            ...blocker,
            fieldSafety: snapshot,
          },
        })
      }
    }

    const scheduleScan = () => {
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer)
      }

      debounceTimer = setTimeout(() => {
        debounceTimer = null
        scanForBlockers()
      }, BLOCKER_MUTATION_DEBOUNCE_MS)
    }

    const observer =
      typeof MutationObserver === 'undefined'
        ? null
        : new MutationObserver(scheduleScan)
    observer?.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['class', 'style', 'open', 'role', 'aria-modal'],
    })

    scanForBlockers()
    const intervalId = window.setInterval(scanForBlockers, BLOCKER_SCAN_INTERVAL_MS)

    return () => {
      observer?.disconnect()
      window.clearInterval(intervalId)
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer)
      }
    }
  }, [debugEnabled, isFieldOperationActive, snapshot])

  return null
}
