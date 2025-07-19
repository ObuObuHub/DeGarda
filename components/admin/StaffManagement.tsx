'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { logger } from '@/lib/logger'
import { DEPARTMENTS, type Department } from '@/lib/constants'
import { Hospital, Staff } from '@/types'

// Extended type for staff with additional admin details
interface StaffWithDetails extends Staff {
  access_code: string
  hospital_id: number
  hospital_name: string
}

interface StaffManagementProps {
  staff: StaffWithDetails[]
  hospitals: Hospital[]
  onStaffChange: () => void
}

export function StaffManagement({ staff, hospitals, onStaffChange }: StaffManagementProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedHospitalFilter, setSelectedHospitalFilter] = useState('')
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    department: '' as Department | '',
    hospitalId: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleCreateStaff = async () => {
    if (!newStaff.name.trim() || !newStaff.hospitalId || !newStaff.department) {
      setError('Staff name, hospital, and department are required')
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
          type: 'medic',
          specialization: newStaff.department,
          hospitalId: newStaff.hospitalId
        })
      })

      const data = await response.json()
      if (data.id) {
        setSuccess(`Staff member created successfully! Access code: ${data.accessCode}`)
        setNewStaff({ name: '', email: '', department: '', hospitalId: '' })
        setShowCreateModal(false)
        onStaffChange()
      } else {
        setError(data.error || 'Failed to create staff member')
      }
    } catch (error) {
      logger.error('StaffManagement', 'Failed to create staff', error)
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
        onStaffChange()
      } else {
        setError(data.error || 'Failed to update role')
      }
    } catch (error) {
      logger.error('StaffManagement', 'Failed to update role', error)
      setError('Failed to update role')
    }
  }

  const handleDeleteStaff = async (staffId: number, staffName: string) => {
    if (!confirm(`Are you sure you want to permanently delete staff member "${staffName}"? This action cannot be undone.`)) {
      return
    }

    try {
      setError('')
      setSuccess('')
      
      const response = await fetch(`/api/staff/${staffId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await response.json()
      if (response.ok && data.success) {
        setSuccess(data.message || 'Staff member deleted successfully!')
        onStaffChange()
      } else {
        setError(data.error || 'Failed to delete staff member')
      }
    } catch (error) {
      logger.error('StaffManagement', 'Failed to delete staff', error)
      setError('Failed to delete staff member')
    }
  }

  const filteredStaff = selectedHospitalFilter 
    ? staff.filter(s => s.hospital_id.toString() === selectedHospitalFilter)
    : staff

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
        <div className="flex items-center gap-4">
          <select
            value={selectedHospitalFilter}
            onChange={(e) => setSelectedHospitalFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Hospitals</option>
            {hospitals.map(h => (
              <option key={h.id} value={h.id.toString()}>{h.name}</option>
            ))}
          </select>
          <Button onClick={() => setShowCreateModal(true)}>
            <span className="mr-2">👤</span>
            Add Staff
          </Button>
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

      {/* Staff List */}
      {filteredStaff.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">👥</span>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No staff found</h3>
          <p className="text-gray-600 mb-6">Add staff members to get started</p>
          <Button onClick={() => setShowCreateModal(true)}>
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
              <div className="flex gap-2">
                {member.role !== 'admin' && (
                  <>
                    <Button
                      onClick={() => handleRoleToggle(member.id, member.role)}
                      size="sm"
                      variant={member.role === 'manager' ? 'danger' : 'secondary'}
                    >
                      {member.role === 'manager' ? 'Remove Manager' : 'Make Manager'}
                    </Button>
                    <Button
                      onClick={() => handleDeleteStaff(member.id, member.name)}
                      size="sm"
                      variant="danger"
                      title="Delete Staff Member"
                    >
                      🗑️
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Staff Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
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
              Department *
            </label>
            <select
              value={newStaff.department}
              onChange={(e) => setNewStaff(prev => ({ ...prev, department: e.target.value as Department }))}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select a department</option>
              {DEPARTMENTS.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
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
  )
}