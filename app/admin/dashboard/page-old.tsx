'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useHospital } from '@/contexts/HospitalContext'
import { useData } from '@/contexts/DataContext'
import { getClientUserRole } from '@/lib/clientAuth'
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

export default function AdminDashboard() {
  const router = useRouter()
  const { selectedHospital, selectedHospitalId } = useHospital()
  const { shifts, staff, isLoading } = useData()
  const [userRole, setUserRole] = useState<string | null>(null)
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
  const [swaps, setSwaps] = useState<any[]>([])

  useEffect(() => {
    const role = getClientUserRole()
    setUserRole(role)
  }, [])

  useEffect(() => {
    if (selectedHospitalId && shifts && staff) {
      calculateStats()
      loadPendingSwaps()
    }
  }, [shifts, staff, selectedHospitalId])

  const calculateStats = () => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    // Filter shifts for this hospital
    const hospitalShifts = Object.entries(shifts).filter(([date, shift]) => 
      shift.hospitalId?.toString() === selectedHospitalId
    )

    const todayShifts = hospitalShifts.filter(([date]) => date === todayStr).length
    
    const weekShifts = hospitalShifts.filter(([date]) => {
      const shiftDate = new Date(date)
      return shiftDate >= weekStart && shiftDate <= today
    }).length

    const monthShifts = hospitalShifts.filter(([date]) => {
      const shiftDate = new Date(date)
      return shiftDate >= monthStart
    }).length

    // Calculate coverage gaps (open shifts)
    const coverageGaps = hospitalShifts.filter(([date, shift]) => 
      shift.status === 'open' || !shift.doctorId
    ).length

    // Get upcoming shifts (next 7 days)
    const upcoming = hospitalShifts
      .filter(([date, shift]) => {
        const shiftDate = new Date(date)
        const nextWeek = new Date(today)
        nextWeek.setDate(today.getDate() + 7)
        return shiftDate > today && shiftDate <= nextWeek && shift.doctorId
      })
      .map(([date, shift]) => ({
        date,
        doctorName: shift.doctorName || 'Unknown',
        department: shift.department || 'General',
        type: shift.type || '24h'
      }))
      .slice(0, 5)

    setUpcomingShifts(upcoming)
    setStats({
      staff: staff.filter(s => s.hospitalId?.toString() === selectedHospitalId).length,
      todayShifts,
      weekShifts,
      monthShifts,
      pendingSwaps: swaps.length,
      coverageGaps,
      upcomingShifts: upcoming.length
    })
  }

  const loadPendingSwaps = async () => {
    if (!selectedHospitalId || userRole !== 'manager') return
    
    try {
      const response = await fetch(`/api/swaps?status=pending&hospitalId=${selectedHospitalId}`)
      const data = await response.json()
      
      if (data.success) {
        setSwaps(data.swaps || [])
      }
    } catch (error) {
      logger.error('Dashboard', 'Failed to load pending swaps', error)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const quickActions: QuickAction[] = [
    {
      id: 'schedule',
      title: 'Program Gărzi',
      description: 'Vezi și gestionează programul',
      icon: '📅',
      color: 'blue',
      onClick: () => router.push('/admin/schedule'),
      roles: ['staff', 'manager']
    },
    {
      id: 'management', 
      title: 'Management',
      description: 'Personal și coduri de acces',
      icon: '👥',
      color: 'purple',
      onClick: () => router.push('/admin/management'),
      roles: ['staff', 'manager']
    },
    {
      id: 'swaps',
      title: 'Cereri Schimb',
      description: 'Aprobă sau respinge schimburi',
      icon: '🔄',
      color: 'orange', 
      onClick: () => router.push('/admin/schedule?tab=swaps'),
      roles: ['manager']
    }
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-system-blue/10 text-system-blue border-system-blue/20 hover:border-system-blue/40',
      purple: 'bg-system-purple/10 text-system-purple border-system-purple/20 hover:border-system-purple/40',
      green: 'bg-system-green/10 text-system-green border-system-green/20 hover:border-system-green/40',
      orange: 'bg-system-orange/10 text-system-orange border-system-orange/20 hover:border-system-orange/40'
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-label-secondary">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-label-primary">Dashboard</h1>
            {selectedHospital && (
              <p className="text-sm text-label-secondary mt-1">
                {selectedHospital.name} • {selectedHospital.city}
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-bold text-system-blue">{stats.staff}</div>
            <div className="text-xs text-label-secondary">Personal</div>
          </Card>
          
          <Card className="p-4">
            <div className="text-2xl font-bold text-system-green">{stats.todayShifts}</div>
            <div className="text-xs text-label-secondary">Gărzi Azi</div>
          </Card>
          
          <Card className="p-4">
            <div className="text-2xl font-bold text-system-purple">{stats.weekShifts}</div>
            <div className="text-xs text-label-secondary">Săptămâna</div>
          </Card>
          
          <Card className="p-4">
            <div className="text-2xl font-bold text-label-primary">{stats.monthShifts}</div>
            <div className="text-xs text-label-secondary">Luna</div>
          </Card>
          
          {userRole === 'manager' && (
            <Card className="p-4">
              <div className="text-2xl font-bold text-system-orange">{stats.pendingSwaps}</div>
              <div className="text-xs text-label-secondary">Schimburi</div>
            </Card>
          )}
          
          <Card className="p-4">
            <div className="text-2xl font-bold text-system-red">{stats.coverageGaps}</div>
            <div className="text-xs text-label-secondary">Neacoperite</div>
          </Card>
          
          <Card className="p-4">
            <div className="text-2xl font-bold text-system-green">{stats.upcomingShifts}</div>
            <div className="text-xs text-label-secondary">Următoare</div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Acțiuni Rapide</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions
              .filter(action => action.roles.includes(userRole || 'staff'))
              .map((action) => (
                <Card 
                  key={action.id}
                  hoverable 
                  onClick={action.onClick}
                  className={`p-6 border-2 transition-all ${getColorClasses(action.color)}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{action.icon}</div>
                    <div>
                      <h3 className="font-semibold">{action.title}</h3>
                      <p className="text-sm opacity-80">{action.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Upcoming Shifts */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <span>📅</span>
              Gărzi Următoare (7 zile)
            </h3>
            {upcomingShifts.length === 0 ? (
              <p className="text-label-secondary text-sm py-4">Nu sunt gărzi programate</p>
            ) : (
              <div className="space-y-3">
                {upcomingShifts.map((shift, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-background-secondary rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{shift.doctorName}</div>
                      <div className="text-xs text-label-secondary">{shift.department}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {new Date(shift.date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
                      </div>
                      <div className="text-xs text-label-secondary">{shift.type}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Manager: Pending Swaps */}
          {userRole === 'manager' && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <span>🔄</span>
                Cereri de Schimb în Așteptare
              </h3>
              {swaps.length === 0 ? (
                <p className="text-label-secondary text-sm py-4">Nu există cereri în așteptare</p>
              ) : (
                <div className="space-y-3">
                  {swaps.slice(0, 3).map((swap) => (
                    <div key={swap.id} className="p-3 bg-background-secondary rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-sm">{swap.fromStaffName}</div>
                          <div className="text-xs text-label-secondary">
                            {new Date(swap.shiftDate).toLocaleDateString('ro-RO')}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => router.push('/admin/schedule?tab=swaps')}
                        >
                          Revizuiește
                        </Button>
                      </div>
                    </div>
                  ))}
                  {swaps.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push('/admin/schedule?tab=swaps')}
                      className="w-full"
                    >
                      Vezi toate ({swaps.length})
                    </Button>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* Staff: Coverage Status */}
          {userRole === 'staff' && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <span>📊</span>
                Starea Acoperirii
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Gărzi acoperite luna aceasta</span>
                  <span className="font-semibold">
                    {stats.monthShifts - stats.coverageGaps}/{stats.monthShifts}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-system-green h-2 rounded-full" 
                    style={{ 
                      width: `${stats.monthShifts ? ((stats.monthShifts - stats.coverageGaps) / stats.monthShifts) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                {stats.coverageGaps > 0 && (
                  <div className="text-sm text-system-orange">
                    {stats.coverageGaps} gărzi necesită acoperire
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}