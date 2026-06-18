import type { Dispatch, SetStateAction } from 'react'

export type StateSliceAction<
  TState extends object,
  TKey extends keyof TState = keyof TState,
> = TKey extends keyof TState
  ? {
      key: TKey
      value: SetStateAction<TState[TKey]>
    }
  : never

function resolveSetStateAction<TValue>(
  currentValue: TValue,
  nextValue: SetStateAction<TValue>,
) {
  return typeof nextValue === 'function'
    ? (nextValue as (value: TValue) => TValue)(currentValue)
    : nextValue
}

export function stateSliceReducer<TState extends object>(
  state: TState,
  action: StateSliceAction<TState>,
): TState {
  const previousValue = state[action.key]
  const nextValue = resolveSetStateAction(
    previousValue,
    action.value as SetStateAction<typeof previousValue>,
  )

  if (Object.is(previousValue, nextValue)) {
    return state
  }

  return {
    ...state,
    [action.key]: nextValue,
  }
}

export function createStateSliceSetter<TState extends object, TKey extends keyof TState>(
  dispatch: Dispatch<StateSliceAction<TState>>,
  key: TKey,
): Dispatch<SetStateAction<TState[TKey]>> {
  return (value) => dispatch({ key, value } as unknown as StateSliceAction<TState>)
}

export function createStateSliceSetterFactory<TState extends object>(
  dispatch: Dispatch<StateSliceAction<TState>>,
) {
  return <TKey extends keyof TState>(key: TKey) =>
    createStateSliceSetter<TState, TKey>(dispatch, key)
}
