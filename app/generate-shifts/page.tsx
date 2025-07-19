'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import withAuth, { AuthUser, WithAuthProps } from '@/components/withAuth'
import { GenerationParameters } from '@/components/shifts/GenerationParameters'
import { ReservationsPreview } from '@/components/shifts/ReservationsPreview'
import { GenerationInstructions } from '@/components/shifts/GenerationInstructions'
import { AccessDenied } from '@/components/shifts/AccessDenied'
import { logger } from '@/lib/logger'
import { apiClient } from '@/lib/apiClient'

interface Reservation {
  id: number
  staff_id: number
  staff_name: string
  shift_date: string
  department: string
  status: string
  created_at: string
}

interface GenerateShiftsPageProps extends WithAuthProps {
  // Additional props if needed
}

function GenerateShiftsPage({ user, isLoading: authLoading, error: authError }: GenerateShiftsPageProps) {
  const router = useRouter()
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(user?.hospitalId?.toString() || '')
  const [selectedDepartment, setSelectedDepartment] = useState('LABORATOR')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isLoadingReservations, setIsLoadingReservations] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [canGenerate, setCanGenerate] = useState(false)

  const isAdmin = user?.role === 'admin'
  const isManager = user?.role === 'manager'
  const isStaff = user?.role === 'staff'

  useEffect(() => {
    if (user) {
      // All users see only their assigned hospital
      setSelectedHospitalId(user.hospitalId?.toString() || '')
      
      if (isAdmin || isManager) {
        setCanGenerate(true)
      } else if (isStaff) {
        checkStaffPermissions()
      }
      
      // Set default to next month
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      setSelectedMonth((nextMonth.getMonth() + 1).toString().padStart(2, '0'))
      setSelectedYear(nextMonth.getFullYear().toString())
    }
  }, [user])

  useEffect(() => {
    if (selectedHospitalId && selectedMonth && selectedYear) {
      loadReservations()
    }
  }, [selectedHospitalId, selectedMonth, selectedYear, selectedDepartment])

  const checkStaffPermissions = async () => {
    try {
      const response = await fetch('/api/staff/shift-permissions', {
        credentials: 'include'
      })
      const data = await response.json()
      
      if (response.ok) {
        setCanGenerate(data.canGenerateShifts || false)
        if (data.department) {
          setSelectedDepartment(data.department)
        }
      }
    } catch (error) {
      logger.error('GenerateShiftsPage', 'Failed to check permissions', error)
      setCanGenerate(false)
    }
  }

  const loadReservations = async () => {
    setIsLoadingReservations(true)
    try {
      const data = await apiClient.get<{ success: boolean, reservations?: Reservation[], error?: string }>(
        `/api/reservations?hospitalId=${selectedHospitalId}&month=${selectedMonth}&year=${selectedYear}&department=${selectedDepartment}`
      )

      if (data.success) {
        setReservations(data.reservations || [])
      } else {
        setError(data.error || 'Failed to load reservations')
      }
    } catch (error: any) {
      logger.error('GenerateShiftsPage', 'Failed to load reservations', error)
      setError(error.message || 'Failed to load reservations')
    } finally {
      setIsLoadingReservations(false)
    }
  }

  const handleGenerateShifts = async () => {
    if (!canGenerate || !selectedHospitalId || !selectedMonth || !selectedYear) {
      setError('Missing required information for generation')
      return
    }

    setIsGenerating(true)
    setError('')
    setSuccess('')

    try {
      const data = await apiClient.post<{ success: boolean, generated?: number, message?: string, error?: string }>(
        '/api/shifts/generate',
        {
          hospitalId: selectedHospitalId,
          department: selectedDepartment,
          month: parseInt(selectedMonth),
          year: parseInt(selectedYear),
          considerReservations: true
        }
      )

      if (data.success) {
        setSuccess(`Program generat cu succes! ${data.generated || 0} gărzi create pentru ${selectedDepartment}.`)
        loadReservations() // Refresh to see updated statuses
      } else {
        setError(data.error || 'Failed to generate shifts')
      }
    } catch (error: any) {
      logger.error('GenerateShiftsPage', 'Failed to generate shifts', error)
      setError(error.message || 'Failed to generate shifts')
    } finally {
      setIsGenerating(false)
    }
  }

  // Check if user has access
  if (!canGenerate) {
    return (
      <AccessDenied 
        isStaff={isStaff} 
        onNavigateToDashboard={() => router.push('/dashboard')} 
      />
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Generare Gărzi
            </h1>
            <p className="text-gray-600 mt-2">
              {user?.name} • {user?.hospitalName}
              {isStaff && ` • ${selectedDepartment}`}
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
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => router.push('/schedule')}
            >
              Program Gărzi
            </Button>
          </div>
        </div>

        {/* Hospital info */}
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Spital</p>
              <p className="font-medium text-gray-900">{user?.hospitalName || 'Loading...'}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xl">🏥</span>
            </div>
          </div>
        </Card>

        {/* Error/Success Messages */}
        {error && (
          <Card className="p-4 mb-6 bg-red-50 border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </Card>
        )}

        {success && (
          <Card className="p-4 mb-6 bg-green-50 border-green-200">
            <p className="text-sm text-green-600">{success}</p>
          </Card>
        )}

        {/* Generation Parameters */}
        <GenerationParameters
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          selectedDepartment={selectedDepartment}
          onMonthChange={setSelectedMonth}
          onYearChange={setSelectedYear}
          onDepartmentChange={setSelectedDepartment}
          onGenerate={handleGenerateShifts}
          isGenerating={isGenerating}
          canGenerate={canGenerate}
          userRole={user?.role || ''}
        />

        {/* Reservations Preview */}
        <ReservationsPreview
          reservations={reservations}
          isLoading={isLoadingReservations}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          selectedDepartment={selectedDepartment}
        />

        {/* Instructions */}
        <GenerationInstructions />
      </div>
    </div>
  )
}

export default withAuth(GenerateShiftsPage, {
  allowedRoles: ['admin', 'manager', 'staff'],
  redirectTo: '/dashboard'
})