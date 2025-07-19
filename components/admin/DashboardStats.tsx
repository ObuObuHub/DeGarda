'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
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

interface DashboardStatsProps {
  user: any
}

export function DashboardStats({ user }: DashboardStatsProps) {
  const [stats, setStats] = useState<DashboardStats>({
    staff: 0,
    todayShifts: 0,
    weekShifts: 0,
    monthShifts: 0,
    pendingSwaps: 0,
    coverageGaps: 0,
    upcomingShifts: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user])

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      
      // Parallel API calls for better performance
      const [staffResponse, shiftsResponse, swapsResponse] = await Promise.all([
        fetch('/api/staff', { credentials: 'include' }),
        fetch('/api/shifts', { credentials: 'include' }),
        fetch(`/api/swaps?status=pending&hospitalId=${user?.hospitalId}`, { credentials: 'include' })
      ])

      const [staffData, shiftsData, swapsData] = await Promise.all([
        staffResponse.json(),
        shiftsResponse.json(),
        swapsResponse.json()
      ])
      
      // Calculate time-based stats
      const shifts = shiftsData.shifts || []
      const staffCount = staffData.success ? staffData.staff?.length || 0 : 0
      const todayShifts = calculateTodayShifts(shifts)
      const weekShifts = calculateWeekShifts(shifts)
      const monthShifts = calculateMonthShifts(shifts)
      const pendingSwapsCount = swapsData.success ? swapsData.swaps?.length || 0 : 0
      
      setStats({
        staff: staffCount,
        todayShifts,
        weekShifts,
        monthShifts,
        pendingSwaps: pendingSwapsCount,
        coverageGaps: 0, // TODO: Implement coverage gap detection
        upcomingShifts: 0 // TODO: Implement upcoming shift calculation
      })
      
    } catch (error) {
      logger.error('DashboardStats', 'Failed to fetch stats', error)
    } finally {
      setIsLoading(false)
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

  const statCards = [
    {
      label: 'Personal Total',
      value: stats.staff,
      icon: '👥',
      bgColor: 'bg-blue-100'
    },
    {
      label: 'Gărzi Azi', 
      value: stats.todayShifts,
      icon: '📅',
      bgColor: 'bg-green-100'
    },
    {
      label: 'Gărzi Săptămâna',
      value: stats.weekShifts,
      icon: '📊',
      bgColor: 'bg-yellow-100'
    },
    {
      label: 'Gărzi Luna',
      value: stats.monthShifts,
      icon: '📈',
      bgColor: 'bg-purple-100'
    }
  ]

  // Add swap requests card for managers/admins
  if (user?.role === 'manager' || user?.role === 'admin') {
    statCards.push({
      label: 'Cereri Schimb',
      value: stats.pendingSwaps,
      icon: stats.pendingSwaps > 0 ? '⏳' : '✅',
      bgColor: stats.pendingSwaps > 0 ? 'bg-orange-100' : 'bg-gray-100'
    })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      {statCards.map((stat, index) => (
        <Card key={index} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? '...' : stat.value}
              </p>
            </div>
            <div className={`w-12 h-12 ${stat.bgColor} rounded-full flex items-center justify-center`}>
              <span className="text-2xl">{stat.icon}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}