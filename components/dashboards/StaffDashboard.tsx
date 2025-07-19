'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Calendar } from '@/components/Calendar'
import { useShifts } from '@/contexts/ShiftsContext'
import { AuthUser } from '@/components/withAuth'
import { logger } from '@/lib/logger'
import { StaffStats } from '@/components/staff/StaffStats'
import { QuickReserve } from '@/components/staff/QuickReserve'
import { MyReservations } from '@/components/staff/MyReservations'
import { MySwaps } from '@/components/staff/MySwaps'

interface StaffStats {
  myReservations: number
  upcomingShifts: number
  todayShifts: number
  weekShifts: number
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

interface StaffDashboardProps {
  user: AuthUser
  onLogout: () => void
}

export function StaffDashboard({ user, onLogout }: StaffDashboardProps) {
  const router = useRouter()
  const { shifts, isLoading: shiftsLoading, loadShifts } = useShifts()
  
  const [stats, setStats] = useState<StaffStats>({
    myReservations: 0,
    upcomingShifts: 0,
    todayShifts: 0,
    weekShifts: 0
  })
  
  const [myReservations, setMyReservations] = useState<Reservation[]>([])
  const [mySwaps, setMySwaps] = useState<SwapRequest[]>([])
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  
  // Calendar state
  const currentDate = new Date()
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth())
  const [viewYear, setViewYear] = useState(currentDate.getFullYear())

  useEffect(() => {
    if (user?.hospitalId) {
      loadShifts(viewYear, viewMonth, user.hospitalId)
      loadMyReservations()
      loadMySwaps()
    }
  }, [viewYear, viewMonth, user])

  useEffect(() => {
    fetchStaffStats()
  }, [shifts, myReservations])

  const fetchStaffStats = () => {
    try {
      setIsLoadingStats(true)
      
      // Calculate stats from existing data
      const today = new Date().toISOString().split('T')[0]
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      
      const todayShifts = shifts.filter(shift => shift.date === today).length
      const weekShifts = shifts.filter(shift => {
        const shiftDate = new Date(shift.date)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        return shiftDate >= weekStart && shiftDate <= weekEnd
      }).length
      
      const upcomingShifts = shifts.filter(shift => {
        const shiftDate = new Date(shift.date)
        return shiftDate > new Date()
      }).length

      setStats({
        myReservations: myReservations.length,
        upcomingShifts,
        todayShifts,
        weekShifts
      })
    } catch (error) {
      logger.error('StaffDashboard', 'Failed to fetch stats', error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  const loadMyReservations = async () => {
    try {
      const response = await fetch('/api/reservations', {
        credentials: 'include'
      })
      const data = await response.json()
      if (data.success) {
        setMyReservations(data.reservations || [])
      }
    } catch (error) {
      logger.error('StaffDashboard', 'Failed to load reservations', error)
    }
  }

  const loadMySwaps = async () => {
    try {
      const response = await fetch('/api/swaps', {
        credentials: 'include'
      })
      const data = await response.json()
      if (data.success) {
        setMySwaps(data.swaps || [])
      }
    } catch (error) {
      logger.error('StaffDashboard', 'Failed to load swaps', error)
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

  const refreshData = () => {
    loadMyReservations()
    loadMySwaps()
    if (user?.hospitalId) {
      loadShifts(viewYear, viewMonth, user.hospitalId)
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen">
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
            <Button variant="ghost" size="sm" onClick={onLogout}>
              Ieși
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Calendar */}
          <div className="lg:col-span-3">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Calendarul Meu</h2>
                  <p className="text-sm text-gray-600">Programul de gărzi și rezervări</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
                    ←
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setViewMonth(currentDate.getMonth())
                      setViewYear(currentDate.getFullYear())
                    }}
                  >
                    Azi
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleNextMonth}>
                    →
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

          {/* Staff Sidebar */}
          <div className="space-y-4">
            {/* Quick Stats */}
            <StaffStats stats={stats} isLoading={isLoadingStats} />

            {/* Quick Reserve */}
            <QuickReserve onReservationComplete={refreshData} />

            {/* My Reservations */}
            <MyReservations 
              reservations={myReservations} 
              onViewAll={() => router.push('/reservations')} 
            />

            {/* Recent Swaps */}
            <MySwaps swaps={mySwaps} />
          </div>
        </div>
      </div>
    </div>
  )
}