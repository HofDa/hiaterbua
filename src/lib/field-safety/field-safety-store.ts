'use client'

import { useEffect, useSyncExternalStore } from 'react'
import {
  buildFieldSafetySnapshot,
  type FieldOperationSource,
  type FieldSafetySnapshot,
} from '@/lib/field-safety/field-safety-state'

type Listener = () => void

const activeSources = new Map<string, FieldOperationSource>()
const listeners = new Set<Listener>()

// useSyncExternalStore compares snapshots with Object.is on every render, so
// getSnapshot must return a stable reference until the store actually changes —
// rebuilding the object per call re-renders forever (React error #185).
let snapshot: FieldSafetySnapshot = buildFieldSafetySnapshot(activeSources.values())

function emitChange() {
  snapshot = buildFieldSafetySnapshot(activeSources.values())
  listeners.forEach((listener) => listener())
}

export function subscribeToTransientFieldOperations(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getTransientFieldSafetySnapshot(): FieldSafetySnapshot {
  return snapshot
}

export function setTransientFieldOperation(
  id: string,
  source: FieldOperationSource,
  active: boolean
) {
  const currentSource = activeSources.get(id)

  if (active) {
    if (currentSource === source) return
    activeSources.set(id, source)
    emitChange()
    return
  }

  if (!currentSource) return
  activeSources.delete(id)
  emitChange()
}

export function useTransientFieldOperation(
  id: string,
  source: FieldOperationSource,
  active: boolean
) {
  useEffect(() => {
    setTransientFieldOperation(id, source, active)

    return () => {
      setTransientFieldOperation(id, source, false)
    }
  }, [active, id, source])
}

export function useTransientFieldSafetySnapshot() {
  return useSyncExternalStore(
    subscribeToTransientFieldOperations,
    getTransientFieldSafetySnapshot,
    getTransientFieldSafetySnapshot
  )
}

export function resetTransientFieldOperationsForTests() {
  activeSources.clear()
  emitChange()
}
