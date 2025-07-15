'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { logger } from '@/lib/logger'

interface AccessCode {
  id: string
  role: string
  staffId?: number
  staffName?: string
  isActive: boolean
  expiresAt?: string
  createdAt: string
}

export default function AccessCodesPage() {
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([])
  const [hospitals, setHospitals] = useState<any[]>([])
  const [selectedHospital, setSelectedHospital] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [newCode, setNewCode] = useState('')
  const [isMigrated, setIsMigrated] = useState(false)
  
  // Form state
  const [generateForm, setGenerateForm] = useState({
    role: 'staff',
    staffId: '',
    expiresInDays: 30
  })

  useEffect(() => {
    loadHospitals()
  }, [])

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
          staffId: generateForm.staffId || undefined,
          expiresInDays: generateForm.expiresInDays
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

  useEffect(() => {
    if (selectedHospital && isMigrated) {
      loadAccessCodes()
    }
  }, [selectedHospital, isMigrated])

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
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                
                <div>
                  <label className="block text-sm font-medium text-label-secondary mb-2">
                    Expires in Days
                  </label>
                  <Input
                    type="number"
                    value={generateForm.expiresInDays}
                    onChange={(e) => setGenerateForm(prev => ({ ...prev, expiresInDays: parseInt(e.target.value) || 30 }))}
                  />
                </div>
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
        </>
      )}
    </div>
  )
}