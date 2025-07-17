'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import withAuth, { AuthUser, WithAuthProps } from '@/components/withAuth'
import { logger } from '@/lib/logger'

interface DashboardStats {
  staff: number
  todayShifts: number
  weekShifts: number
  monthShifts: number
  pendingSwaps: number
  coverageGaps: number
  upcomingShifts: number
}

interface QuickAction {
  id: string
  title: string
  description: string
  icon: string
  color: string
  onClick: () => void
  roles: string[]
}

interface UpcomingShift {
  date: string
  doctorName: string
  department: string
  type: string
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

interface AdminDashboardProps extends WithAuthProps {
  // Additional props if needed
}

function AdminDashboard({ user, isLoading, error }: AdminDashboardProps) {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    staff: 0,
    todayShifts: 0,
    weekShifts: 0,
    monthShifts: 0,
    pendingSwaps: 0,
    coverageGaps: 0,
    upcomingShifts: 0
  })
  const [upcomingShifts, setUpcomingShifts] = useState<UpcomingShift[]>([])
  const [pendingSwaps, setPendingSwaps] = useState<SwapRequest[]>([])
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  useEffect(() => {
    if (user) {
      fetchDashboardStats()
    }
  }, [user])

  const fetchDashboardStats = async () => {
    try {
      setIsLoadingStats(true)
      
      // Fetch staff count
      const staffResponse = await fetch('/api/staff', {
        credentials: 'include'
      })
      const staffData = await staffResponse.json()
      
      // Fetch shifts stats
      const shiftsResponse = await fetch('/api/shifts', {
        credentials: 'include'
      })
      const shiftsData = await shiftsResponse.json()
      
      // Fetch pending swaps
      const swapsResponse = await fetch(`/api/swaps?status=pending&hospitalId=${user?.hospitalId}`, {
        credentials: 'include'
      })
      const swapsData = await swapsResponse.json()
      
      // Calculate stats
      const staffCount = staffData.success ? staffData.staff?.length || 0 : 0
      const todayShifts = calculateTodayShifts(shiftsData.shifts || [])
      const weekShifts = calculateWeekShifts(shiftsData.shifts || [])
      const monthShifts = calculateMonthShifts(shiftsData.shifts || [])
      const pendingSwapsCount = swapsData.success ? swapsData.swaps?.length || 0 : 0
      
      setStats({
        staff: staffCount,
        todayShifts,
        weekShifts,
        monthShifts,
        pendingSwaps: pendingSwapsCount,
        coverageGaps: 0, // TODO: Implement
        upcomingShifts: 0 // TODO: Implement
      })
      
      // Set pending swaps for approval interface
      if (swapsData.success && swapsData.swaps) {
        setPendingSwaps(swapsData.swaps)
      }
      
    } catch (error) {
      logger.error('AdminDashboard', 'Failed to fetch dashboard stats', error)
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
        // Refresh dashboard data
        fetchDashboardStats()
        logger.info('AdminDashboard', `Swap ${action}`, { swapId, userId: user.userId })
      } else {
        logger.error('AdminDashboard', `Failed to ${action} swap`, { error: data.error, swapId })
      }
    } catch (error) {
      logger.error('AdminDashboard', `Failed to ${action} swap`, error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const quickActions: QuickAction[] = [
    {
      id: 'schedule-management',
      title: 'Program Gărzi',
      description: 'Vizualizează și gestionează programul',
      icon: '📅',
      color: 'bg-yellow-500',
      onClick: () => router.push('/admin/schedule'),
      roles: ['admin', 'manager']
    },
    {
      id: 'staff-management',
      title: 'Gestionare Personal',
      description: 'Personal, permisiuni și configurări',
      icon: '👥',
      color: 'bg-purple-500',
      onClick: () => router.push('/admin/management'),
      roles: ['admin', 'manager']
    },
    {
      id: 'reservations',
      title: 'Vezi Rezervări',
      description: 'Rezervările personalului pentru gărzi',
      icon: '📝',
      color: 'bg-blue-500',
      onClick: () => fetchDashboardStats(), // Refresh to show latest data
      roles: ['admin', 'manager']
    }
  ]

  const handleLogout = async () => {
    // Clear HTTP-only cookie via logout API
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      // Continue with logout even if API call fails
    }
    
    // Clear any remaining localStorage/sessionStorage
    localStorage.clear()
    sessionStorage.clear()
    router.push('/')
  }

  const filteredActions = quickActions.filter(action => 
    action.roles.includes(user?.role || '')
  )

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
              Bun venit, {user?.name}! {user?.role === 'admin' ? 'Acces complet sistem' : `${user?.hospitalName}`}
            </p>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            Ieși
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
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

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Gărzi Luna</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoadingStats ? '...' : stats.monthShifts}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📈</span>
              </div>
            </div>
          </Card>

          {(user?.role === 'manager' || user?.role === 'admin') && (
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
        </div>

        {/* Quick Actions */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Acțiuni Rapide
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredActions.map((action) => (
              <button
                key={action.id}
                onClick={action.onClick}
                className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center`}>
                    <span className="text-white text-lg">{action.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{action.title}</h3>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Pending Approvals - Only for Managers and Admins */}
        {(user?.role === 'manager' || user?.role === 'admin') && pendingSwaps.length > 0 && (
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
              {pendingSwaps.slice(0, 5).map((swap) => (
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
              
              {pendingSwaps.length > 5 && (
                <div className="text-center pt-4">
                  <Button
                    variant="secondary"
                    onClick={() => router.push('/admin/schedule')}
                  >
                    Vezi toate ({pendingSwaps.length - 5} mai multe)
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Role-specific Information */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Informații {user?.role === 'admin' ? 'Administrator' : 'Manager'}
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
                  <li>• Gestionare parole personal</li>
                  <li>• Vizualizare și aprobare schimburi</li>
                </ul>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default withAuth(AdminDashboard, {
  allowedRoles: ['admin', 'manager'],
  redirectTo: '/'
})