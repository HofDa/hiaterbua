import { useState } from 'react'

export function useAsyncOperation<T = void>() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [status, setStatus] = useState<string>('')

  const execute = async (
    operation: () => Promise<T>, 
    options?: {
      successMessage?: string | ((result: T) => string)
      loadingMessage?: string
    }
  ) => {
    setIsLoading(true)
    setError('')
    if (options?.loadingMessage) {
      setStatus(options.loadingMessage)
    }

    try {
      const result = await operation()
      if (options?.successMessage) {
        const message = typeof options.successMessage === 'function' 
          ? options.successMessage(result) 
          : options.successMessage
        setStatus(message)
      }
      return { success: true, data: result, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Operation failed'
      setError(errorMessage)
      return { success: false, data: null, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }

  const reset = () => {
    setIsLoading(false)
    setError('')
    setStatus('')
  }

  return {
    isLoading,
    error,
    status,
    execute,
    reset,
    setIsLoading,
    setError,
    setStatus,
  }
}
