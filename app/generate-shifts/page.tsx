'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { HospitalSelector } from '@/components/HospitalSelector'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import withAuth, { AuthUser, WithAuthProps } from '@/components/withAuth'
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
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('')
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
      if (isAdmin) {
        setSelectedHospitalId('5') // Default to Piatra-Neamț
        setCanGenerate(true)
      } else if (isManager) {
        setSelectedHospitalId(user.hospitalId?.toString() || '')
        setCanGenerate(true)
      } else if (isStaff) {
        setSelectedHospitalId(user.hospitalId?.toString() || '')
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  }

  const getMonthName = (month: string) => {
    const monthNames = [
      'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
      'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
    ]
    return monthNames[parseInt(month) - 1] || month
  }

  // Check if user has access
  if (!canGenerate) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6 text-center">
            <span className="text-4xl mb-4 block">🔒</span>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Acces Restricționat</h1>
            <p className="text-gray-600 mb-6">
              {isStaff 
                ? 'Nu ai permisiunea de a genera gărzi. Contactează managerul pentru a obține această permisiune.'
                : 'Această pagină este disponibilă doar pentru manageri, administratori și personalul cu permisiuni speciale.'
              }
            </p>
            <Button onClick={() => router.push('/dashboard')}>
              Înapoi la Dashboard
            </Button>
          </Card>
        </div>
      </div>
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

        {/* Hospital Selector - Only for Admin */}
        {isAdmin && (
          <Card className="p-4 mb-6">
            <HospitalSelector
              selectedHospitalId={selectedHospitalId}
              onHospitalChange={setSelectedHospitalId}
              userRole={user.role}
            />
          </Card>
        )}

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
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Parametri Generare
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Month Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Luna
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isGenerating}
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const month = (i + 1).toString().padStart(2, '0')
                  const monthName = getMonthName(month)
                  return (
                    <option key={month} value={month}>
                      {monthName}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Year Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Anul
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isGenerating}
              >
                {Array.from({ length: 3 }, (_, i) => {
                  const year = (new Date().getFullYear() + i).toString()
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Department Selection - Only for Managers/Admin */}
            {(isManager || isAdmin) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Departament
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isGenerating}
                >
                  <option value="LABORATOR">LABORATOR</option>
                  <option value="URGENTA">URGENȚĂ</option>
                  <option value="CHIRURGIE">CHIRURGIE</option>
                  <option value="INTERNA">INTERNĂ</option>
                </select>
              </div>
            )}
          </div>

          <div className="mt-6">
            <Button
              onClick={handleGenerateShifts}
              disabled={isGenerating || !selectedHospitalId || !selectedMonth || !selectedYear}
              className="w-full md:w-auto"
            >
              {isGenerating ? (
                <span className="flex items-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span>Se generează...</span>
                </span>
              ) : (
                `Generează Gărzi pentru ${getMonthName(selectedMonth)} ${selectedYear}`
              )}
            </Button>
          </div>
        </Card>

        {/* Reservations Preview */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Rezervări Existente ({reservations.length})
            </h2>
            {isLoadingReservations && <LoadingSpinner size="sm" />}
          </div>

          {selectedMonth && selectedYear && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">
                Informații Generare pentru {getMonthName(selectedMonth)} {selectedYear}
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Departament:</strong> {selectedDepartment}</li>
                <li>• <strong>Rezervări găsite:</strong> {reservations.length}</li>
                <li>• <strong>Algoritm:</strong> Optimizat cu considere pentru rezervări</li>
                <li>• <strong>Echitatea:</strong> Distribuție echitabilă între tot personalul</li>
              </ul>
            </div>
          )}

          {reservations.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-4 block">📝</span>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nu există rezervări
              </h3>
              <p className="text-gray-600">
                {selectedMonth && selectedYear 
                  ? `Nu s-au găsit rezervări pentru ${getMonthName(selectedMonth)} ${selectedYear} în departamentul ${selectedDepartment}.`
                  : 'Selectează luna și anul pentru a vedea rezervările.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-lg">📅</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {reservation.staff_name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {formatDate(reservation.shift_date)} • {reservation.department}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      reservation.status === 'active' 
                        ? 'bg-blue-100 text-blue-800'
                        : reservation.status === 'fulfilled'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {reservation.status === 'active' ? 'Activă' 
                       : reservation.status === 'fulfilled' ? 'Îndeplinită'
                       : reservation.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Info Card */}
        <Card className="mt-6 p-6 bg-yellow-50 border-yellow-200">
          <h3 className="font-semibold text-yellow-900 mb-3">Instrucțiuni Generare Gărzi</h3>
          <ul className="text-sm text-yellow-800 space-y-2">
            <li>• <strong>Rezervările sunt prioritare</strong> - personalul care a rezervat zile preferate va fi luat în considerare</li>
            <li>• <strong>Distribuție echitabilă</strong> - algoritmul asigură o distribuție corectă a gărzilor</li>
            <li>• <strong>Restricții departamentale</strong> - doar personalul din departamentul selectat va fi inclus</li>
            <li>• <strong>Generarea suprascrie</strong> programul existent pentru luna selectată</li>
            <li>• <strong>Verifică rezultatele</strong> în secțiunea "Program Gărzi" după generare</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

export default withAuth(GenerateShiftsPage, {
  allowedRoles: ['admin', 'manager', 'staff'],
  redirectTo: '/dashboard'
})