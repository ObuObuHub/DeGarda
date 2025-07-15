'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { logger } from '@/lib/logger'

export default function LoginPage() {
  const router = useRouter()
  const [accessCode, setAccessCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!accessCode.trim()) {
      setError('Introduceți codul de acces')
      return
    }
    
    setIsLoading(true)
    setError('')
    
    try {
      logger.debug('Auth', 'Attempting login with access code')
      
      const response = await fetch('/api/auth/access-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: accessCode.trim() })
      })
      
      const data = await response.json()
      
      if (data.success && data.user) {
        logger.info('Auth', 'Login successful', { 
          role: data.user.role, 
          hospitalId: data.user.hospitalId 
        })
        
        // Redirect based on role
        switch (data.user.role) {
          case 'staff':
            router.push('/staff/dashboard')
            break
          case 'manager':
            router.push('/admin/dashboard')
            break
          default:
            router.push('/dashboard')
        }
      } else {
        setError(data.error || 'Cod de acces invalid')
      }
    } catch (error) {
      logger.error('Auth', 'Login request failed', error)
      setError('Eroare la conectare. Încercați din nou.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="p-8">
          <div className="text-center mb-8">
            <div className="text-4xl mb-4">🏥</div>
            <h1 className="text-2xl font-bold text-label-primary mb-2">
              DeGarda
            </h1>
            <p className="text-sm text-label-secondary">
              Sistem de Gestionare Gărzi Medicale
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label 
                htmlFor="accessCode" 
                className="block text-sm font-medium text-label-secondary mb-2"
              >
                Cod de Acces
              </label>
              <Input
                id="accessCode"
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="ex: gt5 sau a7k9m3"
                className="w-full text-center font-mono"
                disabled={isLoading}
                autoFocus
              />
              <p className="text-xs text-label-tertiary mt-1">
                Introduceți codul primit de la administratorul spitalului
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              disabled={isLoading || !accessCode.trim()}
            >
              {isLoading ? 'Se conectează...' : 'Conectare'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-separator">
            <div className="text-center">
              <p className="text-xs text-label-tertiary mb-2">
                Tipuri de cod de acces:
              </p>
              <div className="space-y-1 text-xs text-label-tertiary">
                <p><span className="font-mono">gt5, md2, pk7</span> - Personal medical</p>
                <p><span className="font-mono">a7k9m3, x2p8q1</span> - Manager departament</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}