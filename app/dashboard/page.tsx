'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import withAuth, { AuthUser, WithAuthProps } from '@/components/withAuth'
import { logger } from '@/lib/logger'
import { hasPermission } from '@/lib/roleBasedAccess'
import { Calendar } from '@/components/Calendar'
import { useData } from '@/contexts/DataContext'

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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isStaff ? 'Programul Meu' : `Dashboard ${user?.role === 'admin' ? 'Administrator' : 'Manager'}`}
            </h1>
            <p className="text-gray-600">
              Bun venit, {user?.name}! • {user?.hospitalName}
              {isStaff && ' • LABORATOR'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isStaff && (
              <>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => router.push('/reservations')}
                >
                  Rezervări ({myReservations.length}/3)
                </Button>
                {canGenerateShifts && (
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => router.push('/generate-shifts')}
                  >
                    Generează Gărzi
                  </Button>
                )}
              </>
            )}
            {isManager && (
              <>
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
              </>
            )}
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