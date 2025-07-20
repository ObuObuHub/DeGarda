'use client'

import { useState, useMemo, memo, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Shift } from '@/types'

interface CalendarProps {
  year: number
  month: number
  shifts?: Record<string, Shift>
  onDayClick?: (date: string) => void
  onSwapRequest?: (date: string, shift: Shift) => void
  doctors?: Array<{ id: string; name: string; department?: string }>
}

const DAYS = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du']
const MONTHS = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
]

const CalendarComponent: React.FC<CalendarProps> = ({
  year,
  month,
  shifts = {},
  onDayClick,
  onSwapRequest,
  doctors = []
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

  const getShiftForDay = useCallback((day: number | null) => {
    if (!day) return null
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return shifts[dateStr]
  }, [year, month, shifts])

  const getDayIndicator = useCallback((day: number | null) => {
    if (!day) return null
    
    const shift = getShiftForDay(day)
    const isWeekend = new Date(year, month, day).getDay() % 6 === 0
    
    if (!shift) {
      return (
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-2xl flex items-center justify-center transition-all duration-200 ${
          isWeekend ? 'bg-gradient-to-br from-system-blue/10 to-system-blue/5 border border-system-blue/20' : 'bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200'
        }`}>
          <span className="text-sm sm:text-lg">➕</span>
        </div>
      )
    }
    
    if (shift.status === 'reserved') {
      return (
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-2xl flex items-center justify-center bg-gradient-to-br from-system-orange to-system-orange/80 text-white shadow-sm">
          <span className="text-xs sm:text-sm">🔒</span>
        </div>
      )
    }
    
    return (
      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-2xl flex items-center justify-center shadow-sm ${
        isWeekend ? 'bg-gradient-to-br from-system-blue to-system-blue/80 text-white' : 'bg-gradient-to-br from-system-green to-system-green/80 text-white'
      }`}>
        <span className="text-xs sm:text-sm">✓</span>
      </div>
    )
  }, [getShiftForDay, year, month])

  return (
    <div className="w-full">
      {/* Month Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-label-primary">
          {MONTHS[month]} {year}
        </h2>
      </div>

      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
        {DAYS.map(day => (
          <div key={day} className="text-center text-xs sm:text-sm font-medium text-label-secondary">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {daysInMonth.map((day, index) => {
          const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : ''
          const shift = getShiftForDay(day)
          const isWeekend = day && new Date(year, month, day).getDay() % 6 === 0
          const today = new Date()
          const isToday = day && year === today.getFullYear() && month === today.getMonth() && day === today.getDate()
          
          return (
            <div
              key={day ? `${year}-${month}-${day}` : `empty-${index}`}
              className={`
                aspect-square rounded-md sm:rounded-ios p-1 sm:p-2 relative overflow-hidden
                ${day ? 'bg-white hover:shadow-md cursor-pointer transition-all duration-200 transform hover:scale-[1.02]' : ''}
                ${isWeekend && day ? 'bg-system-blue/5' : ''}
                ${isToday ? 'ring-1 sm:ring-2 ring-system-blue shadow-ios' : ''}
                ${shift ? 'border border-gray-100' : ''}
              `}
              onClick={() => {
                if (!day) return
                if (shift && onSwapRequest) {
                  onSwapRequest(dateStr, shift)
                } else if (onDayClick) {
                  onDayClick(dateStr)
                }
              }}
            >
              {isToday && (
                <div className="absolute top-0 left-0 w-full h-0.5 sm:h-1 bg-system-blue"></div>
              )}
              {day && (
                <div className="h-full flex flex-col items-center justify-between">
                  <span className={`text-xs sm:text-sm font-medium ${isToday ? 'text-system-blue' : isWeekend ? 'text-system-blue' : 'text-label-primary'}`}>
                    {day}
                  </span>
                  <div className="scale-75 sm:scale-100">
                    {getDayIndicator(day)}
                  </div>
                  {shift && (
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] sm:text-xs text-label-secondary truncate max-w-full font-medium">
                        {shift.status === 'reserved' 
                          ? shift.reservedByName?.split(' ')[1] || shift.reservedByName || ''
                          : shift.doctorName?.split(' ')[1] || shift.doctorName || ''}
                      </span>
                      {shift.doctorId && doctors.length > 0 && (
                        <span className="text-[8px] sm:text-[10px] text-label-tertiary">
                          {doctors.find(d => d.id === shift.doctorId?.toString())?.department || ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 bg-gray-50 rounded-ios-lg p-4">
        <h3 className="text-sm font-medium text-label-primary mb-3">Legendă</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200 flex items-center justify-center">
              <span className="text-xs">➕</span>
            </div>
            <span className="text-sm text-label-secondary">Liber</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-system-green to-system-green/80 flex items-center justify-center text-white">
              <span className="text-xs">✓</span>
            </div>
            <span className="text-sm text-label-secondary">Atribuit</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-system-orange to-system-orange/80 flex items-center justify-center text-white">
              <span className="text-xs">🔒</span>
            </div>
            <span className="text-sm text-label-secondary">Rezervat</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-system-blue to-system-blue/80 flex items-center justify-center text-white">
              <span className="text-xs">✓</span>
            </div>
            <span className="text-sm text-label-secondary">Weekend</span>
          </div>
        </div>
        <p className="text-xs text-label-tertiary mt-3 italic">
          💡 Click pe o zi pentru a gestiona garda
        </p>
      </div>
    </div>
  )
}

// Memoize the Calendar to prevent unnecessary re-renders
export const Calendar = memo(CalendarComponent)