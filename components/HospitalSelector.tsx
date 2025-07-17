'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { logger } from '@/lib/logger'

interface Hospital {
  id: number
  name: string
  city: string
}

interface HospitalSelectorProps {
  selectedHospital: string
  onHospitalChange: (hospitalId: string) => void
  userRole: 'admin' | 'manager' | 'staff'
  userHospitalId?: number
  className?: string
}

export function HospitalSelector({
  selectedHospital,
  onHospitalChange,
  userRole,
  userHospitalId,
  className = ''
}: HospitalSelectorProps) {
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchHospitals()
  }, [])

  const fetchHospitals = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/hospitals', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setHospitals(data)
        
        // Auto-select based on role
        if (userRole === 'manager' && userHospitalId) {
          onHospitalChange(userHospitalId.toString())
        } else if (data.length > 0 && !selectedHospital) {
          onHospitalChange(data[0].id.toString())
        }
      } else {
        setError('Failed to fetch hospitals')
      }
    } catch (error) {
      logger.error('HospitalSelector', 'Failed to fetch hospitals', error)
      setError('Failed to fetch hospitals')
    } finally {
      setLoading(false)
    }
  }

  // Don't show selector for managers (they're restricted to their hospital)
  if (userRole === 'manager') {
    return null
  }

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-sm text-gray-600">Loading hospitals...</span>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-red-600 text-sm">{error}</div>
      </Card>
    )
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700">
          Selectează Spitalul:
        </label>
        <select
          value={selectedHospital}
          onChange={(e) => onHospitalChange(e.target.value)}
          className="form-select rounded-lg border-gray-300 min-w-[200px]"
        >
          <option value="">Selectează...</option>
          {hospitals.map(hospital => (
            <option key={hospital.id} value={hospital.id.toString()}>
              {hospital.name} - {hospital.city}
            </option>
          ))}
        </select>
      </div>
    </Card>
  )
}