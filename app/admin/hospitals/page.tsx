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

interface AdminHospitalsProps extends WithAuthProps {}

function AdminHospitals({ user, isLoading: authLoading, error: authError }: AdminHospitalsProps) {
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [hospitalToDelete, setHospitalToDelete] = useState<Hospital | null>(null)
  const [newHospital, setNewHospital] = useState({
    name: '',
    city: ''
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
    loadHospitals()
  }, [])

  const loadHospitals = async () => {
    try {
      setIsLoading(true)
      setError('')
      
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
      logger.error('AdminHospitals', 'Failed to load hospitals', error)
      setError('Failed to load hospitals')
    } finally {
      setIsLoading(false)
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
        setShowCreateModal(false)
        loadHospitals()
      } else {
        setError(data.error || 'Failed to create hospital')
      }
    } catch (error) {
      logger.error('AdminHospitals', 'Failed to create hospital', error)
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
        loadHospitals()
      } else {
        setError(data.error || 'Failed to delete hospital')
      }
    } catch (error) {
      logger.error('AdminHospitals', 'Failed to delete hospital', error)
      setError('Failed to delete hospital')
    }
  }

  const confirmDelete = (hospital: Hospital) => {
    setHospitalToDelete(hospital)
    setShowDeleteModal(true)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Hospital Management</h1>
            <p className="text-gray-600 mt-2">Manage hospitals in the DeGarda system</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <span className="text-lg">🏥</span>
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

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading hospitals...</div>
          </div>
        ) : (
          <>
            {/* Hospital Cards Grid */}
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => confirmDelete(hospital)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Hospital"
                      >
                        <span className="text-lg">🗑️</span>
                      </button>
                    </div>
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
                    {hospital.staff_count !== undefined && (
                      <div className="flex items-center justify-between">
                        <span>Staff Members:</span>
                        <span className="font-semibold">{hospital.staff_count}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(`/management?hospital=${hospital.id}`, '_blank')}
                    >
                      <span className="mr-2">👥</span>
                      Manage Staff
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Empty State */}
            {hospitals.length === 0 && (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">🏥</span>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No hospitals found</h3>
                <p className="text-gray-600 mb-6">Get started by creating your first hospital</p>
                <Button onClick={() => setShowCreateModal(true)}>
                  Add Hospital
                </Button>
              </div>
            )}
          </>
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
                className="w-full"
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
                className="w-full"
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

        {/* Delete Confirmation Modal */}
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
    </div>
  )
}

export default withAuth(AdminHospitals, {
  requiredRole: 'admin'
})