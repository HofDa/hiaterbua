import type { Dispatch, SetStateAction } from 'react'

type SavingActionErrorMessage = string | ((error: unknown) => string)

type RunSavingActionOptions<TSavingState, TResult> = {
  setSaving: Dispatch<SetStateAction<TSavingState>>
  savingValue: TSavingState
  idleValue: TSavingState
  setError: Dispatch<SetStateAction<string>>
  errorMessage: SavingActionErrorMessage
  action: () => Promise<TResult> | TResult
}

/**
 * Wraps an async action in busy/error handling that writes through
 * caller-provided setters — for controllers whose saving/error state lives in an
 * external store rather than the component. For component-local state that binds
 * straight to JSX, use the `useAsyncOperation` hook instead.
 */
export async function runSavingAction<TSavingState, TResult = void>({
  setSaving,
  savingValue,
  idleValue,
  setError,
  errorMessage,
  action,
}: RunSavingActionOptions<TSavingState, TResult>) {
  setSaving(savingValue)
  setError('')

  try {
    return await action()
  } catch (error) {
    setError(
      typeof errorMessage === 'function' ? errorMessage(error) : errorMessage
    )
    return undefined
  } finally {
    setSaving(idleValue)
  }
}
