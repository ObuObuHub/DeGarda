'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Calendar } from '@/components/Calendar'
import { AuthUser } from '@/components/withAuth'
import { logger } from '@/lib/logger'
import { useData } from '@/contexts/DataContext'
import { showToast } from '@/components/Toast'
import { TouchFriendlyApproval } from '@/components/TouchFriendlyApproval'

interface ManagerDashboardProps {
  user: AuthUser
  currentDate: Date
  viewMonth: number
  viewYear: number
  setViewMonth: (month: number) => void
  setViewYear: (year: number) => void
  handlePrevMonth: () => void
  handleNextMonth: () => void
  handleLogout: () => void
}

interface SwapRequest {
  id: number
  from_staff_id: number
  to_staff_id: number | null
  shift_id: number
  reason: string
  status: string
  created_at: string
  shift_date: string
  shift_type: string
  from_staff_name: string
  to_staff_name: string | null
}

interface Reservation {
  id: number
  staff_id: number
  hospital_id: number
  shift_date: string
  department: string
  status: 'active' | 'cancelled' | 'fulfilled'
  created_at: string
}

interface DashboardStats {
  staff: number
  todayShifts: number
  weekShifts: number
  monthShifts: number
  pendingSwaps: number
  totalReservations: number
}

export function ManagerDashboard({ 
  user, 
  currentDate, 
  viewMonth, 
  viewYear, 
  setViewMonth, 
  setViewYear, 
  handlePrevMonth, 
  handleNextMonth, 
  handleLogout 
}: ManagerDashboardProps) {
  const router = useRouter()
  const { shifts, isLoading: shiftsLoading, loadShifts } = useData()
  
  const [activeTab, setActiveTab] = useState<'approvals' | 'schedule'>('approvals')
  const [pendingSwaps, setPendingSwaps] = useState<SwapRequest[]>([])
  const [allReservations, setAllReservations] = useState<Reservation[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    staff: 0,
    todayShifts: 0,
    weekShifts: 0,
    monthShifts: 0,
    pendingSwaps: 0,
    totalReservations: 0
  })
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  useEffect(() => {
    if (user && user.hospitalId) {
      loadShifts(viewYear, viewMonth, user.hospitalId)
      fetchManagerStats()
    }
  }, [viewYear, viewMonth, user, loadShifts])

  const fetchManagerStats = async () => {
    try {
      setIsLoadingStats(true)
      
      // Fetch staff count
      const staffResponse = await fetch('/api/staff', {
        credentials: 'include'
      })
      const staffData = await staffResponse.json()
      const staffCount = staffData.success ? staffData.staff?.length || 0 : 0
      
      // Fetch pending swaps
      const swapsResponse = await fetch(`/api/swaps?status=pending&hospitalId=${user?.hospitalId}`, {
        credentials: 'include'
      })
      const swapsData = await swapsResponse.json()
      const pendingSwapsCount = swapsData.success ? swapsData.swaps?.length || 0 : 0
      
      if (swapsData.success && swapsData.swaps) {
        setPendingSwaps(swapsData.swaps)
      }
      
      // Fetch all reservations
      const reservationsResponse = await fetch(`/api/reservations?hospitalId=${user?.hospitalId}`, {
        credentials: 'include'
      })
      const reservationsData = await reservationsResponse.json()
      let reservationsCount = 0
      if (reservationsData.success) {
        setAllReservations(reservationsData.reservations || [])
        reservationsCount = reservationsData.reservations?.length || 0
      }
      
      // Fetch shifts stats
      const shiftsResponse = await fetch('/api/shifts', {
        credentials: 'include'
      })
      const shiftsData = await shiftsResponse.json()
      
      const todayShifts = calculateTodayShifts(shiftsData.shifts || [])
      const weekShifts = calculateWeekShifts(shiftsData.shifts || [])
      const monthShifts = calculateMonthShifts(shiftsData.shifts || [])
      
      setStats({
        staff: staffCount,
        todayShifts,
        weekShifts,
        monthShifts,
        pendingSwaps: pendingSwapsCount,
        totalReservations: reservationsCount
      })
      
    } catch (error) {
      logger.error('ManagerDashboard', 'Failed to fetch manager stats', error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  const calculateTodayShifts = (shifts: any[]) => {
    const today = new Date().toISOString().split('T')[0]
    return shifts.filter(shift => shift.date === today).length
  }

  const calculateWeekShifts = (shifts: any[]) => {
    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    
    return shifts.filter(shift => {
      const shiftDate = new Date(shift.date)
      return shiftDate >= weekStart && shiftDate <= weekEnd
    }).length
  }

  const calculateMonthShifts = (shifts: any[]) => {
    const today = new Date()
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    
    return shifts.filter(shift => {
      const shiftDate = new Date(shift.date)
      return shiftDate >= monthStart && shiftDate <= monthEnd
    }).length
  }

  const handleSwapAction = async (swapId: number, action: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`/api/swaps/${swapId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          status: action,
          reviewedBy: user.userId 
        })
      })

      const data = await response.json()

      if (data.success) {
        showToast('success', `Cerere ${action === 'approved' ? 'aprobată' : 'respinsă'} cu succes!`)
        fetchManagerStats()
        logger.info('ManagerDashboard', `Swap ${action}`, { swapId, userId: user.userId })
      } else {
        showToast('error', data.error || 'Eroare la procesarea cererii')
      }
    } catch (error) {
      logger.error('ManagerDashboard', `Failed to ${action} swap`, error)
      showToast('error', 'Eroare la procesarea cererii')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="bg-gray-50">
      {/* Manager Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-xl">👨‍💼</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {user?.role === 'admin' ? 'Administrator' : 'Manager'} Dashboard
              </h1>
              <p className="text-sm text-gray-600">{user?.name} • {user?.hospitalName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/management')}
            >
              Management
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Ieși
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg mb-6">
          <button
            onClick={() => setActiveTab('approvals')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'approvals'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Aprobare Cereri {stats.pendingSwaps > 0 && (
              <span className="ml-2 px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                {stats.pendingSwaps}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'schedule'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Gestionare Program
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Personal Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingStats ? '...' : stats.staff}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-lg">👥</span>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cereri Schimb</p>
                <p className="text-2xl font-bold text-orange-600">
                  {isLoadingStats ? '...' : stats.pendingSwaps}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                stats.pendingSwaps > 0 ? 'bg-orange-100' : 'bg-gray-100'
              }`}>
                <span className="text-lg">{stats.pendingSwaps > 0 ? '⏳' : '✅'}</span>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rezervări Active</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.totalReservations}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-lg">📝</span>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Gărzi Azi</p>
                <p className="text-2xl font-bold text-green-600">
                  {isLoadingStats ? '...' : stats.todayShifts}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-lg">📅</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Tab Content */}
        {activeTab === 'approvals' && (
          <div className="space-y-6">
            {/* Pending Approvals */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Cereri Schimb în Așteptare
              </h2>
              <TouchFriendlyApproval
                swaps={pendingSwaps}
                onApprove={(swapId) => handleSwapAction(swapId, 'approved')}
                onReject={(swapId) => handleSwapAction(swapId, 'rejected')}
                formatDate={formatDate}
              />
            </Card>

            {/* Recent Reservations */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Rezervări Recente
              </h2>
              {allReservations.length === 0 ? (
                <p className="text-center py-8 text-gray-500">Nu există rezervări active.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allReservations.slice(0, 6).map((reservation) => (
                    <div key={reservation.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-gray-900">
                          {new Date(reservation.shift_date).toLocaleDateString('ro-RO', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {reservation.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{reservation.department}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(reservation.created_at).toLocaleDateString('ro-RO')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-6">
            {/* Schedule Management */}
            <Card className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Program Gărzi</h2>
                  <p className="text-sm text-gray-600">Gestionează programul spitalului</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push('/generate-shifts')}
                  >
                    Generează Gărzi
                  </Button>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => router.push('/schedule')}
                  >
                    Vezi Program Complet
                  </Button>
                </div>
              </div>

              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handlePrevMonth} icon="chevronLeft">
                    <span className="sr-only">Luna anterioară</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setViewMonth(currentDate.getMonth())
                    setViewYear(currentDate.getFullYear())
                  }}>
                    Azi
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleNextMonth} icon="chevronRight">
                    <span className="sr-only">Luna următoare</span>
                  </Button>
                </div>
              </div>

              {shiftsLoading ? (
                <div className="text-center py-8 text-gray-500">
                  Se încarcă programul...
                </div>
              ) : (
                <Calendar
                  year={viewYear}
                  month={viewMonth}
                  shifts={shifts}
                  onDayClick={undefined}
                />
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}