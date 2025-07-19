'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { logger } from '@/lib/logger'
import { validateClientRole, getClientUserRole } from '@/lib/clientAuth'
import { hasPermission } from '@/lib/roleBasedAccess'
import withAuth, { AuthUser, WithAuthProps } from '@/components/withAuth'

interface StaffMember {
  id: string
  name: string
  email: string
  type: string
  specialization: string
  hospitalId: string
  role: string
}

interface StaffWithCode {
  id: number
  name: string
  email: string | null
  specialization: string
  hospitalId: number
  hasAccessCode: boolean
  accessCode?: string
  codeCreated: string | null
}

interface ManagementProps extends WithAuthProps {
  // Additional props if needed
}

function ManagementPage({ user, isLoading: authLoading, error: authError }: ManagementProps) {
  const router = useRouter()
  const selectedHospitalId = user?.hospitalId?.toString() || ''
  const selectedHospital = user?.hospitalName || ''
  
  const [activeTab, setActiveTab] = useState<'staff' | 'codes' | 'settings'>('staff')
  
  // Staff management state
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [staffWithCodes, setStaffWithCodes] = useState<StaffWithCode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Modal state
  const [showAddStaffModal, setShowAddStaffModal] = useState(false)
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    type: 'medic',
    specialization: ''
  })

  useEffect(() => {
    if (user) {
      // Only staff and managers can access management
      if (!['staff', 'manager'].includes(user.role)) {
        router.push('/admin/dashboard')
        return
      }
      
      if (selectedHospitalId) {
        loadStaffList()
        if (user.role === 'manager') {
          loadStaffWithCodes()
        }
      }
    }
  }, [user, selectedHospitalId, router])

  const loadStaffList = async () => {
    if (!selectedHospitalId) return
    
    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch(`/api/staff?hospitalId=${selectedHospitalId}`, {
        credentials: 'include'
      })
      const data = await response.json()
      
      if (response.ok) {
        setStaffList(Array.isArray(data) ? data : data.data || [])
      } else {
        setError(data.error || 'Failed to load staff')
      }
    } catch (error) {
      logger.error('Management', 'Failed to load staff', error)
      setError('Failed to load staff')
    } finally {
      setIsLoading(false)
    }
  }

  const loadStaffWithCodes = async () => {
    if (!selectedHospitalId) return
    
    try {
      const response = await fetch(`/api/admin/staff-access-codes?hospitalId=${selectedHospitalId}`, {
        credentials: 'include'
      })
      const data = await response.json()
      
      if (response.ok) {
        setStaffWithCodes(data.staff || [])
      } else {
        setError(data.error || 'Failed to load access codes')
      }
    } catch (error) {
      logger.error('Management', 'Failed to load access codes', error)
      setError('Failed to load access codes')
    }
  }

  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.type || !selectedHospitalId) {
      setError('Please fill in all required fields')
      return
    }
    
    setIsLoading(true)
    setError('')
    setSuccess('')
    
    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...newStaff,
          hospitalId: selectedHospitalId
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setSuccess('Staff member added successfully')
        setNewStaff({ name: '', email: '', type: 'medic', specialization: '' })
        setShowAddStaffModal(false)
        loadStaffList()
        if (user?.role === 'manager') {
          loadStaffWithCodes()
        }
      } else {
        setError(data.error || 'Failed to add staff member')
      }
    } catch (error) {
      logger.error('Management', 'Failed to add staff', error)
      setError('Failed to add staff member')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setSuccess(`Copied "${text}" to clipboard!`)
      setTimeout(() => setSuccess(''), 2000)
    } catch (error) {
      setError('Failed to copy to clipboard')
    }
  }

  const generateBulkAccessCodes = async () => {
    if (!confirm('Generate access codes for ALL staff members who don\'t have them?')) return
    
    setIsLoading(true)
    setError('')
    setSuccess('')
    
    try {
      const response = await fetch('/api/admin/access-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'bulk-generate' })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setSuccess(data.message || 'Access codes generated successfully')
        loadStaffWithCodes()
      } else {
        setError(data.error || 'Failed to generate access codes')
      }
    } catch (error) {
      logger.error('Management', 'Failed to generate access codes', error)
      setError('Failed to generate access codes')
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading while checking role
  if (!user) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-label-secondary">Loading management interface...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-label-primary">
          Management
        </h1>
        <div className="text-sm text-label-secondary">
          {selectedHospital?.name || 'No hospital selected'}
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-separator">
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'staff'
              ? 'text-system-blue border-b-2 border-system-blue'
              : 'text-label-secondary hover:text-label-primary'
          }`}
        >
          Staff Management
        </button>
        {user?.role === 'manager' && (
          <button
            onClick={() => setActiveTab('codes')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'codes'
                ? 'text-system-blue border-b-2 border-system-blue'
                : 'text-label-secondary hover:text-label-primary'
            }`}
          >
            Access Codes
          </button>
        )}
      </div>

      {/* Staff Management Tab */}
      {activeTab === 'staff' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-label-primary">
              Staff Members
            </h2>
            <div className="flex gap-2">
              <Button
                onClick={() => loadStaffList()}
                disabled={isLoading}
                variant="secondary"
                size="sm"
              >
                Refresh
              </Button>
              {hasPermission(user?.role as any, 'staff', 'create') && (
                <Button
                  onClick={() => setShowAddStaffModal(true)}
                  disabled={isLoading}
                  size="sm"
                >
                  Add Staff
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-label-tertiary">
              Loading staff members...
            </div>
          ) : staffList.length === 0 ? (
            <div className="text-center py-8 text-label-tertiary">
              No staff members found
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg font-medium text-sm text-label-secondary">
                <div>Name</div>
                <div>Specialization</div>
                <div>Type</div>
                <div>Role</div>
              </div>
              
              {staffList.map((staff) => (
                <div
                  key={staff.id}
                  className="grid grid-cols-4 gap-4 p-4 border border-separator rounded-lg items-center"
                >
                  <div>
                    <div className="font-medium text-label-primary">{staff.name}</div>
                    {staff.email && (
                      <div className="text-xs text-label-secondary">{staff.email}</div>
                    )}
                  </div>
                  <div className="text-sm text-label-secondary">
                    {staff.specialization}
                  </div>
                  <div className="text-sm text-label-secondary">
                    {staff.type}
                  </div>
                  <div className="text-sm text-label-secondary">
                    {staff.role}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Access Codes Tab (Manager Only) */}
      {activeTab === 'codes' && user?.role === 'manager' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-label-primary">
              Staff Access Codes
            </h2>
            <div className="flex gap-2">
              <Button
                onClick={() => loadStaffWithCodes()}
                disabled={isLoading}
                variant="secondary"
                size="sm"
              >
                Refresh
              </Button>
              <Button
                onClick={generateBulkAccessCodes}
                disabled={isLoading}
                size="sm"
              >
                Generate Missing Codes
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-label-tertiary">
              Loading access codes...
            </div>
          ) : staffWithCodes.length === 0 ? (
            <div className="text-center py-8 text-label-tertiary">
              No staff members found
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg font-medium text-sm text-label-secondary">
                <div>Staff Member</div>
                <div>Specialization</div>
                <div>Login Status</div>
                <div>Access Code</div>
              </div>
              
              {staffWithCodes.map((staff) => (
                <div
                  key={staff.id}
                  className="grid grid-cols-4 gap-4 p-4 border border-separator rounded-lg items-center"
                >
                  <div>
                    <div className="font-medium text-label-primary">{staff.name}</div>
                    {staff.email && (
                      <div className="text-xs text-label-secondary">{staff.email}</div>
                    )}
                  </div>
                  
                  <div className="text-sm text-label-secondary">
                    {staff.specialization}
                  </div>
                  
                  <div>
                    <span className={`px-2 py-1 text-xs rounded ${
                      staff.hasAccessCode 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {staff.hasAccessCode ? '✅ Can Login' : '❌ No Access'}
                    </span>
                    {staff.codeCreated && (
                      <div className="text-xs text-label-tertiary mt-1">
                        Created: {staff.codeCreated}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    {staff.hasAccessCode && staff.accessCode ? (
                      <div className="flex items-center gap-2">
                        <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {staff.accessCode}
                        </div>
                        <Button
                          onClick={() => copyToClipboard(staff.accessCode!)}
                          size="sm"
                          variant="secondary"
                          className="text-xs px-2 py-1"
                        >
                          Copy
                        </Button>
                      </div>
                    ) : (
                      <div className="text-xs text-label-secondary">
                        No code generated
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-700">
                  <strong>Summary:</strong> {staffWithCodes.filter(s => s.hasAccessCode).length} of {staffWithCodes.length} staff members have login access
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Add Staff Modal */}
      <Modal
        isOpen={showAddStaffModal}
        onClose={() => setShowAddStaffModal(false)}
        title="Add New Staff Member"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-label-secondary mb-2">
              Name *
            </label>
            <Input
              value={newStaff.name}
              onChange={(e) => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter staff member's name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-label-secondary mb-2">
              Email (Optional)
            </label>
            <Input
              type="email"
              value={newStaff.email}
              onChange={(e) => setNewStaff(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Enter email address"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-label-secondary mb-2">
              Type *
            </label>
            <select
              value={newStaff.type}
              onChange={(e) => setNewStaff(prev => ({ ...prev, type: e.target.value }))}
              className="w-full p-2 border border-separator rounded-lg"
            >
              <option value="medic">Medic</option>
              <option value="asistent">Asistent</option>
              <option value="biolog">Biolog</option>
              <option value="chimist">Chimist</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-label-secondary mb-2">
              Specialization
            </label>
            <Input
              value={newStaff.specialization}
              onChange={(e) => setNewStaff(prev => ({ ...prev, specialization: e.target.value }))}
              placeholder="Enter specialization/department"
            />
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button
              onClick={() => setShowAddStaffModal(false)}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddStaff}
              disabled={isLoading}
            >
              {isLoading ? 'Adding...' : 'Add Staff'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default withAuth(ManagementPage)