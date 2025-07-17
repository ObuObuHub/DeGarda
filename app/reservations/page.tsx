'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import withAuth, { AuthUser, WithAuthProps } from '@/components/withAuth'
import { logger } from '@/lib/logger'
import { apiClient } from '@/lib/apiClient'

interface Reservation {
  id: number
  staff_id: number
  hospital_id: number
  shift_date: string
  department: string
  status: 'active' | 'cancelled' | 'fulfilled'
  created_at: string
}

interface ReservationsPageProps extends WithAuthProps {
  // Additional props if needed
}

function ReservationsPage({ user, isLoading: authLoading, error: authError }: ReservationsPageProps) {
  const router = useRouter()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Form state
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('LABORATOR')

  // Only allow staff to access this page
  if (user?.role !== 'staff') {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Acces Restricționat</h1>
            <p className="text-gray-600 mb-6">
              Această pagină este disponibilă doar pentru personalul medical.
            </p>
            <Button onClick={() => router.push('/dashboard')}>
              Înapoi la Dashboard
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  useEffect(() => {
    if (user) {
      fetchReservations()
    }
  }, [user])

  const fetchReservations = async () => {
    if (!user?.userId) return

    setIsLoading(true)
    try {
      const data = await apiClient.get<{ success: boolean, reservations?: Reservation[], error?: string }>(
        `/api/reservations?staffId=${user.userId}`
      )

      if (data.success) {
        setReservations(data.reservations || [])
      } else {
        setError(data.error || 'Failed to fetch reservations')
      }
    } catch (error: any) {
      logger.error('ReservationsPage', 'Failed to fetch reservations', error)
      setError(error.message || 'Failed to fetch reservations')
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
        setSelectedDepartment('LABORATOR')
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

  const handleCancelReservation = async (reservationId: number) => {
    try {
      setIsLoading(true)
      setError('')
      setSuccess('')

      const data = await apiClient.delete<{ success: boolean, error?: string }>(
        `/api/reservations?reservationId=${reservationId}`
      )

      if (data.success) {
        setSuccess('Reservation cancelled successfully!')
        fetchReservations() // Refresh the list
      } else {
        setError(data.error || 'Failed to cancel reservation')
      }
    } catch (error: any) {
      logger.error('ReservationsPage', 'Failed to cancel reservation', error)
      setError(error.message || 'Failed to cancel reservation')
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
    const today = new Date()
    today.setDate(today.getDate() + 1) // Can't reserve for today
    return today.toISOString().split('T')[0]
  }

  const getMaxDate = () => {
    const maxDate = new Date()
    maxDate.setMonth(maxDate.getMonth() + 2) // Can reserve up to 2 months ahead
    return maxDate.toISOString().split('T')[0]
  }

  const activeReservations = reservations.filter(r => r.status === 'active')
  const canCreateMore = activeReservations.length < 3

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Rezervări Gărzi
            </h1>
            <p className="text-gray-600 mt-2">
              {user?.name} • {user?.hospitalName} • LABORATOR
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
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/schedule')}
            >
              Program Complet
            </Button>
          </div>
        </div>

        {/* Info Card */}
        <Card className="p-6 mb-8 bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-3">Cum funcționează rezervările?</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>• <strong>Maxim 3 rezervări</strong> per lună pentru fiecare membru al personalului</li>
            <li>• <strong>Rezervările sunt luate în considerare</strong> când managerii generează programul</li>
            <li>• <strong>Nu sunt garantate</strong> - depind de necesitățile spitalului și disponibilitatea</li>
            <li>• <strong>Poți anula</strong> rezervările până când sunt confirmate în program</li>
            <li>• <strong>Rezervări preferate</strong> au prioritate la generarea programului</li>
          </ul>
        </Card>

        {/* Create New Reservation */}
        {canCreateMore && (
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Rezervă Gardă Nouă
            </h2>

            <form onSubmit={handleCreateReservation} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Input
                    type="date"
                    label="Data Dorită"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={getMinDate()}
                    max={getMaxDate()}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Poți rezerva între {formatDate(getMinDate())} și {formatDate(getMaxDate())}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departament
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="LABORATOR">LABORATOR</option>
                    <option value="URGENTA">URGENȚĂ</option>
                    <option value="CHIRURGIE">CHIRURGIE</option>
                    <option value="INTERNA">INTERNĂ</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-600">{success}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || !selectedDate}
                className="w-full md:w-auto"
              >
                {isLoading ? 'Se salvează...' : 'Rezervă Garda'}
              </Button>
            </form>
          </Card>
        )}

        {/* Reservation Limit Warning */}
        {!canCreateMore && (
          <Card className="p-6 mb-8 bg-orange-50 border-orange-200">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-semibold text-orange-900">Limită Atinsă</h3>
                <p className="text-sm text-orange-800">
                  Ai atins limita de 3 rezervări active. Anulează o rezervare existentă pentru a putea crea una nouă.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Current Reservations */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Rezervările Tale ({activeReservations.length}/3)
            </h2>
            {isLoading && <LoadingSpinner size="sm" />}
          </div>

          {activeReservations.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-4 block">📝</span>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nu ai rezervări active
              </h3>
              <p className="text-gray-600 mb-4">
                Creează prima ta rezervare pentru o gardă preferată.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeReservations.map((reservation) => (
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
                          {formatDate(reservation.shift_date)}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {reservation.department} • Rezervată la {new Date(reservation.created_at).toLocaleDateString('ro-RO')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {reservation.status === 'active' ? 'Activă' : reservation.status}
                    </span>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleCancelReservation(reservation.id)}
                      disabled={isLoading}
                    >
                      Anulează
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default withAuth(ReservationsPage, {
  allowedRoles: ['staff'],
  redirectTo: '/dashboard'
})