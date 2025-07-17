'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { HospitalSelector } from '@/components/HospitalSelector'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import withAuth, { AuthUser, WithAuthProps } from '@/components/withAuth'
import { logger } from '@/lib/logger'
import { apiClient } from '@/lib/apiClient'

interface Staff {
  id: number
  name: string
  email: string
  role: string
  hospital_id: number
  is_active: boolean
  specialization: string
  access_code?: string
}

interface ShiftPermission {
  id: number
  staff_id: number
  department: string
  can_generate: boolean
  granted_by: number
  granted_at: string
  staff_name: string
}

interface ManagementPageProps extends WithAuthProps {
  // Additional props if needed
}

function ManagementPage({ user, isLoading: authLoading, error: authError }: ManagementPageProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'staff' | 'permissions' | 'access-codes'>('staff')
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('')
  
  // Staff management state
  const [staff, setStaff] = useState<Staff[]>([])
  const [isLoadingStaff, setIsLoadingStaff] = useState(false)
  
  // Permissions state
  const [permissions, setPermissions] = useState<ShiftPermission[]>([])
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false)
  
  // Access codes state
  const [accessCodes, setAccessCodes] = useState<{ hospital_codes: any[], manager_codes: any[] }>({
    hospital_codes: [],
    manager_codes: []
  })
  const [isLoadingCodes, setIsLoadingCodes] = useState(false)
  
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isAdmin = user?.role === 'admin'
  const isManager = user?.role === 'manager'

  // Only allow managers and admins
  if (!isAdmin && !isManager) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Acces Restricționat</h1>
            <p className="text-gray-600 mb-6">
              Această pagină este disponibilă doar pentru manageri și administratori.
            </p>
            <Button onClick={() => router.push('/dashboard')}>
              Înapoi la Dashboard
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  useEffect(() => {
    if (user) {
      if (isAdmin) {
        setSelectedHospitalId('5') // Default to Piatra-Neamț for admin
      } else if (user.hospitalId) {
        setSelectedHospitalId(user.hospitalId.toString())
      }
    }
  }, [user])

  useEffect(() => {
    if (selectedHospitalId) {
      loadData()
    }
  }, [selectedHospitalId, activeTab])

  const loadData = async () => {
    switch (activeTab) {
      case 'staff':
        await loadStaff()
        break
      case 'permissions':
        await loadPermissions()
        break
      case 'access-codes':
        await loadAccessCodes()
        break
    }
  }

  const loadStaff = async () => {
    setIsLoadingStaff(true)
    try {
      const data = await apiClient.get<{ success: boolean, staff?: Staff[], error?: string }>(
        `/api/staff?hospitalId=${selectedHospitalId}`
      )

      if (data.success) {
        setStaff(data.staff || [])
      } else {
        setError(data.error || 'Failed to load staff')
      }
    } catch (error: any) {
      logger.error('ManagementPage', 'Failed to load staff', error)
      setError(error.message || 'Failed to load staff')
    } finally {
      setIsLoadingStaff(false)
    }
  }

  const loadPermissions = async () => {
    setIsLoadingPermissions(true)
    try {
      const data = await apiClient.get<{ success: boolean, permissions?: ShiftPermission[], error?: string }>(
        `/api/admin/shift-permissions?hospitalId=${selectedHospitalId}`
      )

      if (data.success) {
        setPermissions(data.permissions || [])
      } else {
        setError(data.error || 'Failed to load permissions')
      }
    } catch (error: any) {
      logger.error('ManagementPage', 'Failed to load permissions', error)
      setError(error.message || 'Failed to load permissions')
    } finally {
      setIsLoadingPermissions(false)
    }
  }

  const loadAccessCodes = async () => {
    setIsLoadingCodes(true)
    try {
      const data = await apiClient.get<{ success: boolean, hospital_codes?: any[], manager_codes?: any[], error?: string }>(
        `/api/admin/staff-codes?hospitalId=${selectedHospitalId}`
      )

      if (data.success) {
        setAccessCodes({
          hospital_codes: data.hospital_codes || [],
          manager_codes: data.manager_codes || []
        })
      } else {
        setError(data.error || 'Failed to load access codes')
      }
    } catch (error: any) {
      logger.error('ManagementPage', 'Failed to load access codes', error)
      setError(error.message || 'Failed to load access codes')
    } finally {
      setIsLoadingCodes(false)
    }
  }

  const toggleShiftPermission = async (staffId: number, department: string, canGenerate: boolean) => {
    try {
      setError('')
      setSuccess('')

      const data = await apiClient.post<{ success: boolean, error?: string }>(
        '/api/admin/shift-permissions',
        {
          staffId,
          department,
          canGenerate: !canGenerate
        }
      )

      if (data.success) {
        setSuccess(`Permisiune ${!canGenerate ? 'acordată' : 'revocată'} cu succes`)
        await loadPermissions()
      } else {
        setError(data.error || 'Failed to update permission')
      }
    } catch (error: any) {
      logger.error('ManagementPage', 'Failed to toggle permission', error)
      setError(error.message || 'Failed to update permission')
    }
  }

  const toggleStaffStatus = async (staffId: number, isActive: boolean) => {
    try {
      setError('')
      setSuccess('')

      const data = await apiClient.patch<{ success: boolean, error?: string }>(
        `/api/staff/${staffId}`,
        {
          is_active: !isActive
        }
      )

      if (data.success) {
        setSuccess(`Statut personal ${!isActive ? 'activat' : 'dezactivat'} cu succes`)
        await loadStaff()
      } else {
        setError(data.error || 'Failed to update staff status')
      }
    } catch (error: any) {
      logger.error('ManagementPage', 'Failed to toggle staff status', error)
      setError(error.message || 'Failed to update staff status')
    }
  }

  const renderStaffTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Personal Spital</h3>
        {isLoadingStaff && <LoadingSpinner size="sm" />}
      </div>

      {staff.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Nu există personal înregistrat pentru acest spital.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {staff.map((member) => (
            <Card key={member.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${member.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <h4 className="font-medium text-gray-900">{member.name}</h4>
                      <p className="text-sm text-gray-600">
                        {member.email} • {member.specialization} • {member.role}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    member.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {member.is_active ? 'Activ' : 'Inactiv'}
                  </span>
                  
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant={member.is_active ? "danger" : "primary"}
                      onClick={() => toggleStaffStatus(member.id, member.is_active)}
                    >
                      {member.is_active ? 'Dezactivează' : 'Activează'}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )

  const renderPermissionsTab = () => {
    const staffWithPermissions = staff.map(member => {
      const permission = permissions.find(p => p.staff_id === member.id)
      return {
        ...member,
        canGenerate: permission?.can_generate || false,
        department: permission?.department || 'LABORATOR'
      }
    }).filter(member => member.role === 'staff')

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Permisiuni Generare Gărzi</h3>
          {isLoadingPermissions && <LoadingSpinner size="sm" />}
        </div>

        {staffWithPermissions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Nu există personal disponibil pentru acordarea permisiunilor.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {staffWithPermissions.map((member) => (
              <Card key={member.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h4 className="font-medium text-gray-900">{member.name}</h4>
                        <p className="text-sm text-gray-600">
                          {member.specialization} • {member.department}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      member.canGenerate ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {member.canGenerate ? 'Poate genera' : 'Nu poate genera'}
                    </span>
                    
                    <Button
                      size="sm"
                      variant={member.canGenerate ? "danger" : "primary"}
                      onClick={() => toggleShiftPermission(member.id, member.department, member.canGenerate)}
                    >
                      {member.canGenerate ? 'Revocă' : 'Acordă'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderAccessCodesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Coduri de Acces</h3>
        {isLoadingCodes && <LoadingSpinner size="sm" />}
      </div>

      {/* Hospital Access Codes */}
      <Card className="p-6">
        <h4 className="font-medium text-gray-900 mb-4">Coduri Spital (Pentru Personal)</h4>
        <div className="space-y-3">
          {accessCodes.hospital_codes.map((hospital) => (
            <div key={hospital.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{hospital.name}</p>
                <p className="text-sm text-gray-600">Cod pentru tot personalul medical</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-lg font-bold text-blue-600">{hospital.access_code}</p>
                <p className="text-xs text-gray-500">Cod spital</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Manager Access Codes */}
      <Card className="p-6">
        <h4 className="font-medium text-gray-900 mb-4">Coduri Manager</h4>
        <div className="space-y-3">
          {accessCodes.manager_codes.map((manager) => (
            <div key={manager.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{manager.name}</p>
                <p className="text-sm text-gray-600">{manager.role} • {manager.hospital_name}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-lg font-bold text-green-600">{manager.access_code}</p>
                <p className="text-xs text-gray-500">Cod personal</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 bg-blue-50 border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">Instrucțiuni Coduri</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Coduri spital</strong> - folosite de tot personalul medical pentru logare</li>
          <li>• <strong>Coduri manager</strong> - folosite individual de manageri și administratori</li>
          <li>• <strong>Codurile sunt unice</strong> și nu trebuie partajate în afara spitalului</li>
          <li>• <strong>Contactează administratorul</strong> pentru modificarea codurilor</li>
        </ul>
      </Card>
    </div>
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Management {isAdmin ? 'Administrator' : 'Manager'}
            </h1>
            <p className="text-gray-600 mt-2">
              {user?.name} • {user?.hospitalName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => router.push('/dashboard')}
            >
              Dashboard
            </Button>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => router.push('/schedule')}
            >
              Program Gărzi
            </Button>
          </div>
        </div>

        {/* Hospital Selector - Only for Admin */}
        {isAdmin && (
          <Card className="p-4 mb-6">
            <HospitalSelector
              selectedHospitalId={selectedHospitalId}
              onHospitalChange={setSelectedHospitalId}
              userRole={user.role}
            />
          </Card>
        )}

        {/* Error/Success Messages */}
        {error && (
          <Card className="p-4 mb-6 bg-red-50 border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </Card>
        )}

        {success && (
          <Card className="p-4 mb-6 bg-green-50 border-green-200">
            <p className="text-sm text-green-600">{success}</p>
          </Card>
        )}

        {/* Tabs */}
        <Card className="p-6">
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('staff')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'staff'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Personal
              </button>
              <button
                onClick={() => setActiveTab('permissions')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'permissions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Permisiuni
              </button>
              <button
                onClick={() => setActiveTab('access-codes')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'access-codes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Coduri Acces
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'staff' && renderStaffTab()}
          {activeTab === 'permissions' && renderPermissionsTab()}
          {activeTab === 'access-codes' && renderAccessCodesTab()}
        </Card>
      </div>
    </div>
  )
}

export default withAuth(ManagementPage, {
  allowedRoles: ['admin', 'manager'],
  redirectTo: '/dashboard'
})