'use client'

import React from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { logger } from '@/lib/logger'

interface AuthErrorBoundaryProps {
  children: React.ReactNode
  onAuthError?: () => void
}

interface AuthErrorBoundaryState {
  hasError: boolean
  error: Error | null
  isAuthError: boolean
}

class AuthErrorBoundary extends React.Component<AuthErrorBoundaryProps, AuthErrorBoundaryState> {
  constructor(props: AuthErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      isAuthError: false
    }
  }

  static getDerivedStateFromError(error: Error): Partial<AuthErrorBoundaryState> {
    // Check if this is an authentication-related error
    const isAuthError = error.message.includes('401') || 
                        error.message.includes('Unauthorized') ||
                        error.message.includes('Invalid token') ||
                        error.message.includes('Token expired')

    return {
      hasError: true,
      error,
      isAuthError
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log authentication errors with special handling
    if (this.state.isAuthError) {
      logger.warn('AuthErrorBoundary', 'Authentication error caught', error, {
        componentStack: errorInfo.componentStack,
        isAuthError: true
      })
      
      // Call the auth error handler if provided
      if (this.props.onAuthError) {
        this.props.onAuthError()
      }
    } else {
      logger.error('AuthErrorBoundary', 'Non-auth error caught', error, {
        componentStack: errorInfo.componentStack
      })
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      isAuthError: false
    })
  }

  handleLogin = () => {
    // Clear any stored auth tokens
    localStorage.removeItem('authToken')
    sessionStorage.clear()
    
    // Redirect to login
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.state.isAuthError) {
        return (
          <div className="min-h-screen bg-background-secondary flex items-center justify-center p-4">
            <Card className="max-w-md w-full p-8 text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔐</span>
              </div>
              
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Sesiune expirată
              </h2>
              
              <p className="text-gray-600 mb-6">
                Sesiunea ta a expirat sau nu ești autentificat. Te rugăm să te conectezi din nou.
              </p>
              
              <div className="space-y-3">
                <Button 
                  onClick={this.handleLogin}
                  variant="primary"
                  fullWidth
                >
                  Conectează-te
                </Button>
                
                <Button 
                  onClick={this.handleRetry}
                  variant="outline"
                  fullWidth
                >
                  Încearcă din nou
                </Button>
              </div>
            </Card>
          </div>
        )
      }

      // Non-auth error fallback
      return (
        <div className="min-h-screen bg-background-secondary flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">❌</span>
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Eroare în aplicație
            </h2>
            
            <p className="text-gray-600 mb-6">
              A apărut o eroare neașteptată. Te rugăm să încerci din nou.
            </p>
            
            <div className="space-y-3">
              <Button 
                onClick={this.handleRetry}
                variant="primary"
                fullWidth
              >
                Încearcă din nou
              </Button>
              
              <Button 
                onClick={this.handleLogin}
                variant="outline"
                fullWidth
              >
                Înapoi la login
              </Button>
            </div>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export default AuthErrorBoundary