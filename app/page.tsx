'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function DirectLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/access-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accessCode: password
        })
      })

      const data = await res.json()

      if (data.success) {
        // Authentication successful - token is now stored in HTTP-only cookie
        // No need to store token in localStorage anymore for security
        
        // Route based on user role
        if (data.user?.role === 'admin') {
          router.push('/admin/dashboard')
        } else if (data.user?.role === 'manager') {
          router.push('/admin/dashboard')
        } else {
          router.push('/staff/schedule')
        }
      } else {
        setError(data.error || 'Parolă invalidă')
      }
    } catch (err) {
      setError('Eroare de conexiune')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 sm:p-8 bg-white shadow-xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🏥</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">DeGarda</h1>
          <p className="text-gray-600">Sistem de Gestionare a Gărzilor</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <Input
            type="text"
            label="Parolă Personal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Introdu parola ta (ex: AB3)"
            required
            autoFocus
          />

          {error && (
            <p className="text-sm text-system-red">{error}</p>
          )}

          <Button 
            type="submit"
            fullWidth
            disabled={isLoading || !password.trim()}
          >
            {isLoading ? 'Se conectează...' : 'Conectare'}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            DeGarda v2.0 • 2025
          </p>
        </div>
      </Card>
    </div>
  )
}