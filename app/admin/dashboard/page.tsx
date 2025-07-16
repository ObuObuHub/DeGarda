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
      const staffResponse = await fetch('/api/staff')
      const staffData = await staffResponse.json()
      
      // Fetch shifts stats
      const shiftsResponse = await fetch('/api/shifts')
      const shiftsData = await shiftsResponse.json()
      
      // Calculate stats
      const staffCount = staffData.success ? staffData.staff?.length || 0 : 0
      const todayShifts = calculateTodayShifts(shiftsData.shifts || [])
      const weekShifts = calculateWeekShifts(shiftsData.shifts || [])
      const monthShifts = calculateMonthShifts(shiftsData.shifts || [])
      
      setStats({
        staff: staffCount,
        todayShifts,
        weekShifts,
        monthShifts,
        pendingSwaps: 0, // TODO: Implement
        coverageGaps: 0, // TODO: Implement
        upcomingShifts: 0 // TODO: Implement
      })
      
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

  const quickActions: QuickAction[] = [
    {
      id: 'staff-passwords',
      title: 'Parole Personal',
      description: 'Gestionează parolele personalului',
      icon: '🔐',
      color: 'bg-blue-500',
      onClick: () => router.push('/admin/staff-passwords'),
      roles: ['admin', 'manager']
    },
    {
      id: 'shift-permissions',
      title: 'Permisiuni Gărzi',
      description: 'Acordă permisiuni de generare gărzi',
      icon: '⚙️',
      color: 'bg-green-500',
      onClick: () => router.push('/admin/shift-permissions'),
      roles: ['admin', 'manager']
    },
    {
      id: 'staff-management',
      title: 'Gestionare Personal',
      description: 'Adaugă și gestionează personalul',
      icon: '👥',
      color: 'bg-purple-500',
      onClick: () => router.push('/admin/staff'),
      roles: ['admin', 'manager']
    },
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
      id: 'hospitals',
      title: 'Gestionare Spitale',
      description: 'Configurează spitalele',
      icon: '🏥',
      color: 'bg-red-500',
      onClick: () => router.push('/admin/hospitals'),
      roles: ['admin']
    },
    {
      id: 'settings',
      title: 'Configurări',
      description: 'Setări sistem',
      icon: '⚙️',
      color: 'bg-gray-500',
      onClick: () => router.push('/admin/settings'),
      roles: ['admin']
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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