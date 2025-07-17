'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import withAuth, { AuthUser, WithAuthProps } from '@/components/withAuth'
import { logger } from '@/lib/logger'
import { hasPermission } from '@/lib/roleBasedAccess'
import { Calendar } from '@/components/Calendar'
import { useData } from '@/contexts/DataContext'
import { apiClient } from '@/lib/apiClient'
import { showToast } from '@/components/Toast'
import { ManagerDashboard } from '@/components/ManagerDashboard'
import { MobileLayout } from '@/components/MobileLayout'

interface DashboardStats {
  staff: number
  todayShifts: number
  weekShifts: number
  monthShifts: number
  pendingSwaps: number
  myReservations: number
  upcomingShifts: number
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

interface UnifiedDashboardProps extends WithAuthProps {
  // Additional props if needed
}

function UnifiedDashboard({ user, isLoading: authLoading, error: authError }: UnifiedDashboardProps) {
  const router = useRouter()
  const { shifts, isLoading: shiftsLoading, loadShifts } = useData()
  
  const [stats, setStats] = useState<DashboardStats>({
    staff: 0,
    todayShifts: 0,
    weekShifts: 0,
    monthShifts: 0,
    pendingSwaps: 0,
    myReservations: 0,
    upcomingShifts: 0
  })
  
  const [pendingSwaps, setPendingSwaps] = useState<SwapRequest[]>([])
  const [myReservations, setMyReservations] = useState<Reservation[]>([])
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [canGenerateShifts, setCanGenerateShifts] = useState(false)
  
  // Staff quick actions state
  const [quickReserveDate, setQuickReserveDate] = useState('')
  const [quickReserveDept, setQuickReserveDept] = useState('LABORATOR')
  const [isQuickReserving, setIsQuickReserving] = useState(false)
  const [showQuickReserve, setShowQuickReserve] = useState(false)
  const [mySwaps, setMySwaps] = useState<SwapRequest[]>([])
  
  // Manager interface state
  const [activeTab, setActiveTab] = useState<'approvals' | 'schedule'>('approvals')
  const [allReservations, setAllReservations] = useState<Reservation[]>([])
  
  const currentDate = new Date()
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth())
  const [viewYear, setViewYear] = useState(currentDate.getFullYear())

  const isStaff = user?.role === 'staff'
  const isManager = user?.role === 'manager' || user?.role === 'admin'

  useEffect(() => {
    if (user && user.hospitalId) {
      loadShifts(viewYear, viewMonth, user.hospitalId)
      fetchDashboardStats()
      if (isStaff) {
        loadMyReservations()
        checkShiftPermissions()
        loadMySwaps()
      }
    }
  }, [viewYear, viewMonth, user, loadShifts])

  const fetchDashboardStats = async () => {
    try {
      setIsLoadingStats(true)
      
      // Common stats for all users
      const shiftsResponse = await fetch('/api/shifts', {
        credentials: 'include'
      })
      const shiftsData = await shiftsResponse.json()
      
      let staffCount = 0
      let pendingSwapsCount = 0
      
      // Manager/Admin stats
      if (isManager) {
        const staffResponse = await fetch('/api/staff', {
          credentials: 'include'
        })
        const staffData = await staffResponse.json()
        staffCount = staffData.success ? staffData.staff?.length || 0 : 0
        
        // Fetch pending swaps for managers
        const swapsResponse = await fetch(`/api/swaps?status=pending&hospitalId=${user?.hospitalId}`, {
          credentials: 'include'
        })
        const swapsData = await swapsResponse.json()
        pendingSwapsCount = swapsData.success ? swapsData.swaps?.length || 0 : 0
        
        if (swapsData.success && swapsData.swaps) {
          setPendingSwaps(swapsData.swaps)
        }
        
        // Load all reservations for managers
        const reservationsResponse = await fetch(`/api/reservations?hospitalId=${user?.hospitalId}`, {
          credentials: 'include'
        })
        const reservationsData = await reservationsResponse.json()
        if (reservationsData.success) {
          setAllReservations(reservationsData.reservations || [])
        }
      }
      
      // Calculate shifts stats
      const todayShifts = calculateTodayShifts(shiftsData.shifts || [])
      const weekShifts = calculateWeekShifts(shiftsData.shifts || [])
      const monthShifts = calculateMonthShifts(shiftsData.shifts || [])
      
      setStats({
        staff: staffCount,
        todayShifts,
        weekShifts,
        monthShifts,
        pendingSwaps: pendingSwapsCount,
        myReservations: myReservations.length,
        upcomingShifts: isStaff ? Object.values(shifts).filter(s => s.doctorId === user?.userId.toString()).length : 0
      })
      
    } catch (error) {
      logger.error('UnifiedDashboard', 'Failed to fetch dashboard stats', error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  const loadMyReservations = async () => {
    if (!user?.userId) return
    
    try {
      const response = await fetch(`/api/reservations?staffId=${user.userId}&month=${viewMonth + 1}&year=${viewYear}`, {
        credentials: 'include'
      })
      const data = await response.json()
      
      if (data.success) {
        setMyReservations(data.reservations || [])
      }
    } catch (error) {
      logger.error('UnifiedDashboard', 'Failed to load reservations', error)
    }
  }

  const loadMySwaps = async () => {
    if (!user?.userId) return
    
    try {
      const response = await fetch(`/api/swaps?staffId=${user.userId}&hospitalId=${user.hospitalId}`, {
        credentials: 'include'
      })
      const data = await response.json()
      
      if (data.success) {
        setMySwaps(data.swaps || [])
      }
    } catch (error) {
      logger.error('UnifiedDashboard', 'Failed to load swaps', error)
    }
  }

  const handleQuickReserve = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !quickReserveDate) return

    setIsQuickReserving(true)
    try {
      const data = await apiClient.post('/api/reservations', {
        staffId: user.userId,
        shiftDate: quickReserveDate,
        department: quickReserveDept
      })

      if (data.success) {
        showToast('success', 'Rezervare creată cu succes!')
        setQuickReserveDate('')
        setShowQuickReserve(false)
        loadMyReservations()
        fetchDashboardStats()
      } else {
        showToast('error', data.error || 'Eroare la crearea rezervării')
      }
    } catch (error: any) {
      showToast('error', error.message || 'Eroare la crearea rezervării')
    } finally {
      setIsQuickReserving(false)
    }
  }

  const handleCancelReservation = async (reservationId: number) => {
    try {
      const data = await apiClient.delete(`/api/reservations?reservationId=${reservationId}`)
      
      if (data.success) {
        showToast('success', 'Rezervare anulată cu succes!')
        loadMyReservations()
        fetchDashboardStats()
      } else {
        showToast('error', data.error || 'Eroare la anularea rezervării')
      }
    } catch (error: any) {
      showToast('error', error.message || 'Eroare la anularea rezervării')
    }
  }

  const checkShiftPermissions = async () => {
    try {
      const response = await fetch('/api/staff/shift-permissions', {
        credentials: 'include'
      })
      const data = await response.json()
      
      if (response.ok) {
        setCanGenerateShifts(data.canGenerateShifts || false)
      }
    } catch (error) {
      logger.error('UnifiedDashboard', 'Failed to check shift permissions', error)
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
    if (!user) return

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
        fetchDashboardStats()
        logger.info('UnifiedDashboard', `Swap ${action}`, { swapId, userId: user.userId })
      }
    } catch (error) {
      logger.error('UnifiedDashboard', `Failed to ${action} swap`, error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const getMinReserveDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  const getMaxReserveDate = () => {
    const maxDate = new Date()
    maxDate.setMonth(maxDate.getMonth() + 2)
    return maxDate.toISOString().split('T')[0]
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      // Continue with logout even if API call fails
    }
    
    localStorage.clear()
    sessionStorage.clear()
    router.push('/')
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

  // Enhance shifts with reservation info for staff
  const enhancedShifts = { ...shifts }
  if (isStaff) {
    myReservations.forEach(reservation => {
      const date = reservation.shift_date
      if (!enhancedShifts[date]) {
        enhancedShifts[date] = {
          id: `reservation_${reservation.id}`,
          date,
          status: 'reserved',
          reservedBy: user?.userId.toString() || '',
          reservedByName: user?.name || '',
          doctorId: null,
          doctorName: null,
          department: reservation.department
        }
      }
    })
  }

  // Staff gets a completely different layout
  if (isStaff) {
    return (
      <MobileLayout user={user}>
        <div className="bg-gray-50">
        {/* Staff Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-xl">👨‍⚕️</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Programul Meu</h1>
                <p className="text-sm text-gray-600">{user?.name} • {user?.hospitalName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowQuickReserve(!showQuickReserve)}
                disabled={myReservations.length >= 3}
              >
                + Rezervare
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Ieși
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Calendar - Takes up 3/4 of the space */}
            <div className="lg:col-span-3">
              <Card className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Calendarul Meu</h2>
                    <p className="text-sm text-gray-600">Gărzile mele și rezervările</p>
                  </div>
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

                {/* Quick Reserve Form */}
                {showQuickReserve && (
                  <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
                    <h3 className="font-medium text-blue-900 mb-3">Rezervare Rapidă</h3>
                    <form onSubmit={handleQuickReserve} className="flex items-end gap-4">
                      <div className="flex-1">
                        <Input
                          type="date"
                          label="Data"
                          value={quickReserveDate}
                          onChange={(e) => setQuickReserveDate(e.target.value)}
                          min={getMinReserveDate()}
                          max={getMaxReserveDate()}
                          required
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Departament</label>
                        <select
                          value={quickReserveDept}
                          onChange={(e) => setQuickReserveDept(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="LABORATOR">LABORATOR</option>
                          <option value="URGENTA">URGENȚĂ</option>
                          <option value="CHIRURGIE">CHIRURGIE</option>
                          <option value="INTERNA">INTERNĂ</option>
                        </select>
                      </div>
                      <Button
                        type="submit"
                        disabled={isQuickReserving || !quickReserveDate}
                        size="sm"
                      >
                        {isQuickReserving ? 'Se salvează...' : 'Rezervă'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowQuickReserve(false)}
                      >
                        Anulează
                      </Button>
                    </form>
                  </Card>
                )}

                {shiftsLoading ? (
                  <div className="text-center py-8 text-gray-500">
                    Se încarcă programul...
                  </div>
                ) : (
                  <Calendar
                    year={viewYear}
                    month={viewMonth}
                    shifts={enhancedShifts}
                    onDayClick={undefined}
                  />
                )}
              </Card>
            </div>

            {/* Staff Sidebar - Takes up 1/4 of the space */}
            <div className="lg:col-span-1 space-y-6">
              {/* Quick Stats */}
              <Card className="p-4">
                <h3 className="font-medium text-gray-900 mb-3">Statistici Rapide</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Rezervări Active</span>
                    <span className="text-sm font-semibold text-blue-600">{myReservations.length}/3</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Gărzi Luna</span>
                    <span className="text-sm font-semibold text-green-600">{stats.monthShifts}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Gărzi Săptămâna</span>
                    <span className="text-sm font-semibold text-orange-600">{stats.weekShifts}</span>
                  </div>
                </div>
              </Card>

              {/* My Reservations */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">Rezervările Mele</h3>
                  <span className="text-xs text-gray-500">{myReservations.length}/3</span>
                </div>
                <div className="space-y-2">
                  {myReservations.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Nu ai rezervări active</p>
                  ) : (
                    myReservations.map((reservation) => (
                      <div key={reservation.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(reservation.shift_date).toLocaleDateString('ro-RO', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                          <p className="text-xs text-gray-600">{reservation.department}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCancelReservation(reservation.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          ×
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* My Swaps */}
              <Card className="p-4">
                <h3 className="font-medium text-gray-900 mb-3">Schimburile Mele</h3>
                <div className="space-y-2">
                  {mySwaps.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Nu ai cereri de schimb</p>
                  ) : (
                    mySwaps.slice(0, 3).map((swap) => (
                      <div key={swap.id} className="p-2 bg-gray-50 rounded">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(swap.shift_date).toLocaleDateString('ro-RO', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                          <span className={`text-xs px-2 py-1 rounded ${
                            swap.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            swap.status === 'approved' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {swap.status === 'pending' ? 'Pending' : swap.status === 'approved' ? 'Aprobat' : 'Respins'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{swap.reason}</p>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
        </div>
      </MobileLayout>
    )
  }

  // Manager/Admin gets the new approval-central interface
  if (isManager) {
    return (
      <MobileLayout user={user}>
        <ManagerDashboard
        user={user}
        currentDate={currentDate}
        viewMonth={viewMonth}
        viewYear={viewYear}
        setViewMonth={setViewMonth}
        setViewYear={setViewYear}
        handlePrevMonth={handlePrevMonth}
        handleNextMonth={handleNextMonth}
        handleLogout={handleLogout}
      />
      </MobileLayout>
    )
  }

  // Fallback for any other roles
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Dashboard {user?.role === 'admin' ? 'Administrator' : 'Manager'}
            </h1>
            <p className="text-gray-600">
              Bun venit, {user?.name}! • {user?.hospitalName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => router.push('/schedule')}
            >
              Program Gărzi
            </Button>
            <Button 
              variant="primary" 
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {isManager && (
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Personal Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoadingStats ? '...' : stats.staff}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">👥</span>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Gărzi Azi</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingStats ? '...' : stats.todayShifts}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📅</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Gărzi Săptămâna</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingStats ? '...' : stats.weekShifts}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
          </Card>

          {isManager && (
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Cereri Schimb</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {isLoadingStats ? '...' : stats.pendingSwaps}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  stats.pendingSwaps > 0 ? 'bg-orange-100' : 'bg-gray-100'
                }`}>
                  <span className="text-2xl">{stats.pendingSwaps > 0 ? '⏳' : '✅'}</span>
                </div>
              </div>
            </Card>
          )}

          {isStaff && (
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Rezervările Mele</p>
                  <p className="text-2xl font-bold text-system-blue">
                    {myReservations.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📝</span>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Manager Approval Section */}
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
              {pendingSwaps.slice(0, 3).map((swap) => (
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
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleSwapAction(swap.id, 'approved')}
                    >
                      Aprobă
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleSwapAction(swap.id, 'rejected')}
                    >
                      Respinge
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Calendar Section */}
        <Card className="p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {isStaff ? 'Programul Meu' : 'Program Gărzi'}
            </h2>
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
              shifts={enhancedShifts}
              onDayClick={isStaff ? undefined : undefined} // Will add functionality later
            />
          )}
        </Card>

        {/* Role-specific Information */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {isStaff ? 'Informații Personal' : `Informații ${user?.role === 'admin' ? 'Administrator' : 'Manager'}`}
          </h2>
          <div className="space-y-4">
            {user?.role === 'admin' && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Acces Administrator</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Gestionare completă a ambelor spitale</li>
                  <li>• Creare și gestionare manageri</li>
                  <li>• Configurare sistem și setări globale</li>
                  <li>• Acces la toate funcționalitățile</li>
                </ul>
              </div>
            )}
            
            {user?.role === 'manager' && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2">Acces Manager - {user?.hospitalName}</h3>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Gestionare personal spital</li>
                  <li>• Acordare permisiuni generare gărzi</li>
                  <li>• Vizualizare și aprobare schimburi</li>
                  <li>• Generare programe pe departamente</li>
                </ul>
              </div>
            )}

            {isStaff && (
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-medium text-purple-900 mb-2">Acces Personal Medical</h3>
                <ul className="text-sm text-purple-800 space-y-1">
                  <li>• Rezervare gărzi preferate (max 3/lună)</li>
                  <li>• Vizualizare program personal</li>
                  <li>• Solicitare schimburi de gărzi</li>
                  {canGenerateShifts && <li>• Generare gărzi departament (permisiune specială)</li>}
                </ul>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default withAuth(UnifiedDashboard, {
  allowedRoles: ['admin', 'manager', 'staff'],
  redirectTo: '/'
})