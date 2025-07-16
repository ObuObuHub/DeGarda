'use client'

import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

interface Hospital {
  id: string
  name: string
  city: string
}

export default function HospitalLoginPage() {
  const router = useRouter()
  const params = useParams()
  const hospitalId = params.hospitalId as string
  
  const [accessCode, setAccessCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [hospital, setHospital] = useState<Hospital | null>(null)

  useEffect(() => {
    // Check if hospital was selected (check both localStorage and sessionStorage)
    const selectedHospitalId = localStorage.getItem('selectedHospitalId') || sessionStorage.getItem('selectedHospitalId')
    if (!selectedHospitalId || selectedHospitalId !== hospitalId) {
      router.push('/')
      return
    }
    
    // Ensure both storages have the value
    localStorage.setItem('selectedHospitalId', hospitalId)
    sessionStorage.setItem('selectedHospitalId', hospitalId)

    fetchHospital()
  }, [hospitalId, router])

  const fetchHospital = async () => {
    try {
      const response = await fetch(`/api/hospitals/${hospitalId}`)
      if (response.ok) {
        const data = await response.json()
        setHospital(data)
      } else {
        router.push('/')
      }
    } catch (error) {
      console.error('Failed to fetch hospital:', error)
      router.push('/')
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/access-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accessCode
        })
      })

      const data = await res.json()

      if (data.success) {
        // Store auth token and user info
        localStorage.setItem('authToken', data.token || 'authenticated')
        localStorage.setItem('selectedHospitalId', hospitalId)
        
        // Route based on user role
        if (data.user?.role === 'manager' || data.user?.role === 'admin') {
          router.push('/admin/dashboard')
        } else {
          router.push('/staff/schedule')
        }
      } else {
        setError(data.error || 'Cod de acces invalid')
      }
    } catch (err) {
      setError('Eroare de conexiune')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    sessionStorage.removeItem('selectedHospitalId')
    router.push('/')
  }

  if (!hospital) {
    return (
      <div className="min-h-screen bg-background-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 sm:p-8 bg-white shadow-xl">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Înapoi la selecție</span>
        </button>

        {/* Hospital Info */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🏥</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{hospital.name}</h2>
          <p className="text-gray-600">{hospital.city}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <Input
            type="text"
            label="Cod de Acces"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="Introdu codul de acces"
            required
          />

          {error && (
            <p className="text-sm text-system-red">{error}</p>
          )}

          <Button 
            type="submit"
            fullWidth
            disabled={isLoading || !accessCode.trim()}
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