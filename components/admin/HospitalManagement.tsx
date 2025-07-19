'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { logger } from '@/lib/logger'
import { Hospital } from '@/types'

// Extended type for hospital with metadata
interface HospitalWithMetadata extends Hospital {
  created_at: string
  staff_count?: number
}

interface HospitalManagementProps {
  hospitals: HospitalWithMetadata[]
  onHospitalChange: () => void
  staffCounts: Record<number, number>
}

export function HospitalManagement({ hospitals, onHospitalChange, staffCounts }: HospitalManagementProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [hospitalToDelete, setHospitalToDelete] = useState<HospitalWithMetadata | null>(null)
  const [newHospital, setNewHospital] = useState({ name: '', city: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
        setShowCreateModal(false)
        onHospitalChange()
      } else {
        setError(data.error || 'Failed to create hospital')
      }
    } catch (error) {
      logger.error('HospitalManagement', 'Failed to create hospital', error)
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
        setShowDeleteModal(false)
        setHospitalToDelete(null)
        onHospitalChange()
      } else {
        setError(data.error || 'Failed to delete hospital')
      }
    } catch (error) {
      logger.error('HospitalManagement', 'Failed to delete hospital', error)
      setError('Failed to delete hospital')
    }
  }

  const confirmDeleteHospital = (hospital: Hospital) => {
    setHospitalToDelete(hospital)
    setShowDeleteModal(true)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Hospital Management</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <span className="mr-2">➕</span>
          Add Hospital
        </Button>
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

      {/* Hospitals Grid */}
      {hospitals.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">🏥</span>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No hospitals found</h3>
          <p className="text-gray-600 mb-6">Get started by creating your first hospital</p>
          <Button onClick={() => setShowCreateModal(true)}>
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
                    {staffCounts[hospital.id] || 0}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Hospital Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
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
              onClick={() => setShowCreateModal(false)}
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
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
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
              onClick={() => setShowDeleteModal(false)}
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
    </div>
  )
}