'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { logger } from '@/lib/logger'

interface Permission {
  id: number
  department: string
  granted_by: number
  created_at: string
  granted_by_name: string
}

export default function GenerateShiftsPage() {
  const router = useRouter()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [staffDepartment, setStaffDepartment] = useState<string | null>(null)
  const [canGenerateShifts, setCanGenerateShifts] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true)

  // Generation form state
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')

  useEffect(() => {
    checkPermissions()
  }, [])

  const checkPermissions = async () => {
    setIsCheckingPermissions(true)
    
    try {
      const response = await fetch('/api/staff/shift-permissions')
      const data = await response.json()

      if (response.ok) {
        setPermissions(data.permissions || [])
        setStaffDepartment(data.staffDepartment)
        setCanGenerateShifts(data.canGenerateShifts)
        
        // Set default department if available
        if (data.permissions.length > 0) {
          setSelectedDepartment(data.permissions[0].department)
        }
      } else {
        setError(data.error || 'Failed to check permissions')
      }
    } catch (error) {
      logger.error('GenerateShiftsPage', 'Failed to check permissions', error)
      setError('Failed to check permissions')
    } finally {
      setIsCheckingPermissions(false)
    }
  }

  const handleGenerateShifts = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/shifts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
          department: selectedDepartment
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(`Gărzi generate cu succes pentru departamentul ${selectedDepartment}. ${data.shiftsGenerated || 0} gărzi create.`)
        setStartDate('')
        setEndDate('')
      } else {
        setError(data.error || 'Failed to generate shifts')
      }
    } catch (error) {
      logger.error('GenerateShiftsPage', 'Failed to generate shifts', error)
      setError('Failed to generate shifts')
    } finally {
      setIsLoading(false)
    }
  }

  if (isCheckingPermissions) {
    return (
      <div className="min-h-screen bg-background-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Verifică permisiunile...</p>
        </div>
      </div>
    )
  }

  if (!canGenerateShifts) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🚫</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Acces Restricționat
            </h1>
            <p className="text-gray-600 mb-6">
              Nu ai permisiunea de a genera gărzi pentru departamentul tău ({staffDepartment}).
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Contactează managerul pentru a obține permisiunea de generare a gărzilor.
            </p>
            <Button
              onClick={() => router.push('/staff/schedule')}
              variant="outline"
            >
              Înapoi la Program
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Generare Gărzi
          </h1>
          <p className="text-gray-600">
            Generează gărzi pentru departamentul tău
          </p>
        </div>

        {/* Permissions Info */}
        <Card className="mb-6 p-6 bg-green-50">
          <h3 className="text-lg font-semibold text-green-900 mb-3">
            Permisiuni Active
          </h3>
          <div className="space-y-2">
            {permissions.map((perm) => (
              <div key={perm.id} className="flex items-center justify-between">
                <span className="text-green-800">
                  Departament: <strong>{perm.department}</strong>
                </span>
                <span className="text-sm text-green-600">
                  Acordat de: {perm.granted_by_name}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Generation Form */}
        <Card className="p-6">
          <form onSubmit={handleGenerateShifts} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                type="date"
                label="Data Start"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
              
              <Input
                type="date"
                label="Data Sfârșit"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Departament
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Selectează departamentul</option>
                {permissions.map((perm) => (
                  <option key={perm.id} value={perm.department}>
                    {perm.department}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                type="submit"
                disabled={isLoading || !startDate || !endDate || !selectedDepartment}
              >
                {isLoading ? 'Generează...' : 'Generează Gărzi'}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/staff/schedule')}
              >
                Înapoi la Program
              </Button>
            </div>
          </form>
        </Card>

        {/* Instructions */}
        <Card className="mt-6 p-6 bg-blue-50">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Instrucțiuni
          </h3>
          <ul className="space-y-2 text-blue-800">
            <li>• Poți genera gărzi doar pentru departamentele pentru care ai permisiune</li>
            <li>• Selectează perioada pentru care dorești să generezi gărzi</li>
            <li>• Sistemul va crea automat gărzi pentru departamentul selectat</li>
            <li>• Gărzile generate vor fi vizibile în programul general</li>
            <li>• Doar managerul poate acorda/revoca permisiunile de generare</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}