'use client'

import { type Shift, type User } from '@/lib/supabase'
import { parseISODate } from '@/lib/dateUtils'

interface MyShiftsCardProps {
  shifts: Shift[]
  currentUser: User
  selectedDate: Date
  onDateChange: (date: Date) => void
}

export default function MyShiftsCard({ shifts, currentUser, selectedDate, onDateChange }: MyShiftsCardProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get user's shifts sorted by date
  const userShifts = shifts
    .filter(s => s.assigned_to === currentUser.id && (s.status === 'assigned' || s.status === 'reserved'))
    .map(s => ({
      ...s,
      dateObj: parseISODate(s.shift_date)
    }))
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())

  // Split into upcoming and past
  const upcomingShifts = userShifts.filter(s => s.dateObj >= today)
  const nextShift = upcomingShifts[0]

  // Count this month's shifts
  const thisMonthShifts = userShifts.filter(s =>
    s.dateObj.getMonth() === selectedDate.getMonth() &&
    s.dateObj.getFullYear() === selectedDate.getFullYear()
  )

  const formatDate = (date: Date): string => {
    const dayNames = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă']
    const monthNames = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec']
    return `${dayNames[date.getDay()]}, ${date.getDate()} ${monthNames[date.getMonth()]}`
  }

  const formatShortDate = (date: Date): string => {
    const dayNames = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm']
    return `${dayNames[date.getDay()]} ${date.getDate()}`
  }

  const getDaysUntil = (date: Date): string => {
    const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) return 'Astăzi'
    if (diff === 1) return 'Mâine'
    if (diff === 2) return 'Poimâine'
    return `în ${diff} zile`
  }

  const isToday = (date: Date): boolean => date.toDateString() === today.toDateString()
  const isTomorrow = (date: Date): boolean => {
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return date.toDateString() === tomorrow.toDateString()
  }

  const goToShiftDate = (date: Date): void => {
    onDateChange(new Date(date.getFullYear(), date.getMonth(), 1))
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Turele Tale</h3>
            <p className="text-blue-100 text-sm mt-0.5">
              {thisMonthShifts.length} {thisMonthShifts.length === 1 ? 'tură' : 'ture'} luna aceasta
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{upcomingShifts.length}</div>
            <div className="text-blue-100 text-xs">viitoare</div>
          </div>
        </div>
      </div>

      {/* Next Shift Highlight */}
      {nextShift && (
        <div
          className={`px-4 py-3 border-b cursor-pointer transition-colors hover:bg-gray-50 ${
            isToday(nextShift.dateObj)
              ? 'bg-yellow-50 border-yellow-200'
              : isTomorrow(nextShift.dateObj)
                ? 'bg-orange-50 border-orange-200'
                : 'bg-blue-50 border-blue-100'
          }`}
          onClick={() => goToShiftDate(nextShift.dateObj)}
        >
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isToday(nextShift.dateObj)
                ? 'bg-yellow-200 text-yellow-800'
                : isTomorrow(nextShift.dateObj)
                  ? 'bg-orange-200 text-orange-800'
                  : 'bg-blue-200 text-blue-800'
            }`}>
              <span className="text-xl">
                {isToday(nextShift.dateObj) ? '!' : isTomorrow(nextShift.dateObj) ? '!!' : nextShift.dateObj.getDate()}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isToday(nextShift.dateObj)
                    ? 'bg-yellow-500 text-white'
                    : isTomorrow(nextShift.dateObj)
                      ? 'bg-orange-500 text-white'
                      : 'bg-blue-500 text-white'
                }`}>
                  {getDaysUntil(nextShift.dateObj)}
                </span>
                {nextShift.status === 'reserved' && (
                  <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
                    Rezervat
                  </span>
                )}
              </div>
              <p className="font-medium text-gray-900 mt-1">{formatDate(nextShift.dateObj)}</p>
              <p className="text-sm text-gray-600">{nextShift.department}</p>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      )}

      {/* Upcoming Shifts List */}
      <div className="divide-y max-h-64 overflow-y-auto">
        {upcomingShifts.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
              <span className="text-2xl">📅</span>
            </div>
            <p className="text-gray-600 font-medium">Nicio tură programată</p>
            <p className="text-sm text-gray-400 mt-1">
              Rezervă o tură din calendar sau așteaptă să fii programat
            </p>
          </div>
        ) : (
          upcomingShifts.slice(1, 6).map((shift) => (
            <div
              key={shift.id}
              className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => goToShiftDate(shift.dateObj)}
            >
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 font-medium">
                {shift.dateObj.getDate()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {formatShortDate(shift.dateObj)}
                </p>
                <p className="text-xs text-gray-500 truncate">{shift.department}</p>
              </div>
              {shift.status === 'reserved' && (
                <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full flex-shrink-0">
                  R
                </span>
              )}
              <span className="text-xs text-gray-400 flex-shrink-0">
                {getDaysUntil(shift.dateObj)}
              </span>
            </div>
          ))
        )}

        {upcomingShifts.length > 6 && (
          <div className="px-4 py-2 text-center text-xs text-gray-500 bg-gray-50">
            + {upcomingShifts.length - 6} alte ture
          </div>
        )}
      </div>
    </div>
  )
}
