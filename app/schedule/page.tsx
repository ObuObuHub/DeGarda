'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Calendar } from '@/components/Calendar'
import { SwapRequestModal } from '@/components/SwapRequestModal'
import { useShifts } from '@/contexts/ShiftsContext'
import { showToast } from '@/components/Toast'
import { logger } from '@/lib/logger'
import withAuth, { AuthUser, WithAuthProps } from '@/components/withAuth'
import { SwapRequest } from '@/types'

interface SchedulePageProps extends WithAuthProps {
  // Additional props if needed
}

function SchedulePage({ user, isLoading: authLoading, error: authError }: SchedulePageProps) {
  const router = useRouter()
  const { shifts, isLoading, loadShifts } = useShifts()
  
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(user?.hospitalId?.toString() || '')
  const [swapModalOpen, setSwapModalOpen] = useState(false)
  const [selectedShift, setSelectedShift] = useState<any>(null)
  const [pendingSwaps, setPendingSwaps] = useState<SwapRequest[]>([])
  const [isLoadingSwaps, setIsLoadingSwaps] = useState(false)
  
  const currentDate = new Date()
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth())
  const [viewYear, setViewYear] = useState(currentDate.getFullYear())

  const isStaff = user?.role === 'staff'
  const isManager = user?.role === 'manager' || user?.role === 'admin'

  useEffect(() => {
    // All users see only their assigned hospital
    if (user?.hospitalId) {
      setSelectedHospitalId(user.hospitalId.toString())
    }
  }, [user])

  useEffect(() => {
    if (selectedHospitalId) {
      loadShifts(viewYear, viewMonth, selectedHospitalId)
      if (isManager) {
        loadPendingSwaps()
      }
    }
  }, [viewYear, viewMonth, selectedHospitalId, loadShifts])

  const loadPendingSwaps = async () => {
    if (!selectedHospitalId) return
    
    setIsLoadingSwaps(true)
    try {
      const response = await fetch(`/api/swaps?status=pending&hospitalId=${selectedHospitalId}`, {
        credentials: 'include'
      })
      const data = await response.json()
      
      if (data.success) {
        setPendingSwaps(data.swaps || [])
      }
    } catch (error) {
      logger.error('SchedulePage', 'Failed to load pending swaps', error)
    } finally {
      setIsLoadingSwaps(false)
    }
  }

  const handleDayClick = async (date: string) => {
    const shift = shifts[date]
    
    if (!shift) {
      showToast('info', 'Info', 'Nu există gărzi programate pentru această zi')
      return
    }

    if (isStaff) {
      // Staff can request swaps for their shifts
      if (shift.doctorId === user?.userId.toString()) {
        setSelectedShift({ ...shift, date })
        setSwapModalOpen(true)
      } else {
        showToast('info', 'Info', `Gardă atribuită: ${shift.doctorName || 'Neatribuită'}`)
      }
    } else {
      // Managers can see shift details
      showToast('info', 'Detalii Gardă', `${shift.doctorName || 'Neatribuită'} - ${shift.department || 'General'}`)
    }
  }

  const handleSwapAction = async (swapId: number, action: 'approved' | 'rejected') => {
    if (!isManager) return

    try {
      const response = await fetch(`/api/swaps/${swapId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          status: action,
          reviewedBy: user?.userId 
        })
      })

      const data = await response.json()

      if (data.success) {
        showToast('success', 'Succes', `Cererea de schimb a fost ${action === 'approved' ? 'aprobată' : 'respinsă'}`)
        loadPendingSwaps() // Refresh
        loadShifts(viewYear, viewMonth, selectedHospitalId) // Refresh calendar
      } else {
        showToast('error', 'Eroare', data.error || 'Nu s-a putut procesa cererea')
      }
    } catch (error) {
      logger.error('SchedulePage', `Failed to ${action} swap`, error)
      showToast('error', 'Eroare', 'Nu s-a putut procesa cererea')
    }
  }

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  const handleGenerateShifts = () => {
    router.push('/generate-shifts')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              {isStaff ? 'Programul Meu' : 'Program Gărzi'}
            </h1>
            <p className="text-gray-600 mt-2">
              {user?.name} • {user?.hospitalName}
              {isStaff && ' • LABORATOR'}
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
            {isStaff && (
              <Button 
                variant="primary" 
                size="sm"
                onClick={() => router.push('/reservations')}
              >
                Rezervări
              </Button>
            )}
            {isManager && (
              <>
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={handleGenerateShifts}
                >
                  Generează Gărzi
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => router.push('/management')}
                >
                  Management
                </Button>
              </>
            )}
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

        {/* Pending Swaps for Managers */}
        {isManager && pendingSwaps.length > 0 && (
          <Card className="p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Cereri Schimb în Așteptare ({pendingSwaps.length})
              </h2>
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-lg">⏳</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {pendingSwaps.map((swap) => (
                <div
                  key={swap.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {swap.from_staff_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          Gardă {formatDate(swap.shift_date)} • {swap.shift_type}
                        </p>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Motiv:</span> {swap.reason}
                        </p>
                        {swap.to_staff_name && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Către:</span> {swap.to_staff_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleSwapAction(swap.id, 'approved')}
                      disabled={isLoadingSwaps}
                    >
                      Aprobă
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleSwapAction(swap.id, 'rejected')}
                      disabled={isLoadingSwaps}
                    >
                      Respinge
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Calendar */}
        <Card className="p-6">
          {/* Month Navigation */}
          <div className="flex justify-between items-center mb-6">
            <Button variant="ghost" size="sm" onClick={handlePrevMonth} icon="chevronLeft">
              <span className="sr-only">Luna anterioară</span>
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => {
                setViewMonth(currentDate.getMonth())
                setViewYear(currentDate.getFullYear())
              }}>
                Azi
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={handleNextMonth} icon="chevronRight">
              <span className="sr-only">Luna următoare</span>
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Se încarcă programul...
            </div>
          ) : !selectedHospitalId ? (
            <div className="text-center py-8 text-gray-500">
              Selectează un spital pentru a vedea programul.
            </div>
          ) : (
            <Calendar
              year={viewYear}
              month={viewMonth}
              shifts={shifts}
              onDayClick={handleDayClick}
            />
          )}
        </Card>

        {/* Info for Staff */}
        {isStaff && (
          <Card className="mt-6 p-6 bg-blue-50 border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-3">Cum să folosești programul:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Click pe o zi</strong> pentru a vedea detalii despre gardă</li>
              <li>• <strong>Gărzile tale</strong> sunt evidențiate cu culoarea ta</li>
              <li>• <strong>Poți solicita schimburi</strong> pentru gărzile tale atribuite</li>
              <li>• <strong>Folosește "Rezervări"</strong> pentru a rezerva gărzi preferate</li>
            </ul>
          </Card>
        )}

        {/* Swap Request Modal */}
        {swapModalOpen && selectedShift && (
          <SwapRequestModal
            shift={selectedShift}
            onClose={() => {
              setSwapModalOpen(false)
              setSelectedShift(null)
            }}
            onSuccess={() => {
              setSwapModalOpen(false)
              setSelectedShift(null)
              loadShifts(viewYear, viewMonth, selectedHospitalId)
            }}
          />
        )}
      </div>
    </div>
  )
}

export default withAuth(SchedulePage, {
  allowedRoles: ['admin', 'manager', 'staff'],
  redirectTo: '/dashboard'
})