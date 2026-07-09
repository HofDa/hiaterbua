'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { recordFieldDiagnostic } from '@/lib/diagnostics/field-diagnostics'
import { logError } from '@/lib/utils/log'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { ErrorAlert } from './alert'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })

    // Route through the central observability seam so render-time crashes leave
    // a trace in production, not just in dev. The component stack stays visible
    // in the dev-only details panel below.
    logError('ErrorBoundary', error)
    recordFieldDiagnostic({
      type: 'react_error_boundary',
      level: 'error',
      message: error.message || 'React ErrorBoundary hat einen Fehler abgefangen.',
      details: {
        error,
        componentStack: errorInfo.componentStack,
      },
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <Card className="m-4">
          <CardHeader>
            <CardTitle className="text-error-ink">Ein Fehler ist aufgetreten</CardTitle>
          </CardHeader>
          <CardContent>
            <ErrorAlert className="mb-4">
              Die Anwendung konnte nicht geladen werden. Bitte versuchen Sie, die Seite neu zu laden.
            </ErrorAlert>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer font-mono text-xs mb-2">
                  Fehlerdetails (nur in Entwicklung)
                </summary>
                <div className="bg-gray-100 p-2 rounded overflow-auto">
                  <pre className="whitespace-pre-wrap">
                    {this.state.error.toString()}
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </pre>
                </div>
              </details>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-2xl border-2 border-border bg-surface-raised px-4 py-2 text-sm font-semibold text-ink"
            >
              Seite neu laden
            </button>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}
