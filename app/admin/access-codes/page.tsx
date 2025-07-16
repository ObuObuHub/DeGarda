'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { logger } from '@/lib/logger'
import { useRouter } from 'next/navigation'

interface AccessCode {
  id: string
  role: string
  staffId?: number
  staffName?: string
  isActive: boolean
  expiresAt?: string
  createdAt: string
}

interface StaffWithCode {
  id: number
  name: string
  email: string | null
  role: string
  specialization: string
  hospitalId: number
  hasAccessCode: boolean
  accessCode?: string
  codeCreated: string | null
}

export default function AccessCodesPage() {
  const router = useRouter()
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([])
  const [staffList, setStaffList] = useState<StaffWithCode[]>([])
  const [hospitals, setHospitals] = useState<any[]>([])
  const [selectedHospital, setSelectedHospital] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [newCode, setNewCode] = useState('')
  const [isMigrated, setIsMigrated] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  
  // Form state
  const [generateForm, setGenerateForm] = useState({
    role: 'staff',
    staffId: ''
  })

  useEffect(() => {
    // Check user role - only managers can access this page
    const token = localStorage.getItem('authToken')
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]))
        setUserRole(decoded.role)
        if (decoded.role !== 'manager') {
          router.push('/admin/dashboard')
          return
        }
      } catch (error) {
        console.error('Failed to decode token:', error)
        router.push('/admin/dashboard')
        return
      }
    } else {
      router.push('/admin/dashboard')
      return
    }
    
    loadHospitals()
    checkDatabaseSetup()
  }, [])

  const checkDatabaseSetup = async () => {
    try {
      // Check if we can load access codes (table exists)
      const response = await fetch('/api/admin/access-codes?hospitalId=1')
      if (response.ok) {
        setIsMigrated(true)
      } else {
        // Try to check if table exists by querying staff codes
        const staffResponse = await fetch('/api/admin/staff-access-codes?hospitalId=1')
        if (staffResponse.ok) {
          setIsMigrated(true)
        }
      }
    } catch (error) {
      logger.error('AccessCodes', 'Database check failed', error)
      setIsMigrated(false)
    }
  }

  const loadHospitals = async () => {
    try {
      const response = await fetch('/api/hospitals')
      const data = await response.json()
      setHospitals(data)
      if (data.length > 0) {
        setSelectedHospital(data[0].id)
      }
    } catch (error) {
      logger.error('AccessCodes', 'Failed to load hospitals', error)
      setError('Failed to load hospitals')
    }
  }

  const runMigrations = async () => {
    setIsLoading(true)
    setError('')
    setSuccess('')
    
    try {
      const response = await fetch('/api/admin/access-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'migrate' })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSuccess('Database migrations completed successfully!')
        setIsMigrated(true)
      } else {
        setError(data.error || 'Migration failed')
      }
    } catch (error) {
      logger.error('AccessCodes', 'Migration failed', error)
      setError('Failed to run migrations')
    } finally {
      setIsLoading(false)
    }
  }

  const loadAccessCodes = async () => {
    if (!selectedHospital) return
    
    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch(`/api/admin/access-codes?hospitalId=${selectedHospital}`)
      const data = await response.json()
      
      if (data.success) {
        setAccessCodes(data.codes)
      } else {
        setError(data.error || 'Failed to load access codes')
      }
    } catch (error) {
      logger.error('AccessCodes', 'Failed to load access codes', error)
      setError('Failed to load access codes')
    } finally {
      setIsLoading(false)
    }
  }

  const loadStaffWithCodes = async () => {
    if (!selectedHospital) return
    
    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch(`/api/admin/staff-access-codes?hospitalId=${selectedHospital}`)
      const data = await response.json()
      
      if (data.success) {
        setStaffList(data.staff)
      } else {
        setError(data.error || 'Failed to load staff')
      }
    } catch (error) {
      logger.error('AccessCodes', 'Failed to load staff with codes', error)
      setError('Failed to load staff')
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

  const generateAccessCode = async () => {
    if (!selectedHospital) {
      setError('Please select a hospital')
      return
    }
    
    setIsLoading(true)
    setError('')
    setSuccess('')
    setNewCode('')
    
    try {
      const response = await fetch('/api/admin/access-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          hospitalId: selectedHospital,
          role: generateForm.role,
          staffId: generateForm.staffId || undefined
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setNewCode(data.accessCode)
        setSuccess(`Access code generated: ${data.accessCode}`)
        loadAccessCodes() // Refresh the list
      } else {
        setError(data.error || 'Failed to generate access code')
      }
    } catch (error) {
      logger.error('AccessCodes', 'Failed to generate access code', error)
      setError('Failed to generate access code')
    } finally {
      setIsLoading(false)
    }
  }

  const revokeAccessCode = async (code: string) => {
    if (!confirm('Are you sure you want to revoke this access code?')) return
    
    setIsLoading(true)
    setError('')
    setSuccess('')
    
    try {
      const response = await fetch('/api/admin/access-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revoke',
          accessCode: code
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSuccess('Access code revoked successfully')
        loadAccessCodes() // Refresh the list
      } else {
        setError(data.error || 'Failed to revoke access code')
      }
    } catch (error) {
      logger.error('AccessCodes', 'Failed to revoke access code', error)
      setError('Failed to revoke access code')
    } finally {
      setIsLoading(false)
    }
  }

  const bulkGenerateAccessCodes = async () => {
    if (!confirm('Generate access codes for ALL staff members who don\'t have them? This will create permanent codes.')) return
    
    setIsLoading(true)
    setError('')
    setSuccess('')
    
    try {
      const response = await fetch('/api/admin/access-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk-generate' })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSuccess(`${data.message}! All staff now have access codes.`)
        loadAccessCodes() // Refresh the list
      } else {
        setError(data.error || 'Failed to bulk generate codes')
      }
    } catch (error) {
      logger.error('AccessCodes', 'Failed to bulk generate codes', error)
      setError('Failed to bulk generate access codes')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (selectedHospital && isMigrated) {
      loadAccessCodes()
      loadStaffWithCodes()
    }
  }, [selectedHospital, isMigrated])

  // Show loading while checking role
  if (userRole === null) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-label-secondary">Checking permissions...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-label-primary">
          Access Code Management
        </h1>
      </div>

      {/* Migration Section */}
      {!isMigrated && (
        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <h2 className="text-lg font-semibold text-yellow-800 mb-4">
            Database Setup Required
          </h2>
          <p className="text-yellow-700 mb-4">
            The access codes table needs to be created before you can manage access codes.
          </p>
          <Button
            onClick={runMigrations}
            disabled={isLoading}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {isLoading ? 'Running Migrations...' : 'Setup Database'}
          </Button>
        </Card>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">{success}</p>
          {newCode && (
            <div className="mt-2 p-2 bg-green-100 rounded font-mono text-center">
              <strong>{newCode}</strong>
            </div>
          )}
        </div>
      )}

      {isMigrated && (
        <>
          {/* Hospital Selection */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-label-primary mb-4">
              Select Hospital
            </h2>
            <select
              value={selectedHospital}
              onChange={(e) => setSelectedHospital(e.target.value)}
              className="w-full p-2 border border-separator rounded-lg"
            >
              <option value="">Select a hospital...</option>
              {hospitals.map((hospital) => (
                <option key={hospital.id} value={hospital.id}>
                  {hospital.name} - {hospital.city}
                </option>
              ))}
            </select>
          </Card>

          {/* Generate New Access Code */}
          {selectedHospital && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-label-primary mb-4">
                Generate New Access Code
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-label-secondary mb-2">
                    Role
                  </label>
                  <select
                    value={generateForm.role}
                    onChange={(e) => setGenerateForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full p-2 border border-separator rounded-lg"
                  >
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-label-secondary mb-2">
                    Staff ID (Optional)
                  </label>
                  <Input
                    type="number"
                    value={generateForm.staffId}
                    onChange={(e) => setGenerateForm(prev => ({ ...prev, staffId: e.target.value }))}
                    placeholder="Leave blank for generic role code"
                  />
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <p className="text-sm text-blue-700">
                  ✅ All access codes are permanent (no expiry date) - keeping it simple!
                </p>
              </div>
              
              <Button
                onClick={generateAccessCode}
                disabled={isLoading}
                fullWidth
              >
                {isLoading ? 'Generating...' : 'Generate Access Code'}
              </Button>
            </Card>
          )}

          {/* Existing Access Codes */}
          {selectedHospital && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-label-primary">
                  Existing Access Codes
                </h2>
                <Button
                  onClick={loadAccessCodes}
                  disabled={isLoading}
                  variant="secondary"
                >
                  Refresh
                </Button>
              </div>
              
              {accessCodes.length === 0 ? (
                <p className="text-label-secondary">No access codes found.</p>
              ) : (
                <div className="space-y-3">
                  {accessCodes.map((code) => (
                    <div
                      key={code.id}
                      className="flex items-center justify-between p-4 border border-separator rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-label-primary">
                          {code.role.toUpperCase()} Code
                          {code.staffName && ` - ${code.staffName}`}
                        </div>
                        <div className="text-sm text-label-secondary">
                          Created: {new Date(code.createdAt).toLocaleDateString()}
                          {code.expiresAt && (
                            <> • Expires: {new Date(code.expiresAt).toLocaleDateString()}</>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded ${
                          code.isActive 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {code.isActive ? 'Active' : 'Inactive'}
                        </span>
                        
                        {code.isActive && (
                          <Button
                            onClick={() => revokeAccessCode(code.id)}
                            variant="secondary"
                            size="sm"
                            disabled={isLoading}
                          >
                            Revoke
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Staff Login Status */}
          {selectedHospital && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-label-primary">
                  Staff Login Credentials
                </h2>
                <Button
                  onClick={loadStaffWithCodes}
                  disabled={isLoading}
                  variant="secondary"
                >
                  Refresh
                </Button>
              </div>
              
              {staffList.length === 0 ? (
                <p className="text-label-secondary">No staff found.</p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg font-medium text-sm text-label-secondary">
                    <div>Staff Member</div>
                    <div>Specialization</div>
                    <div>Login Status</div>
                    <div>Access Code</div>
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
                        {staff.hasAccessCode ? (
                          <div className="text-center">
                            <div className="text-xs text-label-secondary mb-1">Access Code</div>
                            {staff.accessCode ? (
                              <div className="flex items-center gap-2">
                                <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                  {staff.accessCode}
                                </div>
                                <Button
                                  onClick={() => copyToClipboard(staff.accessCode)}
                                  size="sm"
                                  variant="secondary"
                                  className="text-xs px-2 py-1"
                                >
                                  Copy
                                </Button>
                              </div>
                            ) : (
                              <div className="text-xs text-blue-600">🔐 Private</div>
                            )}
                          </div>
                        ) : (
                          <Button
                            onClick={() => setGenerateForm({...generateForm, staffId: staff.id.toString()})}
                            size="sm"
                            variant="secondary"
                          >
                            Generate Code
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm text-blue-700">
                      <strong>Summary:</strong> {staffList.filter(s => s.hasAccessCode).length} of {staffList.length} staff members have login access
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  )
}