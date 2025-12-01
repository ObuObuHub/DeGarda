'use client'

import { useState } from 'react'
import { type User, type Shift, type UnavailableDate, type SwapRequest, supabase } from '@/lib/supabase'
import { type Department, DEPARTMENT_COLORS } from '@/types'
import { parseISODate, formatDateForDB, addDays } from '@/lib/dateUtils'
import Calendar from './Calendar'

interface DepartmentCalendarProps {
  department: Department
  shifts: Shift[]
  unavailableDates: UnavailableDate[]
  swapRequests?: SwapRequest[]
  onReserveShift: (shiftId: string) => void
  onCancelShift: (shiftId: string) => void
  onMarkUnavailable: (date: Date) => void
  onRemoveUnavailable: (date: Date) => void
  onDeleteShift?: (shiftId: string) => void
  onCreateReservation?: (date: Date, department?: string) => void
  onRequestSwap?: (requesterShiftId: string, targetShiftIds: string[]) => void
  onAssignShift?: (shiftId: string, userId: string | null) => void
  onAcceptSwap?: (swapRequestId: string) => void
  onRejectSwap?: (swapRequestId: string) => void
  currentUser: User
  selectedDate: Date
  onDateChange: (date: Date) => void
  users: User[]
  onShiftsGenerated: () => void
}

export default function DepartmentCalendar({
  department,
  shifts,
  unavailableDates,
  swapRequests,
  onReserveShift,
  onCancelShift,
  onMarkUnavailable,
  onRemoveUnavailable,
  onDeleteShift,
  onCreateReservation,
  onRequestSwap,
  onAssignShift,
  onAcceptSwap,
  onRejectSwap,
  currentUser,
  selectedDate,
  onDateChange,
  users,
  onShiftsGenerated
}: DepartmentCalendarProps) {
  const [generating, setGenerating] = useState(false)

  // Filter shifts for this department only
  const departmentShifts = shifts.filter(shift => shift.department === department)
  
  // Check if user can generate shifts
  const canGenerateShifts = currentUser.role !== 'STAFF'

  const generateShiftsForDepartment = async () => {
    setGenerating(true)

    try {
      // Calculate month range from selectedDate
      const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
      const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
      
      // Get staff for this department
      const departmentStaff = users.filter(
        u => u.department === department && u.role === 'STAFF'
      )

      if (departmentStaff.length === 0) {
        alert('Nu există personal în acest departament!')
        setGenerating(false)
        return
      }

      const shiftsToCreate: Array<{
        shift_date: string
        shift_time: string
        department: string
        assigned_to?: string
        status: 'available' | 'reserved' | 'assigned'
      }> = []

      // Count existing shifts per user for the current month
      const userShiftCounts: Record<string, number> = {}
      departmentStaff.forEach(staff => {
        userShiftCounts[staff.id] = shifts.filter(
          s => s.assigned_to === staff.id && 
          parseISODate(s.shift_date).getMonth() === selectedDate.getMonth() &&
          parseISODate(s.shift_date).getFullYear() === selectedDate.getFullYear() &&
          (s.status === 'assigned' || s.status === 'reserved')
        ).length
      })

      // Generate shifts for each day
      let currentDate = new Date(start)
      while (currentDate <= end) {
        const dateStr = formatDateForDB(currentDate)
        
        // Check if a 24h shift already exists for this day and department
        const existingDayShift = shifts.find(
          s => s.shift_date === dateStr && s.department === department
        )
        
        // Get all reservations for this date in this department
        const reservationsForDate = shifts.filter(
          s => s.shift_date === dateStr && 
               s.department === department && 
               s.status === 'reserved'
        )

        // If shift exists, handle accordingly
        if (existingDayShift) {
          // If there are multiple reservations, randomly pick one
          if (reservationsForDate.length > 1) {
            const randomIndex = Math.floor(Math.random() * reservationsForDate.length)
            const winnerReservation = reservationsForDate[randomIndex]
            
            // Update winner to assigned
            await supabase
              .from('shifts')
              .update({ status: 'assigned' })
              .eq('id', winnerReservation.id)
            
            // Delete other reservations
            for (const reservation of reservationsForDate) {
              if (reservation.id !== winnerReservation.id) {
                await supabase
                  .from('shifts')
                  .delete()
                  .eq('id', reservation.id)
              }
            }
          } else if (existingDayShift.status === 'reserved' && existingDayShift.assigned_to) {
            // Single reservation - just assign it
            await supabase
              .from('shifts')
              .update({ status: 'assigned' })
              .eq('id', existingDayShift.id)
          }
          currentDate = addDays(currentDate, 1)
          continue
        }

        // Get yesterday's and tomorrow's dates to check for back-to-back shifts
        const yesterday = addDays(currentDate, -1)
        const yesterdayStr = formatDateForDB(yesterday)
        const tomorrow = addDays(currentDate, 1)
        const tomorrowStr = formatDateForDB(tomorrow)

        // Find available staff for this 24h shift
        // Check if ALL staff marked this day as unavailable
        const unavailableStaffCount = departmentStaff.filter(staff =>
          unavailableDates.some(
            ud => ud.user_id === staff.id && ud.unavailable_date === dateStr
          )
        ).length

        const allStaffUnavailable = unavailableStaffCount === departmentStaff.length

        const availableStaff = departmentStaff.filter(staff => {
          // Check if user has reached their monthly limit
          const maxShifts = staff.max_shifts_per_month || 8
          if (userShiftCounts[staff.id] >= maxShifts) {
            return false
          }

          // If ALL staff are unavailable, include everyone for random selection
          if (allStaffUnavailable) {
            // Still check for shift limit and existing shifts
            const hasShiftToday = shifts.some(
              s => s.assigned_to === staff.id && s.shift_date === dateStr
            )
            return !hasShiftToday
          }

          // Normal unavailability check
          const isUnavailable = unavailableDates.some(
            ud => ud.user_id === staff.id && ud.unavailable_date === dateStr
          )

          // Check if user already has a shift on this day
          const hasShiftToday = shifts.some(
            s => s.assigned_to === staff.id && s.shift_date === dateStr
          )

          // Check if user worked yesterday (prevent back-to-back)
          const workedYesterday = shifts.some(
            s => s.assigned_to === staff.id && s.shift_date === yesterdayStr
          ) || shiftsToCreate.some(
            s => s.assigned_to === staff.id && s.shift_date === yesterdayStr
          )

          // Check if user works tomorrow (prevent back-to-back with existing shifts)
          const worksTomorrow = shifts.some(
            s => s.assigned_to === staff.id && s.shift_date === tomorrowStr
          )

          return !isUnavailable && !hasShiftToday && !workedYesterday && !worksTomorrow
        })

        if (availableStaff.length > 0) {
          // Check if it's a weekend
          const dayOfWeek = currentDate.getDay()
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 // Sunday or Saturday
          
          if (isWeekend) {
            // Randomize for weekends
            for (let i = availableStaff.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [availableStaff[i], availableStaff[j]] = [availableStaff[j], availableStaff[i]]
            }
          } else {
            // Sort by who has the least shifts (fair distribution) for weekdays
            availableStaff.sort((a, b) => 
              (userShiftCounts[a.id] || 0) - (userShiftCounts[b.id] || 0)
            )
          }

          // Assign shift to the selected staff
          const assignedStaff = availableStaff[0]
          
          shiftsToCreate.push({
            shift_date: dateStr,
            shift_time: '24h',
            department: department,
            assigned_to: assignedStaff.id,
            status: 'assigned'
          })

          // Update count
          userShiftCounts[assignedStaff.id] = (userShiftCounts[assignedStaff.id] || 0) + 1
        } else {
          // Create unassigned shift
          shiftsToCreate.push({
            shift_date: dateStr,
            shift_time: '24h',
            department: department,
            status: 'available'
          })
        }
        
        // Move to next day
        currentDate = addDays(currentDate, 1)
      }

      // Insert all shifts
      if (shiftsToCreate.length > 0) {
        const { error } = await supabase
          .from('shifts')
          .insert(shiftsToCreate)

        if (!error) {
          onShiftsGenerated()
        } else {
          alert('Eroare la generare: ' + error.message)
        }
      }
    } catch {
      alert('Eroare la generare')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="mb-8">
      <div 
        className="flex justify-between items-center p-4 rounded-t-lg text-white font-semibold"
        style={{ backgroundColor: DEPARTMENT_COLORS[department] }}
      >
        <h2 className="text-lg">{department}</h2>
        {canGenerateShifts && (
          <button
            onClick={generateShiftsForDepartment}
            disabled={generating}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {generating ? 'Se generează...' : 'Generează'}
          </button>
        )}
      </div>
      
      <div className="border border-t-0 rounded-b-lg">
        <Calendar
          shifts={departmentShifts}
          unavailableDates={unavailableDates}
          swapRequests={swapRequests}
          onReserveShift={onReserveShift}
          onCancelShift={onCancelShift}
          onMarkUnavailable={onMarkUnavailable}
          onRemoveUnavailable={onRemoveUnavailable}
          onDeleteShift={onDeleteShift}
          onCreateReservation={onCreateReservation}
          onRequestSwap={onRequestSwap}
          onAssignShift={onAssignShift}
          onAcceptSwap={onAcceptSwap}
          onRejectSwap={onRejectSwap}
          currentUser={currentUser}
          selectedDate={selectedDate}
          onDateChange={onDateChange}
          department={department}
          users={users.filter(u => u.department === department)}
        />
      </div>
    </div>
  )
}