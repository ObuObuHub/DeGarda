'use client'

import React from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { logger } from '@/lib/logger'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{
    error: Error
    resetError: () => void
  }>
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error to our logging system
    logger.error('ErrorBoundary', 'React component error caught', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    })
  }

  handleResetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return (
          <FallbackComponent 
            error={this.state.error!} 
            resetError={this.handleResetError}
          />
        )
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-background-secondary flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              A apărut o eroare
            </h2>
            
            <p className="text-gray-600 mb-6">
              Ne pare rău, dar ceva nu a mers bine. Echipa noastră a fost notificată despre această problemă.
            </p>
            
            <div className="space-y-3">
              <Button 
                onClick={this.handleResetError}
                variant="primary"
                fullWidth
              >
                Încearcă din nou
              </Button>
              
              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline"
                fullWidth
              >
                Înapoi la prima pagină
              </Button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Detalii dezvoltare
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary