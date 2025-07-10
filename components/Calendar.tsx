'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/Card'

interface Shift {
  id: string
  doctorId: string
  doctorName: string
  type: 'day' | 'night' | '24h'
  status: 'assigned' | 'open'
}

interface CalendarProps {
  year: number
  month: number
  shifts?: Record<string, Shift>
  onDayClick?: (date: string) => void
}

const DAYS = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du']
const MONTHS = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
]

export const Calendar: React.FC<CalendarProps> = ({
  year,
  month,
  shifts = {},
  onDayClick
}) => {
  const daysInMonth = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPadding = (firstDay.getDay() + 6) % 7 // Monday = 0
    const totalDays = lastDay.getDate()
    
    const days: (number | null)[] = []
    
    // Add padding for first week
    for (let i = 0; i < startPadding; i++) {
      days.push(null)
    }
    
    // Add all days of month
    for (let i = 1; i <= totalDays; i++) {
      days.push(i)
    }
    
    return days
  }, [year, month])

  const getShiftForDay = (day: number | null) => {
    if (!day) return null
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return shifts[dateStr]
  }

  const getDayIndicator = (day: number | null) => {
    if (!day) return null
    
    const shift = getShiftForDay(day)
    const isWeekend = new Date(year, month, day).getDay() % 6 === 0
    
    if (!shift) {
      return (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isWeekend ? 'bg-system-blue/10 text-system-blue' : 'bg-gray-100'
        }`}>
          <span className="text-sm">○</span>
        </div>
      )
    }
    
    return (
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
        isWeekend ? 'bg-system-blue text-white' : 'bg-system-green text-white'
      }`}>
        <span className="text-sm">●</span>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Month Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-label-primary">
          {MONTHS[month]} {year}
        </h2>
      </div>

      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {DAYS.map(day => (
          <div key={day} className="text-center text-sm font-medium text-label-secondary">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {daysInMonth.map((day, index) => {
          const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : ''
          const shift = getShiftForDay(day)
          const isWeekend = day && new Date(year, month, day).getDay() % 6 === 0
          
          return (
            <div
              key={index}
              className={`
                aspect-square rounded-ios p-2
                ${day ? 'bg-white hover:bg-gray-50 cursor-pointer transition-colors' : ''}
                ${isWeekend && day ? 'ring-1 ring-system-blue/20' : ''}
              `}
              onClick={() => day && onDayClick?.(dateStr)}
            >
              {day && (
                <div className="h-full flex flex-col items-center justify-between">
                  <span className={`text-sm ${isWeekend ? 'text-system-blue font-medium' : 'text-label-primary'}`}>
                    {day}
                  </span>
                  {getDayIndicator(day)}
                  {shift && (
                    <span className="text-xs text-label-secondary truncate max-w-full">
                      {shift.doctorName.split(' ')[1]}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gray-100"></div>
          <span className="text-label-secondary">Liber</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-system-green"></div>
          <span className="text-label-secondary">Atribuit</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-system-blue"></div>
          <span className="text-label-secondary">Weekend</span>
        </div>
      </div>
    </div>
  )
}