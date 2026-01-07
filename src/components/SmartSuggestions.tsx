'use client'

import { useMemo } from 'react'
import { type Shift, type UnavailableDate, type User } from '@/lib/supabase'
import { parseISODate, formatDateForDB } from '@/lib/dateUtils'

interface SmartSuggestionsProps {
  shifts: Shift[]
  unavailableDates: UnavailableDate[]
  currentUser: User
  selectedDate: Date
  onSelectDate: (date: Date) => void
}

interface SuggestedDay {
  date: Date
  dateStr: string
  reason: string
  score: number // Higher is better
  type: 'available' | 'preferred' | 'swap_opportunity'
}

export default function SmartSuggestions({
  shifts,
  unavailableDates,
  currentUser,
  selectedDate,
  onSelectDate
}: SmartSuggestionsProps) {
  const suggestions = useMemo(() => {
    const month = selectedDate.getMonth()
    const year = selectedDate.getFullYear()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get user's current shifts this month
    const userShifts = shifts.filter(s => {
      const d = parseISODate(s.shift_date)
      return s.assigned_to === currentUser.id &&
             d.getMonth() === month &&
             d.getFullYear() === year
    })

    // Get user's unavailable dates
    const userUnavailable = new Set(
      unavailableDates
        .filter(ud => ud.user_id === currentUser.id && ud.preference_type !== 'preferred')
        .map(ud => ud.unavailable_date)
    )

    // Get user's preferred dates
    const userPreferred = new Set(
      unavailableDates
        .filter(ud => ud.user_id === currentUser.id && ud.preference_type === 'preferred')
        .map(ud => ud.unavailable_date)
    )

    // Get shifts user is assigned to (for back-to-back check)
    const userShiftDates = new Set(userShifts.map(s => s.shift_date))

    // Find available shifts in user's department
    const availableShifts = shifts.filter(s =>
      s.status === 'available' &&
      s.department === currentUser.department &&
      parseISODate(s.shift_date) >= today
    )

    const suggestions: SuggestedDay[] = []

    // Suggest available shifts
    availableShifts.forEach(shift => {
      const date = parseISODate(shift.shift_date)
      const dateStr = shift.shift_date

      // Skip if user already has shift this day or is unavailable
      if (userShiftDates.has(dateStr) || userUnavailable.has(dateStr)) return

      // Check for back-to-back
      const dayBefore = new Date(date)
      dayBefore.setDate(dayBefore.getDate() - 1)
      const dayAfter = new Date(date)
      dayAfter.setDate(dayAfter.getDate() + 1)

      const hasBackToBack = userShiftDates.has(formatDateForDB(dayBefore)) ||
                            userShiftDates.has(formatDateForDB(dayAfter))

      let score = 50 // Base score
      let reason = 'Tură disponibilă'

      // Boost score for preferred days
      if (userPreferred.has(dateStr)) {
        score += 30
        reason = 'Zi preferată + disponibilă!'
      }

      // Weekend bonus (often harder to fill)
      const dayOfWeek = date.getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        score += 10
        reason = reason === 'Tură disponibilă' ? 'Tură de weekend disponibilă' : reason
      }

      // Penalty for back-to-back
      if (hasBackToBack) {
        score -= 20
        reason += ' (atenție: tură consecutivă)'
      }

      // Penalty for soon (might be last minute)
      const daysUntil = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (daysUntil <= 2) {
        score -= 10
      }

      suggestions.push({
        date,
        dateStr,
        reason,
        score,
        type: userPreferred.has(dateStr) ? 'preferred' : 'available'
      })
    })

    // Find swap opportunities (shifts user might want to swap into)
    // This is more complex - for now, just suggest days where colleagues have shifts
    // and user marked as preferred
    userPreferred.forEach(dateStr => {
      const date = parseISODate(dateStr)
      if (date < today) return
      if (userShiftDates.has(dateStr)) return // Already have shift

      // Check if there's a shift on this day (assigned to someone else)
      const otherShifts = shifts.filter(s =>
        s.shift_date === dateStr &&
        s.department === currentUser.department &&
        s.assigned_to !== currentUser.id &&
        s.assigned_to !== null
      )

      if (otherShifts.length > 0 && !suggestions.find(s => s.dateStr === dateStr)) {
        suggestions.push({
          date,
          dateStr,
          reason: 'Poți solicita schimb cu colegul',
          score: 20,
          type: 'swap_opportunity'
        })
      }
    })

    // Sort by score (highest first) and take top 3
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }, [shifts, unavailableDates, currentUser, selectedDate])

  if (suggestions.length === 0) {
    return null
  }

  const formatDate = (date: Date): string => {
    const dayNames = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm']
    return `${dayNames[date.getDay()]} ${date.getDate()}`
  }

  const getIcon = (type: SuggestedDay['type']): string => {
    switch (type) {
      case 'preferred': return '💚'
      case 'swap_opportunity': return '↔️'
      default: return '📅'
    }
  }

  const getTypeColor = (type: SuggestedDay['type']): string => {
    switch (type) {
      case 'preferred': return 'bg-green-50 border-green-200 hover:bg-green-100'
      case 'swap_opportunity': return 'bg-blue-50 border-blue-200 hover:bg-blue-100'
      default: return 'bg-gray-50 border-gray-200 hover:bg-gray-100'
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <span className="text-lg">💡</span>
        <span>Sugestii pentru tine</span>
      </h3>

      <div className="space-y-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.dateStr}
            onClick={() => onSelectDate(suggestion.date)}
            className={`w-full p-3 rounded-lg border text-left transition-colors ${getTypeColor(suggestion.type)}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{getIcon(suggestion.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{formatDate(suggestion.date)}</p>
                <p className="text-xs text-gray-600 truncate">{suggestion.reason}</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-3 text-center">
        Bazat pe preferințele tale și turele disponibile
      </p>
    </div>
  )
}
