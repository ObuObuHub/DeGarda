'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import withAuth, { AuthUser, WithAuthProps } from '@/components/withAuth'
import { logger } from '@/lib/logger'

interface StaffMember {
  id: number
  name: string
  email: string
  access_code: string
  role: string
  specialization: string
  hospital_name: string
}

interface AdminStaffManagementProps extends WithAuthProps {
  // Additional props if needed
}

function AdminStaffManagement({ user, isLoading: authLoading, error: authError }: AdminStaffManagementProps) {
  const router = useRouter()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    specialization: '',
    hospitalId: '3' // Default to Piatra-Neamț
  })
  const [isCreating, setIsCreating] = useState(false)

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
    loadStaff()
  }, [])

  const loadStaff = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/view-access-codes')
      const data = await response.json()

      if (data.success) {
        setStaff(data.staff)
      } else {
        setError('Failed to load staff')
      }
    } catch (error) {
      logger.error('AdminStaffManagement', 'Failed to load staff', error)
      setError('Failed to load staff')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRoleToggle = async (staffId: number, currentRole: string) => {
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
        loadStaff() // Refresh the list
      } else {
        setError(data.error || 'Failed to update role')
      }
    } catch (error) {
      logger.error('AdminStaffManagement', 'Failed to update role', error)
      setError('Failed to update role')
    }
  }

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStaff.name || !newStaff.specialization) return

    try {
      setIsCreating(true)
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newStaff.name,
          email: newStaff.email,
          type: 'medic', // Default type
          specialization: newStaff.specialization,
          hospitalId: newStaff.hospitalId
        })
      })

      const data = await response.json()
      
      if (data.id) {
        setNewStaff({ name: '', email: '', specialization: '', hospitalId: '3' })
        loadStaff() // Refresh the list
      } else {
        setError(data.error || 'Failed to create staff member')
      }
    } catch (error) {
      logger.error('AdminStaffManagement', 'Failed to create staff', error)
      setError('Failed to create staff member')
    } finally {
      setIsCreating(false)
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
              Staff Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage staff members, roles, and access codes
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
          </Card>
        )}

        {/* Create New Staff */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Add New Staff Member
          </h2>
          <form onSubmit={handleCreateStaff} className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              placeholder="john.doe@degarda.ro"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <select
                value={newStaff.specialization}
                onChange={(e) => setNewStaff({...newStaff, specialization: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Department</option>
                <option value="ATI">ATI</option>
                <option value="Urgențe">Urgențe</option>
                <option value="Medicină Internă">Medicină Internă</option>
                <option value="Chirurgie">Chirurgie</option>
                <option value="Laborator">Laborator</option>
              </select>
            </div>
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
                <option value="3">Piatra-Neamț</option>
                <option value="4">Buhuși</option>
              </select>
            </div>
            <div className="md:col-span-4">
              <Button
                type="submit"
                disabled={isCreating || !newStaff.name || !newStaff.specialization}
                className="w-full md:w-auto"
              >
                {isCreating ? 'Creating...' : 'Add Staff Member'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Staff List */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            All Staff Members ({staff.length})
          </h2>
          
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Loading staff...
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No staff members found.
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
                        onClick={() => handleRoleToggle(member.id, member.role)}
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
    </div>
  )
}

export default withAuth(AdminStaffManagement, {
  allowedRoles: ['admin'],
  redirectTo: '/dashboard'
})