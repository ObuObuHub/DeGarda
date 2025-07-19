'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import withAuth, { AuthUser, WithAuthProps } from '@/components/withAuth'
import { logger } from '@/lib/logger'

interface Hospital {
  id: number
  name: string
  city: string
  created_at: string
  staff_count?: number
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

interface AdminProps extends WithAuthProps {}

function AdminPage({ user, isLoading: authLoading, error: authError }: AdminProps) {
  // State
  const [activeTab, setActiveTab] = useState<'hospitals' | 'staff' | 'codes'>('hospitals')
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Hospital management state
  const [showCreateHospitalModal, setShowCreateHospitalModal] = useState(false)
  const [showDeleteHospitalModal, setShowDeleteHospitalModal] = useState(false)
  const [hospitalToDelete, setHospitalToDelete] = useState<Hospital | null>(null)
  const [newHospital, setNewHospital] = useState({ name: '', city: '' })

  // Staff management state
  const [showCreateStaffModal, setShowCreateStaffModal] = useState(false)
  const [selectedHospitalForStaff, setSelectedHospitalForStaff] = useState('')
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    specialization: '',
    hospitalId: ''
  })

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
            <Button onClick={() => window.history.back()}>
              Go Back
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
    setIsLoading(true)
    setError('')
    setSuccess('')
    
    try {
      // Load hospitals and staff in parallel
      await Promise.all([loadHospitals(), loadStaff()])
    } catch (error) {
      logger.error('AdminPage', 'Failed to load data', error)
      setError('Failed to load admin data')
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
        setHospitals(data.hospitals || [])
      } else {
        setError(data.error || 'Failed to load hospitals')
      }
    } catch (error) {
      logger.error('AdminPage', 'Failed to load hospitals', error)
      setError('Failed to load hospitals')
    }
  }

  const loadStaff = async () => {
    try {
      const response = await fetch('/api/admin/all-staff', {
        credentials: 'include'
      })
      const data = await response.json()
      if (data.success) {
        setStaff(data.staff || [])
      } else {
        setError(data.error || 'Failed to load staff')
      }
    } catch (error) {
      logger.error('AdminPage', 'Failed to load staff', error)
      setError('Failed to load staff')
    }
  }

  const handleCreateHospital = async () => {
    if (!newHospital.name.trim() || !newHospital.city.trim()) {
      setError('Hospital name and city are required')
      return
    }

    try {
      setError('')
      setSuccess('')
      
      const response = await fetch('/api/hospitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newHospital)
      })

      const data = await response.json()
      if (response.ok) {
        setSuccess('Hospital created successfully!')
        setNewHospital({ name: '', city: '' })
        setShowCreateHospitalModal(false)
        loadHospitals()
      } else {
        setError(data.error || 'Failed to create hospital')
      }
    } catch (error) {
      logger.error('AdminPage', 'Failed to create hospital', error)
      setError('Failed to create hospital')
    }
  }

  const handleDeleteHospital = async () => {
    if (!hospitalToDelete) return

    try {
      setError('')
      setSuccess('')
      
      const response = await fetch(`/api/hospitals/${hospitalToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await response.json()
      if (response.ok) {
        setSuccess('Hospital deleted successfully!')
        setShowDeleteHospitalModal(false)
        setHospitalToDelete(null)
        loadHospitals()
        loadStaff() // Refresh staff as well
      } else {
        setError(data.error || 'Failed to delete hospital')
      }
    } catch (error) {
      logger.error('AdminPage', 'Failed to delete hospital', error)
      setError('Failed to delete hospital')
    }
  }

  const handleCreateStaff = async () => {
    if (!newStaff.name.trim() || !newStaff.hospitalId) {
      setError('Staff name and hospital are required')
      return
    }

    try {
      setError('')
      setSuccess('')
      
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
        setSuccess('Staff member created successfully!')
        setNewStaff({ name: '', email: '', specialization: '', hospitalId: '' })
        setShowCreateStaffModal(false)
        loadStaff()
      } else {
        setError(data.error || 'Failed to create staff member')
      }
    } catch (error) {
      logger.error('AdminPage', 'Failed to create staff', error)
      setError('Failed to create staff member')
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
        setSuccess(`Role ${action === 'assign' ? 'assigned' : 'removed'} successfully!`)
        loadStaff()
      } else {
        setError(data.error || 'Failed to update role')
      }
    } catch (error) {
      logger.error('AdminPage', 'Failed to update role', error)
      setError('Failed to update role')
    }
  }

  const confirmDeleteHospital = (hospital: Hospital) => {
    setHospitalToDelete(hospital)
    setShowDeleteHospitalModal(true)
  }

  const filteredStaff = selectedHospitalForStaff 
    ? staff.filter(s => s.hospital_id.toString() === selectedHospitalForStaff)
    : staff

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Control Panel</h1>
            <p className="text-gray-600 mt-2">Manage hospitals, staff, and system settings</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">👑</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-600">Administrator</p>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-8">
          <button
            onClick={() => setActiveTab('hospitals')}
            className={`px-6 py-3 font-medium text-sm border-b-2 ${
              activeTab === 'hospitals'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            🏥 Hospitals ({hospitals.length})
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-6 py-3 font-medium text-sm border-b-2 ${
              activeTab === 'staff'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            👥 Staff ({staff.length})
          </button>
          <button
            onClick={() => setActiveTab('codes')}
            className={`px-6 py-3 font-medium text-sm border-b-2 ${
              activeTab === 'codes'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            🔑 Access Codes
          </button>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : (
          <>
            {/* Hospitals Tab */}
            {activeTab === 'hospitals' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Hospital Management</h2>
                  <Button onClick={() => setShowCreateHospitalModal(true)}>
                    <span className="mr-2">➕</span>
                    Add Hospital
                  </Button>
                </div>

                {hospitals.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-6xl mb-4 block">🏥</span>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No hospitals found</h3>
                    <p className="text-gray-600 mb-6">Get started by creating your first hospital</p>
                    <Button onClick={() => setShowCreateHospitalModal(true)}>
                      Add Hospital
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {hospitals.map((hospital) => (
                      <Card key={hospital.id} className="p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                              <span className="text-2xl">🏥</span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{hospital.name}</h3>
                              <p className="text-sm text-gray-600">{hospital.city}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => confirmDeleteHospital(hospital)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Hospital"
                          >
                            🗑️
                          </button>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center justify-between">
                            <span>Hospital ID:</span>
                            <span className="font-mono">{hospital.id}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Created:</span>
                            <span>{new Date(hospital.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Staff Count:</span>
                            <span className="font-semibold">
                              {staff.filter(s => s.hospital_id === hospital.id).length}
                            </span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Staff Tab */}
            {activeTab === 'staff' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Staff Management</h2>
                  <div className="flex items-center gap-4">
                    <select
                      value={selectedHospitalForStaff}
                      onChange={(e) => setSelectedHospitalForStaff(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">All Hospitals</option>
                      {hospitals.map(h => (
                        <option key={h.id} value={h.id.toString()}>{h.name}</option>
                      ))}
                    </select>
                    <Button onClick={() => setShowCreateStaffModal(true)}>
                      <span className="mr-2">👤</span>
                      Add Staff
                    </Button>
                  </div>
                </div>

                {filteredStaff.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-6xl mb-4 block">👥</span>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No staff found</h3>
                    <p className="text-gray-600 mb-6">Add staff members to get started</p>
                    <Button onClick={() => setShowCreateStaffModal(true)}>
                      Add Staff
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-6 gap-4 p-3 bg-gray-50 rounded-lg font-medium text-sm text-gray-600">
                      <div>Name</div>
                      <div>Hospital</div>
                      <div>Specialization</div>
                      <div>Role</div>
                      <div>Access Code</div>
                      <div>Actions</div>
                    </div>
                    
                    {filteredStaff.map((member) => (
                      <div
                        key={member.id}
                        className="grid grid-cols-6 gap-4 p-4 border border-gray-200 rounded-lg items-center hover:bg-gray-50"
                      >
                        <div>
                          <div className="font-medium text-gray-900">{member.name}</div>
                          {member.email && (
                            <div className="text-xs text-gray-500">{member.email}</div>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">{member.hospital_name}</div>
                        <div className="text-sm text-gray-600">{member.specialization}</div>
                        <div>
                          <span className={`px-2 py-1 text-xs rounded ${
                            member.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                            member.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {member.role}
                          </span>
                        </div>
                        <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {member.access_code}
                        </div>
                        <div>
                          {member.role !== 'admin' && (
                            <Button
                              onClick={() => handleRoleToggle(member.id, member.role)}
                              size="sm"
                              variant={member.role === 'manager' ? 'danger' : 'secondary'}
                            >
                              {member.role === 'manager' ? 'Remove Manager' : 'Make Manager'}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Access Codes Tab */}
            {activeTab === 'codes' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Access Code Summary</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {hospitals.map((hospital) => {
                    const hospitalStaff = staff.filter(s => s.hospital_id === hospital.id)
                    return (
                      <Card key={hospital.id} className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">{hospital.name}</h3>
                        <div className="space-y-3">
                          {hospitalStaff.length === 0 ? (
                            <p className="text-sm text-gray-500">No staff members</p>
                          ) : (
                            hospitalStaff.map(member => (
                              <div key={member.id} className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-sm">{member.name}</div>
                                  <div className="text-xs text-gray-500">{member.role}</div>
                                </div>
                                <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                  {member.access_code}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Create Hospital Modal */}
        <Modal
          isOpen={showCreateHospitalModal}
          onClose={() => setShowCreateHospitalModal(false)}
          title="Create New Hospital"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hospital Name *
              </label>
              <Input
                value={newHospital.name}
                onChange={(e) => setNewHospital(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter hospital name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City *
              </label>
              <Input
                value={newHospital.city}
                onChange={(e) => setNewHospital(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Enter city name"
              />
            </div>
            
            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="secondary"
                onClick={() => setShowCreateHospitalModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateHospital}>
                Create Hospital
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Hospital Confirmation Modal */}
        <Modal
          isOpen={showDeleteHospitalModal}
          onClose={() => setShowDeleteHospitalModal(false)}
          title="Delete Hospital"
        >
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-6xl mb-4 block">⚠️</span>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Are you sure you want to delete this hospital?
              </h3>
              <p className="text-gray-600 mb-4">
                <strong>{hospitalToDelete?.name}</strong> in {hospitalToDelete?.city}
              </p>
              <p className="text-sm text-red-600">
                This action cannot be undone. All staff and data associated with this hospital will be deleted.
              </p>
            </div>
            
            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteHospitalModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteHospital}
              >
                Delete Hospital
              </Button>
            </div>
          </div>
        </Modal>

        {/* Create Staff Modal */}
        <Modal
          isOpen={showCreateStaffModal}
          onClose={() => setShowCreateStaffModal(false)}
          title="Add New Staff Member"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name *
              </label>
              <Input
                value={newStaff.name}
                onChange={(e) => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter staff member's name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hospital *
              </label>
              <select
                value={newStaff.hospitalId}
                onChange={(e) => setNewStaff(prev => ({ ...prev, hospitalId: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select a hospital</option>
                {hospitals.map(h => (
                  <option key={h.id} value={h.id.toString()}>{h.name} - {h.city}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specialization
              </label>
              <Input
                value={newStaff.specialization}
                onChange={(e) => setNewStaff(prev => ({ ...prev, specialization: e.target.value }))}
                placeholder="Enter specialization/department"
              />
            </div>
            
            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="secondary"
                onClick={() => setShowCreateStaffModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateStaff}>
                Add Staff Member
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}

export default withAuth(AdminPage, {
  requiredRole: 'admin'
})