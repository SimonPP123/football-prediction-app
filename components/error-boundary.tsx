'use client'

import { Component, ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: undefined })
              window.location.reload()
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Functional wrapper for ErrorBoundary with custom fallback message
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallbackMessage?: string
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary
        fallback={
          fallbackMessage ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <AlertCircle className="w-12 h-12 text-destructive mb-4" />
              <p className="text-sm text-muted-foreground">{fallbackMessage}</p>
            </div>
          ) : undefined
        }
      >
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}
