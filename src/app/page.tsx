'use client'

import { useState, useEffect } from 'react'
import { auth } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [personalCode, setPersonalCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in
    if (auth.isAuthenticated()) {
      router.push('/dashboard')
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { user, error: loginError } = await auth.loginWithCode(personalCode)

      if (loginError || !user) {
        setError(loginError || 'Cod personal invalid')
      } else {
        router.push('/dashboard')
      }
    } catch {
      setError('Eroare la conectare')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="card w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🏥 Degarda</h1>
          <p className="text-gray-600">Programare ture spital</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cod Personal
            </label>
            <input
              type="text"
              value={personalCode}
              onChange={(e) => setPersonalCode(e.target.value.toUpperCase())}
              className="input text-center text-lg font-mono tracking-wider"
              placeholder="ANA1"
              required
              autoFocus
              maxLength={20}
            />
            <p className="text-xs text-gray-500 mt-1 text-center">
              Introdu codul tău personal
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? 'Se conectează...' : 'Conectează-te'}
          </button>
        </form>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">Coduri demo:</p>
          <p className="text-xs text-gray-500 font-mono">
            • Manager: <strong>ANA1</strong><br/>
            • Staff: <strong>MAR1</strong>, <strong>ION1</strong>, <strong>ELE1</strong>
          </p>
        </div>
      </div>
    </div>
  )
}