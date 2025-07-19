'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { logger } from '@/lib/logger'
import withAuth, { AuthUser, WithAuthProps } from '@/components/withAuth'
import apiClient from '@/lib/apiClient'
import { Reservation } from '@/types'

interface ReservationsProps extends WithAuthProps {
  // Additional props if needed
}

function ReservationsPage({ user, isLoading: authLoading, error: authError }: ReservationsProps) {
  const router = useRouter()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('General')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const departments = ['ATI', 'Urgențe', 'Laborator', 'Medicină Internă', 'Chirurgie', 'General']

  useEffect(() => {
    if (user) {
      // Only staff can access reservations
      if (user.role !== 'staff') {
        router.push('/admin/dashboard')
        return
      }
      
      fetchReservations()
    }
  }, [user, router])

  const fetchReservations = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const currentDate = new Date()
      const month = currentDate.getMonth() + 1
      const year = currentDate.getFullYear()
      
      const data = await apiClient.get<{ success: boolean, reservations: Reservation[] }>(
        `/api/reservations?staffId=${user.userId}&month=${month}&year=${year}`
      )

      if (data.success) {
        setReservations(data.reservations)
      } else {
        setError('Failed to fetch reservations')
      }
    } catch (error) {
      logger.error('ReservationsPage', 'Failed to fetch reservations', error)
      setError('Failed to fetch reservations')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedDate) return

    try {
      setIsLoading(true)
      setError('')
      setSuccess('')

      const data = await apiClient.post<{ success: boolean, reservation?: Reservation, error?: string }>(
        '/api/reservations',
        {
          staffId: user.userId,
          shiftDate: selectedDate,
          department: selectedDepartment
        }
      )

      if (data.success) {
        setSuccess('Reservation created successfully!')
        setSelectedDate('')
        setSelectedDepartment('General')
        fetchReservations() // Refresh the list
      } else {
        setError(data.error || 'Failed to create reservation')
      }
    } catch (error: any) {
      logger.error('ReservationsPage', 'Failed to create reservation', error)
      setError(error.message || 'Failed to create reservation')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteReservation = async (reservation: Reservation) => {
    if (!user) return

    try {
      setIsLoading(true)
      setError('')
      setSuccess('')

      const data = await apiClient.delete<{ success: boolean, message?: string, error?: string }>(
        `/api/reservations?staffId=${user.userId}&shiftDate=${reservation.shift_date}`
      )

      if (data.success) {
        setSuccess('Reservation deleted successfully!')
        fetchReservations() // Refresh the list
      } else {
        setError(data.error || 'Failed to delete reservation')
      }
    } catch (error: any) {
      logger.error('ReservationsPage', 'Failed to delete reservation', error)
      setError(error.message || 'Failed to delete reservation')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getMinDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  const getMaxDate = () => {
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    return nextMonth.toISOString().split('T')[0]
  }

  if (authLoading) {
    return <LoadingSpinner text="Loading..." />
  }

  if (authError) {
    return (
      <div className="p-6">
        <Card className="p-6 text-center">
          <p className="text-red-600">Authentication error: {authError}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Rezervări Gărzi
          </h1>
          <p className="text-gray-600">
            Rezervă-ți datele preferate pentru gărzi (maxim 3 pe lună)
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Create Reservation Form */}
        <Card className="mb-6 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Rezervă o Nouă Gardă
          </h2>
          <form onSubmit={handleCreateReservation} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Gărzi
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={getMinDate()}
                  max={getMaxDate()}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Departament
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button
              type="submit"
              disabled={isLoading || !selectedDate}
              className="w-full md:w-auto"
            >
              {isLoading ? 'Se procesează...' : 'Rezervă Garda'}
            </Button>
          </form>
        </Card>

        {/* Current Reservations */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Rezervările Tale ({reservations.length}/3)
            </h2>
            <Button
              onClick={fetchReservations}
              disabled={isLoading}
              variant="secondary"
              size="sm"
            >
              {isLoading ? 'Se încarcă...' : 'Reîmprospătează'}
            </Button>
          </div>

          {isLoading && <LoadingSpinner text="Loading reservations..." />}

          {!isLoading && reservations.length === 0 && (
            <p className="text-gray-500 text-center py-8">
              Nu ai rezervări pentru luna curentă
            </p>
          )}

          {!isLoading && reservations.length > 0 && (
            <div className="space-y-4">
              {reservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatDate(reservation.shift_date)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {reservation.department}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleDeleteReservation(reservation)}
                    disabled={isLoading}
                    variant="danger"
                    size="sm"
                  >
                    Șterge
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Instructions */}
        <Card className="mt-6 p-6 bg-blue-50">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Cum Funcționează
          </h3>
          <ul className="space-y-2 text-blue-800">
            <li>• Poți rezerva maxim 3 gărzi pe lună</li>
            <li>• Rezervările sunt pentru zilele următoare (nu pentru astăzi)</li>
            <li>• Managerii vor genera programul pe baza rezervărilor</li>
            <li>• Poți anula o rezervare dacă este necesar</li>
            <li>• Rezervările nu garantează programarea - depinde de necesar</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

export default withAuth(ReservationsPage)