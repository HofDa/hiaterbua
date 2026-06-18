import { useState } from 'react'
import { useLatestValueRef } from '@/components/maps/hooks/use-latest-value-ref'

type HandlerMap = Record<string, (...args: never[]) => unknown>

/**
 * Returns a referentially-stable proxy of a map of callbacks. The returned object's
 * identity — and each member's identity — never changes, but every call always invokes
 * the latest closure passed in.
 *
 * This exists because the map controllers recreate their action closures on every render
 * (no `useCallback`). Selector-based consumers (the zustand store / memoized panels) need
 * stable references to avoid re-rendering on every parent update; this bridges the two.
 *
 * The set of keys is fixed on the first render, which matches how the handle maps are used.
 */
export function useStableHandles<T extends HandlerMap>(handlers: T): T {
  const handlersRef = useLatestValueRef(handlers)

  const [stableHandles] = useState<T>(() => {
    const proxy = {} as T
    for (const key of Object.keys(handlers) as Array<keyof T>) {
      proxy[key] = ((...args: never[]) => handlersRef.current[key](...args)) as T[keyof T]
    }
    return proxy
  })

  return stableHandles
}
