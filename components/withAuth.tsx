'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/logger'
import AuthErrorBoundary from './AuthErrorBoundary'

interface AuthUser {
  userId: number
  name: string
  email: string
  role: 'admin' | 'manager' | 'staff'
  hospitalId: number
  hospitalName: string
}

interface WithAuthProps {
  user: AuthUser | null
  isLoading: boolean
  error: string | null
}

interface WithAuthOptions {
  requiredRole?: 'admin' | 'manager' | 'staff'
  allowedRoles?: ('admin' | 'manager' | 'staff')[]
  redirectTo?: string
}

function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P & WithAuthProps>,
  options: WithAuthOptions = {}
) {
  const AuthenticatedComponent = (props: P) => {
    const router = useRouter()
    const [user, setUser] = useState<AuthUser | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
      checkAuth()
    }, [])

    const checkAuth = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const token = localStorage.getItem('authToken')
        if (!token) {
          handleAuthError('No token found')
          return
        }

        const response = await fetch('/api/auth/verify', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          if (response.status === 401) {
            handleAuthError('Token expired or invalid')
          } else {
            handleAuthError('Authentication failed')
          }
          return
        }

        const data = await response.json()
        
        if (!data.success) {
          handleAuthError('Invalid response from server')
          return
        }

        const userData: AuthUser = {
          userId: data.userId,
          name: data.name,
          email: data.email,
          role: data.role,
          hospitalId: data.hospitalId,
          hospitalName: data.hospitalName
        }

        // Check role requirements
        if (options.requiredRole && userData.role !== options.requiredRole) {
          handleAuthError(`Required role: ${options.requiredRole}, but user has role: ${userData.role}`)
          return
        }

        if (options.allowedRoles && !options.allowedRoles.includes(userData.role)) {
          handleAuthError(`User role ${userData.role} not allowed. Allowed roles: ${options.allowedRoles.join(', ')}`)
          return
        }

        setUser(userData)
        
      } catch (err) {
        logger.error('withAuth', 'Authentication check failed', err)
        handleAuthError('Authentication check failed')
      } finally {
        setIsLoading(false)
      }
    }

    const handleAuthError = (errorMessage: string) => {
      setError(errorMessage)
      setUser(null)
      
      // Clear invalid token
      localStorage.removeItem('authToken')
      sessionStorage.clear()
      
      // Redirect to login or specified page
      const redirectPath = options.redirectTo || '/'
      router.push(redirectPath)
    }

    const handleAuthErrorBoundary = () => {
      handleAuthError('Authentication boundary triggered')
    }

    // Show loading state
    if (isLoading) {
      return (
        <div className="min-h-screen bg-background-secondary flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Verifică autentificarea...</p>
          </div>
        </div>
      )
    }

    // Show error state
    if (error || !user) {
      return (
        <div className="min-h-screen bg-background-secondary flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔐</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Acces restricționat
            </h2>
            <p className="text-gray-600 mb-6">
              {error || 'Nu ai permisiunea să accesezi această pagină.'}
            </p>
            <button 
              onClick={() => router.push('/')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Înapoi la login
            </button>
          </div>
        </div>
      )
    }

    // Render the wrapped component with auth data
    return (
      <AuthErrorBoundary onAuthError={handleAuthErrorBoundary}>
        <WrappedComponent 
          {...props} 
          user={user}
          isLoading={isLoading}
          error={error}
        />
      </AuthErrorBoundary>
    )
  }

  // Set display name for debugging
  AuthenticatedComponent.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name})`

  return AuthenticatedComponent
}

export default withAuth
export type { AuthUser, WithAuthProps }