'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useHospital } from '@/contexts/HospitalContext'

interface StaffMember {
  id: string
  name: string
  email: string
  specialization: string
  hospitalId: string
}

export default function StaffLoginPage() {
  const router = useRouter()
  const { selectedHospitalId, selectedHospital } = useHospital()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!selectedHospitalId) {
      router.push('/')
      return
    }
    fetchStaff()
  }, [selectedHospitalId])

  const fetchStaff = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/staff')
      if (response.ok) {
        const data = await response.json()
        // Filter staff by selected hospital
        const hospitalStaff = data.filter((s: StaffMember) => 
          s.hospitalId === selectedHospitalId
        )
        setStaff(hospitalStaff)
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = () => {
    if (selectedStaffId) {
      // Store staff info in session storage
      const selectedStaff = staff.find(s => s.id === selectedStaffId)
      if (selectedStaff) {
        sessionStorage.setItem('currentStaffId', selectedStaff.id)
        sessionStorage.setItem('currentStaffName', selectedStaff.name)
        sessionStorage.setItem('currentStaffDepartment', selectedStaff.specialization)
        router.push('/staff/schedule')
      }
    }
  }

  return (
    <div className="min-h-screen bg-background-secondary flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-label-primary">Portal Personal</h1>
          <p className="text-sm text-label-secondary mt-2">
            {selectedHospital?.name}
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-label-secondary">Se încarcă...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-label-secondary mb-2">
                Selectează numele tău
              </label>
              <select
                className="w-full px-4 py-3 bg-background-secondary border border-transparent rounded-ios text-base"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
              >
                <option value="">-- Alege --</option>
                {staff.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.specialization})
                  </option>
                ))}
              </select>
            </div>

            <Button
              fullWidth
              onClick={handleLogin}
              disabled={!selectedStaffId}
            >
              Intră în Portal
            </Button>

            <div className="text-center pt-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/admin/dashboard')}
              >
                Portal Administratori
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}