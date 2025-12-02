'use client'

import { useState, useMemo } from 'react'
import { type User, type Shift, type SwapRequest } from '@/lib/supabase'
import { parseISODate } from '@/lib/dateUtils'

interface ReportsPanelProps {
  shifts: Shift[]
  users: User[]
  swapRequests: SwapRequest[]
  selectedDate: Date
  currentUser: User
}

export default function ReportsPanel({
  shifts,
  users,
  swapRequests,
  selectedDate,
  currentUser
}: ReportsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const month = selectedDate.getMonth()
  const year = selectedDate.getFullYear()

  // Calculate stats for current month
  const stats = useMemo(() => {
    const monthShifts = shifts.filter(s => {
      const d = parseISODate(s.shift_date)
      return d.getMonth() === month && d.getFullYear() === year
    })

    const totalShifts = monthShifts.length
    const filledShifts = monthShifts.filter(s => s.assigned_to && (s.status === 'assigned' || s.status === 'reserved')).length
    const availableShifts = monthShifts.filter(s => s.status === 'available').length

    const pendingSwaps = swapRequests.filter(sr => sr.status === 'pending').length
    const completedSwaps = swapRequests.filter(sr => sr.status === 'accepted').length

    // Staff shift counts
    const staffUsers = users.filter(u => u.role === 'STAFF')
    const staffShiftCounts = staffUsers.map(u => {
      const count = monthShifts.filter(s => s.assigned_to === u.id).length
      const maxShifts = u.max_shifts_per_month || 8
      return {
        id: u.id,
        name: u.name,
        department: u.department,
        count,
        maxShifts,
        percentage: Math.round((count / maxShifts) * 100)
      }
    }).sort((a, b) => b.count - a.count)

    // Fairness metrics
    const counts = staffShiftCounts.map(s => s.count)
    const avgShifts = counts.length > 0 ? counts.reduce((a, b) => a + b, 0) / counts.length : 0
    const variance = counts.length > 0
      ? counts.reduce((sum, c) => sum + Math.pow(c - avgShifts, 2), 0) / counts.length
      : 0
    const stdDev = Math.sqrt(variance)

    // Coverage by day of week
    const dayOfWeekCoverage = [0, 0, 0, 0, 0, 0, 0] // Sun - Sat
    const dayOfWeekTotal = [0, 0, 0, 0, 0, 0, 0]

    monthShifts.forEach(s => {
      const d = parseISODate(s.shift_date)
      const dayIndex = d.getDay()
      dayOfWeekTotal[dayIndex]++
      if (s.assigned_to) dayOfWeekCoverage[dayIndex]++
    })

    return {
      totalShifts,
      filledShifts,
      availableShifts,
      fillRate: totalShifts > 0 ? Math.round((filledShifts / totalShifts) * 100) : 0,
      pendingSwaps,
      completedSwaps,
      staffShiftCounts,
      avgShifts: avgShifts.toFixed(1),
      stdDev: stdDev.toFixed(2),
      dayOfWeekCoverage,
      dayOfWeekTotal,
      mostShifts: staffShiftCounts[0],
      leastShifts: staffShiftCounts[staffShiftCounts.length - 1]
    }
  }, [shifts, users, swapRequests, month, year])

  // Only show to managers and admins
  if (currentUser.role === 'STAFF') return null

  const dayNames = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm']

  return (
    <div className="card mb-6">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 -m-6 mb-0 hover:bg-gray-50 transition-colors rounded-t-xl"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h2 className="text-lg font-semibold">Rapoarte</h2>
        </div>
        <span className="text-gray-400 text-xl">
          {isExpanded ? '▲' : '▼'}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total ture"
              value={stats.totalShifts}
              icon="📅"
            />
            <StatCard
              label="Ocupate"
              value={`${stats.filledShifts} (${stats.fillRate}%)`}
              icon="✅"
              color={stats.fillRate >= 80 ? 'green' : stats.fillRate >= 50 ? 'yellow' : 'red'}
            />
            <StatCard
              label="Disponibile"
              value={stats.availableShifts}
              icon="🔓"
              color={stats.availableShifts > 5 ? 'yellow' : 'green'}
            />
            <StatCard
              label="Schimburi"
              value={`${stats.pendingSwaps} în așteptare`}
              icon="🔄"
            />
          </div>

          {/* Staff Distribution Chart */}
          <div>
            <h3 className="font-medium mb-3">Distribuție ture per angajat</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {stats.staffShiftCounts.map(staff => (
                <div key={staff.id} className="flex items-center gap-3">
                  <span className="w-32 text-sm truncate">{staff.name}</span>
                  <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        staff.percentage >= 100 ? 'bg-red-500' :
                        staff.percentage >= 75 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(staff.percentage, 100)}%` }}
                    />
                  </div>
                  <span className="w-16 text-sm text-right">
                    {staff.count}/{staff.maxShifts}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Fairness Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <span className="text-sm text-gray-600">Medie ture/angajat</span>
              <p className="text-xl font-semibold">{stats.avgShifts}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Deviație standard</span>
              <p className={`text-xl font-semibold ${
                parseFloat(stats.stdDev) > 2 ? 'text-red-600' :
                parseFloat(stats.stdDev) > 1 ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {stats.stdDev}
                {parseFloat(stats.stdDev) <= 1 && <span className="text-sm ml-1">echilibrat</span>}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Cel mai multe / puține</span>
              <p className="text-sm">
                <span className="font-medium">{stats.mostShifts?.name || '-'}</span>
                <span className="text-gray-500"> ({stats.mostShifts?.count || 0})</span>
                <span className="mx-2">/</span>
                <span className="font-medium">{stats.leastShifts?.name || '-'}</span>
                <span className="text-gray-500"> ({stats.leastShifts?.count || 0})</span>
              </p>
            </div>
          </div>

          {/* Coverage by Day of Week */}
          <div>
            <h3 className="font-medium mb-3">Acoperire pe zile</h3>
            <div className="grid grid-cols-7 gap-2">
              {dayNames.map((day, index) => {
                const total = stats.dayOfWeekTotal[index]
                const covered = stats.dayOfWeekCoverage[index]
                const rate = total > 0 ? Math.round((covered / total) * 100) : 0

                return (
                  <div key={day} className="text-center">
                    <div className="text-xs text-gray-500 mb-1">{day}</div>
                    <div
                      className={`h-12 rounded flex items-end justify-center ${
                        rate >= 80 ? 'bg-green-100' :
                        rate >= 50 ? 'bg-yellow-100' :
                        'bg-red-100'
                      }`}
                    >
                      <div
                        className={`w-full rounded-b ${
                          rate >= 80 ? 'bg-green-500' :
                          rate >= 50 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ height: `${rate}%` }}
                      />
                    </div>
                    <div className="text-xs mt-1">{rate}%</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  icon: string
  color?: 'green' | 'yellow' | 'red'
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const colorClasses = {
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    red: 'bg-red-50 border-red-200'
  }

  return (
    <div className={`p-4 rounded-lg border ${color ? colorClasses[color] : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  )
}
