'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import withAuth, { AuthUser, WithAuthProps } from '@/components/withAuth'
import { logger } from '@/lib/logger'

interface Hospital {
  id: number
  name: string
  city: string
}

interface StaffMember {
  id: number
  name: string
  email: string
  access_code: string
  role: string
  specialization: string
  hospital_id: number
  hospital_name: string
}

interface AdminControlPanelProps extends WithAuthProps {
  // Additional props if needed
}

function AdminControlPanel({ user, isLoading: authLoading, error: authError }: AdminControlPanelProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'hospitals' | 'staff'>('hospitals')
  
  // Hospital management state
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [newHospital, setNewHospital] = useState({ name: '', city: '' })
  const [isCreatingHospital, setIsCreatingHospital] = useState(false)
  
  // Staff management state
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    specialization: '',
    hospitalId: '',
    accessCode: '',
    hasManagerPrivileges: false
  })
  const [isCreatingStaff, setIsCreatingStaff] = useState(false)
  const [isGeneratingCode, setIsGeneratingCode] = useState(false)
  
  // Common state
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Only admin can access this page
  if (user?.role !== 'admin') {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6 text-center">
            <span className="text-4xl mb-4 block">🔒</span>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-6">
              This page is only accessible to administrators.
            </p>
            <Button onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      await Promise.all([loadHospitals(), loadStaff()])
    } catch (error) {
      logger.error('AdminControlPanel', 'Failed to load data', error)
      setError('Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const loadHospitals = async () => {
    try {
      const response = await fetch('/api/hospitals', {
        credentials: 'include'
      })
      const data = await response.json()
      
      if (response.ok) {
        setHospitals(data)
      } else {
        setError('Failed to load hospitals')
      }
    } catch (error) {
      logger.error('AdminControlPanel', 'Failed to load hospitals', error)
    }
  }

  const loadStaff = async () => {
    try {
      const response = await fetch('/api/admin/view-access-codes', {
        credentials: 'include'
      })
      const data = await response.json()

      if (data.success) {
        setStaff(data.staff)
      } else {
        setError('Failed to load staff')
      }
    } catch (error) {
      logger.error('AdminControlPanel', 'Failed to load staff', error)
    }
  }

  const handleCreateHospital = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newHospital.name || !newHospital.city) return

    try {
      setIsCreatingHospital(true)
      const response = await fetch('/api/hospitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newHospital)
      })

      const data = await response.json()
      
      if (response.ok) {
        setNewHospital({ name: '', city: '' })
        loadHospitals()
      } else {
        setError(data.error || 'Failed to create hospital')
      }
    } catch (error) {
      logger.error('AdminControlPanel', 'Failed to create hospital', error)
      setError('Failed to create hospital')
    } finally {
      setIsCreatingHospital(false)
    }
  }

  const handleDeleteHospital = async (hospitalId: number) => {
    if (!confirm('Are you sure you want to delete this hospital?')) return

    try {
      const response = await fetch(`/api/hospitals/${hospitalId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        loadHospitals()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to delete hospital')
      }
    } catch (error) {
      logger.error('AdminControlPanel', 'Failed to delete hospital', error)
      setError('Failed to delete hospital')
    }
  }

  const generateAccessCode = async () => {
    if (!newStaff.name) {
      setError('Please enter staff name first')
      return
    }

    try {
      setIsGeneratingCode(true)
      const response = await fetch('/api/admin/generate-access-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          staffName: newStaff.name,
          existingCodes: staff.map(s => s.access_code)
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setNewStaff({ ...newStaff, accessCode: data.accessCode })
      } else {
        setError(data.error || 'Failed to generate access code')
      }
    } catch (error) {
      logger.error('AdminControlPanel', 'Failed to generate access code', error)
      setError('Failed to generate access code')
    } finally {
      setIsGeneratingCode(false)
    }
  }

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStaff.name || !newStaff.hospitalId || !newStaff.accessCode || !newStaff.specialization) return

    try {
      setIsCreatingStaff(true)
      const response = await fetch('/api/admin/create-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newStaff.name,
          email: newStaff.email || null,
          specialization: newStaff.specialization,
          hospitalId: parseInt(newStaff.hospitalId),
          accessCode: newStaff.accessCode,
          hasManagerPrivileges: newStaff.hasManagerPrivileges
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setNewStaff({
          name: '',
          email: '',
          specialization: '',
          hospitalId: '',
          accessCode: '',
          hasManagerPrivileges: false
        })
        loadStaff()
      } else {
        setError(data.error || 'Failed to create staff member')
      }
    } catch (error) {
      logger.error('AdminControlPanel', 'Failed to create staff', error)
      setError('Failed to create staff member')
    } finally {
      setIsCreatingStaff(false)
    }
  }

  const toggleManagerPrivileges = async (staffId: number, currentRole: string) => {
    try {
      const action = currentRole === 'manager' ? 'remove' : 'assign'
      const response = await fetch('/api/admin/assign-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ staffId, action })
      })

      const data = await response.json()
      
      if (data.success) {
        loadStaff()
      } else {
        setError(data.error || 'Failed to update privileges')
      }
    } catch (error) {
      logger.error('AdminControlPanel', 'Failed to update privileges', error)
      setError('Failed to update privileges')
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      // Continue with logout even if API call fails
    }
    
    localStorage.clear()
    sessionStorage.clear()
    router.push('/')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Admin Control Panel
            </h1>
            <p className="text-gray-600 mt-2">
              Complete control over hospitals and staff
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
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="p-4 mb-6 bg-red-50 border-red-200">
            <p className="text-sm text-red-600">{error}</p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setError('')}
              className="mt-2"
            >
              Dismiss
            </Button>
          </Card>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg mb-6">
          <button
            onClick={() => setActiveTab('hospitals')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'hospitals'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🏥 Hospitals ({hospitals.length})
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'staff'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            👥 Staff ({staff.length})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'hospitals' && (
          <div className="space-y-6">
            {/* Create Hospital */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Add New Hospital
              </h2>
              <form onSubmit={handleCreateHospital} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  type="text"
                  label="Hospital Name"
                  value={newHospital.name}
                  onChange={(e) => setNewHospital({...newHospital, name: e.target.value})}
                  placeholder="Spitalul Județean de Urgență"
                  required
                />
                <Input
                  type="text"
                  label="City"
                  value={newHospital.city}
                  onChange={(e) => setNewHospital({...newHospital, city: e.target.value})}
                  placeholder="Piatra-Neamț"
                  required
                />
                <div className="flex items-end">
                  <Button
                    type="submit"
                    disabled={isCreatingHospital || !newHospital.name || !newHospital.city}
                    className="w-full"
                  >
                    {isCreatingHospital ? 'Creating...' : 'Add Hospital'}
                  </Button>
                </div>
              </form>
            </Card>

            {/* Hospitals List */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                All Hospitals
              </h2>
              
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading hospitals...
                </div>
              ) : hospitals.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hospitals found. Add your first hospital above.
                </div>
              ) : (
                <div className="space-y-4">
                  {hospitals.map((hospital) => (
                    <div
                      key={hospital.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-lg">🏥</span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {hospital.name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {hospital.city}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDeleteHospital(hospital.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="space-y-6">
            {/* Create Staff */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Add New Staff Member
              </h2>
              <form onSubmit={handleCreateStaff} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    type="text"
                    label="Full Name"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                    placeholder="Dr. John Doe"
                    required
                  />
                  <Input
                    type="email"
                    label="Email (Optional)"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                    placeholder="john.doe@hospital.com"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    type="text"
                    label="Department/Specialization"
                    value={newStaff.specialization}
                    onChange={(e) => setNewStaff({...newStaff, specialization: e.target.value})}
                    placeholder="ATI, Urgențe, Laborator, etc."
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hospital
                    </label>
                    <select
                      value={newStaff.hospitalId}
                      onChange={(e) => setNewStaff({...newStaff, hospitalId: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Hospital</option>
                      {hospitals.map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      3-Character Access Code
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={newStaff.accessCode}
                        onChange={(e) => setNewStaff({...newStaff, accessCode: e.target.value.toUpperCase()})}
                        placeholder="ABC"
                        maxLength={3}
                        required
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={generateAccessCode}
                        disabled={isGeneratingCode || !newStaff.name}
                      >
                        {isGeneratingCode ? 'Generating...' : 'Generate'}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center mt-6">
                    <input
                      type="checkbox"
                      id="managerPrivileges"
                      checked={newStaff.hasManagerPrivileges}
                      onChange={(e) => setNewStaff({...newStaff, hasManagerPrivileges: e.target.checked})}
                      className="mr-2"
                    />
                    <label htmlFor="managerPrivileges" className="text-sm text-gray-700">
                      Grant manager privileges (can generate shifts, approve swaps)
                    </label>
                  </div>
                </div>
                
                <Button
                  type="submit"
                  disabled={isCreatingStaff || !newStaff.name || !newStaff.hospitalId || !newStaff.accessCode || !newStaff.specialization}
                  className="w-full md:w-auto"
                >
                  {isCreatingStaff ? 'Creating...' : 'Add Staff Member'}
                </Button>
              </form>
            </Card>

            {/* Staff List */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                All Staff Members
              </h2>
              
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading staff...
                </div>
              ) : staff.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No staff members found. Add your first staff member above.
                </div>
              ) : (
                <div className="space-y-4">
                  {staff.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            member.role === 'admin' ? 'bg-red-100' : 
                            member.role === 'manager' ? 'bg-green-100' : 'bg-blue-100'
                          }`}>
                            <span className="text-lg">
                              {member.role === 'admin' ? '👑' : 
                               member.role === 'manager' ? '👨‍💼' : '👨‍⚕️'}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {member.name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {member.specialization} • {member.hospital_name}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Access Code: <span className="font-mono bg-gray-200 px-2 py-1 rounded">
                                {member.access_code}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          member.role === 'admin' ? 'bg-red-100 text-red-800' :
                          member.role === 'manager' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {member.role === 'admin' ? 'Admin' : 
                           member.role === 'manager' ? 'Manager' : 'Staff'}
                        </span>
                        
                        {member.role !== 'admin' && (
                          <Button
                            size="sm"
                            variant={member.role === 'manager' ? 'danger' : 'primary'}
                            onClick={() => toggleManagerPrivileges(member.id, member.role)}
                          >
                            {member.role === 'manager' ? 'Remove Manager' : 'Make Manager'}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default withAuth(AdminControlPanel, {
  allowedRoles: ['admin'],
  redirectTo: '/dashboard'
})