'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { logger } from '@/lib/logger'
import { useRouter } from 'next/navigation'

interface StaffMember {
  id: number
  name: string
  specialization: string
  role: string
  hospital_id: number
  hospital_name: string
  password_plain: string
  permissions: Array<{
    id: number
    department: string
    granted_by: number
    granted_at: string
  }>
}

interface Hospital {
  id: number
  name: string
  departments: string[]
}

export default function ShiftPermissionsPage() {
  const router = useRouter()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [selectedHospital, setSelectedHospital] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
    fetchHospitals()
  }, [])

  useEffect(() => {
    if (selectedHospital) {
      fetchStaffPermissions()
    }
  }, [selectedHospital])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        router.push('/login')
        return
      }

      const data = await response.json()
      setUserRole(data.role)
      
      if (data.role !== 'manager' && data.role !== 'admin') {
        router.push('/staff/schedule')
        return
      }

      // Set hospital for regular managers
      if (data.role === 'manager') {
        setSelectedHospital(data.hospitalId.toString())
      }
    } catch (error) {
      logger.error('ShiftPermissionsPage', 'Auth check failed', error)
      router.push('/login')
    }
  }

  const fetchHospitals = async () => {
    try {
      const response = await fetch('/api/hospitals')
      if (response.ok) {
        const data = await response.json()
        const hospitalsWithDepartments = data.map((h: any) => ({
          id: h.id,
          name: h.name,
          departments: getValidDepartmentsForHospital(h.id)
        }))
        setHospitals(hospitalsWithDepartments)
        
        if (hospitalsWithDepartments.length > 0 && !selectedHospital) {
          setSelectedHospital(hospitalsWithDepartments[0].id.toString())
        }
      }
    } catch (error) {
      logger.error('ShiftPermissionsPage', 'Failed to fetch hospitals', error)
      setError('Failed to fetch hospitals')
    }
  }

  const getValidDepartmentsForHospital = (hospitalId: number): string[] => {
    // Hospital 5 (Piatra-Neamț) - Only LABORATOR
    if (hospitalId === 5) {
      return ['Laborator']
    }
    
    // Hospital 6 (Buhuși) - Multiple departments
    if (hospitalId === 6) {
      return ['ATI', 'Urgențe', 'Chirurgie', 'Medicină Internă']
    }
    
    // Default fallback
    return ['Laborator']
  }

  const fetchStaffPermissions = async () => {
    if (!selectedHospital) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/shift-permissions?hospitalId=${selectedHospital}`)
      const data = await response.json()

      if (response.ok) {
        setStaff(data.staff || [])
      } else {
        setError(data.error || 'Failed to fetch staff permissions')
      }
    } catch (error) {
      logger.error('ShiftPermissionsPage', 'Failed to fetch staff permissions', error)
      setError('Failed to fetch staff permissions')
    } finally {
      setIsLoading(false)
    }
  }

  const grantPermission = async (staffId: number, department: string) => {
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/shift-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'grant',
          staffId,
          department,
          hospitalId: selectedHospital
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message)
        fetchStaffPermissions() // Refresh the list
      } else {
        setError(data.error || 'Failed to grant permission')
      }
    } catch (error) {
      logger.error('ShiftPermissionsPage', 'Failed to grant permission', error)
      setError('Failed to grant permission')
    } finally {
      setIsLoading(false)
    }
  }

  const revokePermission = async (staffId: number, department: string) => {
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/shift-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revoke',
          staffId,
          department,
          hospitalId: selectedHospital
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message)
        fetchStaffPermissions() // Refresh the list
      } else {
        setError(data.error || 'Failed to revoke permission')
      }
    } catch (error) {
      logger.error('ShiftPermissionsPage', 'Failed to revoke permission', error)
      setError('Failed to revoke permission')
    } finally {
      setIsLoading(false)
    }
  }

  const selectedHospitalData = hospitals.find(h => h.id.toString() === selectedHospital)
  const selectedHospitalName = selectedHospitalData?.name || ''

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Permisiuni Generare Gărzi
          </h1>
          <p className="text-gray-600">
            Gestionează permisiunile personalului pentru generarea gărzilor în departamente
          </p>
        </div>

        {/* Hospital Selection */}
        {userRole === 'admin' && (
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
                    {hospital.name}
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

        {/* Staff Permissions List */}
        {selectedHospital && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Personal - {selectedHospitalName}
              </h2>
              <Button
                onClick={fetchStaffPermissions}
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

            {!isLoading && staff.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                Nu există personal în această unitate
              </p>
            )}

            {!isLoading && staff.length > 0 && (
              <div className="space-y-4">
                {staff.map((member) => (
                  <div key={member.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h3 className="font-medium text-gray-900">{member.name}</h3>
                            <p className="text-sm text-gray-500">
                              {member.specialization} • Parolă: {member.password_plain}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {/* Current permissions */}
                        {member.permissions.length > 0 && (
                          <div className="flex items-center space-x-1 mr-4">
                            <span className="text-sm text-gray-500">Permisiuni:</span>
                            {member.permissions.map((perm) => (
                              <span
                                key={perm.id}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                              >
                                {perm.department}
                                <button
                                  onClick={() => revokePermission(member.id, perm.department)}
                                  className="ml-1 text-green-600 hover:text-green-800"
                                  disabled={isLoading}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* Grant permission for member's department */}
                        {selectedHospitalData && (
                          <div className="flex items-center space-x-2">
                            {/* Only show grant button if staff doesn't have permission for their department */}
                            {!member.permissions.some(p => p.department === member.specialization) && (
                              <Button
                                onClick={() => grantPermission(member.id, member.specialization)}
                                disabled={isLoading}
                                variant="outline"
                                size="sm"
                              >
                                Acordă pentru {member.specialization}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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
            <li>• Managerii pot acorda permisiuni doar personalului din spitalul lor</li>
            <li>• Personalul poate genera gărzi doar pentru departamentul lor</li>
            <li>• Piatra-Neamț: Doar departamentul LABORATOR</li>
            <li>• Buhuși: Departamentele ATI, Urgențe, Chirurgie, Medicină Internă</li>
            <li>• Permisiunile pot fi revocate oricând</li>
            <li>• Personalul cu permisiuni va vedea butonul "Generează Gărzi" în interfață</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}