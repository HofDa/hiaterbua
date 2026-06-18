import { useEffect } from 'react'

/**
 * Publishes a freshly-built value slice to the store on every commit. The store's setter
 * shallow-guards, so subscribers only re-render when a value actually changed — which is why
 * this intentionally has no dependency array.
 */
export function usePublishedSlice<T>(publish: (value: T) => void, value: T): void {
  useEffect(() => {
    publish(value)
  })
}

/**
 * Publishes a stable handle object to the store. The handles keep a stable identity (via
 * `useStableHandles`), so this effectively runs once.
 */
export function usePublishedHandles<T>(publish: (handles: T) => void, handles: T): void {
  useEffect(() => {
    publish(handles)
  }, [publish, handles])
}
