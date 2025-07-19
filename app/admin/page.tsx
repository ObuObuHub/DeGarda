'use client'

import { useState, useEffect } from 'react'
import withAuth, { WithAuthProps } from '@/components/withAuth'
import { logger } from '@/lib/logger'
import { HospitalManagement } from '@/components/admin/HospitalManagement'
import { StaffManagement } from '@/components/admin/StaffManagement'
import { AccessCodeSummary } from '@/components/admin/AccessCodeSummary'
import { Hospital, Staff } from '@/types'

// Extended types for admin view with additional fields from database
interface HospitalWithMetadata extends Hospital {
  created_at: string
}

interface StaffWithDetails extends Staff {
  access_code: string
  hospital_id: number
  hospital_name: string
}

interface AdminProps extends WithAuthProps {}

function AdminPage({ user, isLoading: authLoading, error: authError }: AdminProps) {
  const [activeSection, setActiveSection] = useState<'hospitals' | 'staff' | 'codes'>('hospitals')
  const [hospitals, setHospitals] = useState<HospitalWithMetadata[]>([])
  const [staff, setStaff] = useState<StaffWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Only admin can access this page
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <span className="text-6xl mb-4 block">🔒</span>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            This page is only accessible to administrators.
          </p>
          <button 
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
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
    
    try {
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
      if (response.ok && data.success) {
        setHospitals(data.data || [])
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

  // Calculate staff counts per hospital for hospital management
  const staffCounts = hospitals.reduce((acc, hospital) => {
    acc[hospital.id] = staff.filter(s => s.hospital_id === hospital.id).length
    return acc
  }, {} as Record<number, number>)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600">Loading admin panel...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">👑</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Control Panel</h1>
                <p className="text-gray-600">Manage hospitals, staff, and system settings</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-semibold text-gray-900">{user?.name}</p>
                <p className="text-sm text-gray-600">Administrator</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Navigation */}
        <div className="flex space-x-1 bg-white rounded-lg p-1 mb-8 shadow-sm">
          <button
            onClick={() => setActiveSection('hospitals')}
            className={`flex-1 px-6 py-3 text-sm font-medium rounded-md transition-colors ${
              activeSection === 'hospitals'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            🏥 Hospitals ({hospitals.length})
          </button>
          <button
            onClick={() => setActiveSection('staff')}
            className={`flex-1 px-6 py-3 text-sm font-medium rounded-md transition-colors ${
              activeSection === 'staff'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            👥 Staff ({staff.length})
          </button>
          <button
            onClick={() => setActiveSection('codes')}
            className={`flex-1 px-6 py-3 text-sm font-medium rounded-md transition-colors ${
              activeSection === 'codes'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            🔑 Access Codes
          </button>
        </div>

        {/* Global Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Content Sections */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeSection === 'hospitals' && (
            <HospitalManagement 
              hospitals={hospitals}
              onHospitalChange={loadData}
              staffCounts={staffCounts}
            />
          )}

          {activeSection === 'staff' && (
            <StaffManagement 
              staff={staff}
              hospitals={hospitals}
              onStaffChange={loadData}
            />
          )}

          {activeSection === 'codes' && (
            <AccessCodeSummary 
              hospitals={hospitals}
              staff={staff}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default withAuth(AdminPage, {
  requiredRole: 'admin'
})