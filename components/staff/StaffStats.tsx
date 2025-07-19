'use client'

import { Card } from '@/components/ui/Card'

interface StaffStats {
  myReservations: number
  upcomingShifts: number
  todayShifts: number
  weekShifts: number
}

interface StaffStatsProps {
  stats: StaffStats
  isLoading: boolean
}

export function StaffStats({ stats, isLoading }: StaffStatsProps) {
  const statItems = [
    {
      label: 'Rezervări Active',
      value: stats.myReservations,
      icon: '📝',
      color: 'text-blue-600'
    },
    {
      label: 'Gărzi Viitoare',
      value: stats.upcomingShifts,
      icon: '📅',
      color: 'text-green-600'
    },
    {
      label: 'Gărzi Azi',
      value: stats.todayShifts,
      icon: '⏰',
      color: 'text-orange-600'
    },
    {
      label: 'Săptămâna',
      value: stats.weekShifts,
      icon: '📊',
      color: 'text-purple-600'
    }
  ]

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Statistici Rapide</h3>
      <div className="space-y-3">
        {statItems.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm text-gray-600">{item.label}</span>
            </div>
            <span className={`font-bold ${item.color}`}>
              {isLoading ? '...' : item.value}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}