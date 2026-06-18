import type { StoreApi } from 'zustand'
import { shallow } from 'zustand/shallow'

/**
 * Builds a setter that writes `state[key] = value`, but bails — returns the current state, so
 * zustand skips notifying — when the new value is shallow-equal to the stored one. Used for the
 * published value slices, so selector subscribers only re-render on a real change.
 */
export function shallowGuardedSetter<S extends object, K extends keyof S>(
  set: StoreApi<S>['setState'],
  key: K,
) {
  return (value: S[K]) =>
    set((state) =>
      shallow(state[key], value) ? state : ({ [key]: value } as unknown as Partial<S>),
    )
}

/**
 * Builds a setter that bails on reference equality (`Object.is`). Used for the stable handle
 * objects, whose identity only changes once — when the screen hook publishes the real handles.
 */
export function identityGuardedSetter<S extends object, K extends keyof S>(
  set: StoreApi<S>['setState'],
  key: K,
) {
  return (value: S[K]) =>
    set((state) =>
      state[key] === value ? state : ({ [key]: value } as unknown as Partial<S>),
    )
}
