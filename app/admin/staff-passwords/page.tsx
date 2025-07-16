'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { logger } from '@/lib/logger'
import { useRouter } from 'next/navigation'
import withAuth, { AuthUser, WithAuthProps } from '@/components/withAuth'

interface StaffPassword {
  id: string
  staffId: number
  staffName: string
  password: string
  hospitalId: number
  hospitalName: string
  role: string
  specialization: string
  isActive: boolean
  createdAt: string
}

interface StaffPasswordsProps extends WithAuthProps {
  // Additional props if needed
}

function StaffPasswordsPage({ user, isLoading: authLoading, error: authError }: StaffPasswordsProps) {
  const router = useRouter()
  const [staffPasswords, setStaffPasswords] = useState<StaffPassword[]>([])
  const [hospitals, setHospitals] = useState<any[]>([])
  const [selectedHospital, setSelectedHospital] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (user) {
      // Check if user has admin/manager role
      if (user.role !== 'manager' && user.role !== 'admin') {
        router.push('/staff/schedule')
        return
      }

      // Set hospital for regular managers
      if (user.role === 'manager') {
        setSelectedHospital(user.hospitalId.toString())
      }
      
      fetchHospitals()
    }
  }, [user, router])

  useEffect(() => {
    if (selectedHospital) {
      fetchStaffPasswords()
    }
  }, [selectedHospital])

  const fetchHospitals = async () => {
    try {
      const response = await fetch('/api/hospitals', {
        credentials: 'include' // Include cookies for authentication
      })
      if (response.ok) {
        const data = await response.json()
        setHospitals(data)
        if (data.length > 0 && !selectedHospital) {
          setSelectedHospital(data[0].id.toString())
        }
      }
    } catch (error) {
      logger.error('StaffPasswordsPage', 'Failed to fetch hospitals', error)
      setError('Failed to fetch hospitals')
    }
  }

  const fetchStaffPasswords = async () => {
    if (!selectedHospital) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/staff-passwords?hospitalId=${selectedHospital}`, {
        credentials: 'include' // Include cookies for authentication
      })
      const data = await response.json()

      if (response.ok) {
        setStaffPasswords(data.passwords || [])
      } else {
        setError(data.error || 'Failed to fetch staff passwords')
      }
    } catch (error) {
      logger.error('StaffPasswordsPage', 'Failed to fetch staff passwords', error)
      setError('Failed to fetch staff passwords')
    } finally {
      setIsLoading(false)
    }
  }

  const generateNewPassword = async (staffId: number) => {
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/staff-passwords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          action: 'regenerate',
          staffId,
          hospitalId: selectedHospital
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(`New password generated: ${data.password}`)
        fetchStaffPasswords() // Refresh the list
      } else {
        setError(data.error || 'Failed to generate new password')
      }
    } catch (error) {
      logger.error('StaffPasswordsPage', 'Failed to generate password', error)
      setError('Failed to generate new password')
    } finally {
      setIsLoading(false)
    }
  }

  const selectedHospitalName = hospitals.find(h => h.id.toString() === selectedHospital)?.name || ''

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Parole Personal
          </h1>
          <p className="text-gray-600">
            Gestionează parolele personalului pentru autentificare
          </p>
        </div>

        {/* Hospital Selection */}
        {user?.role === 'admin' && (
          <Card className="mb-6 p-6">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">
                Selectează Spitalul:
              </label>
              <select
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
                className="form-select rounded-lg border-gray-300"
              >
                <option value="">Selectează...</option>
                {hospitals.map(hospital => (
                  <option key={hospital.id} value={hospital.id}>
                    {hospital.name} - {hospital.city}
                  </option>
                ))}
              </select>
            </div>
          </Card>
        )}

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

        {/* Staff Passwords List */}
        {selectedHospital && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Personal - {selectedHospitalName}
              </h2>
              <Button
                onClick={fetchStaffPasswords}
                disabled={isLoading}
                variant="outline"
              >
                {isLoading ? 'Se încarcă...' : 'Reîmprospătează'}
              </Button>
            </div>

            {isLoading && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}

            {!isLoading && staffPasswords.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                Nu există personal în această unitate
              </p>
            )}

            {!isLoading && staffPasswords.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nume
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Specializare
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Parolă
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acțiuni
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {staffPasswords.map((staff) => (
                      <tr key={staff.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {staff.staffName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {staff.specialization}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            staff.role === 'manager' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {staff.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                            {staff.password}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Button
                            onClick={() => generateNewPassword(staff.staffId)}
                            disabled={isLoading}
                            variant="outline"
                            size="sm"
                          >
                            Generează Nouă
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Instructions */}
        <Card className="mt-6 p-6 bg-blue-50">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Instrucțiuni
          </h3>
          <ul className="space-y-2 text-blue-800">
            <li>• Fiecare membru al personalului are o parolă unică de 3 caractere</li>
            <li>• Parolele sunt generate automat pe baza inițialelor numelui</li>
            <li>• Personalul folosește aceste parole pentru autentificare</li>
            <li>• Poți regenera parolele în caz de nevoie</li>
            <li>• Parolele sunt unice per spital</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

export default withAuth(StaffPasswordsPage)