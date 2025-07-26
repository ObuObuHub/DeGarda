'use client'

import { useState } from 'react'
import { type User, type Shift, type UnavailableDate, supabase } from '@/lib/supabase'
import { type Department, DEPARTMENT_COLORS } from '@/types'
import Calendar from './Calendar'

interface DepartmentCalendarProps {
  department: Department
  shifts: Shift[]
  unavailableDates: UnavailableDate[]
  onReserveShift: (shiftId: string) => void
  onCancelShift: (shiftId: string) => void
  onMarkUnavailable: (date: Date) => void
  onRemoveUnavailable: (date: Date) => void
  onDeleteShift?: (shiftId: string) => void
  currentUser: User
  selectedDate: Date
  onDateChange: (date: Date) => void
  pendingSwapRequests?: { from_shift_id: string; to_shift_id: string }[]
  users: User[]
  onShiftsGenerated: () => void
}

export default function DepartmentCalendar({
  department,
  shifts,
  unavailableDates,
  onReserveShift,
  onCancelShift,
  onMarkUnavailable,
  onRemoveUnavailable,
  onDeleteShift,
  currentUser,
  selectedDate,
  onDateChange,
  pendingSwapRequests = [],
  users,
  onShiftsGenerated
}: DepartmentCalendarProps) {
  const [generating, setGenerating] = useState(false)

  // Filter shifts for this department only
  const departmentShifts = shifts.filter(shift => shift.department === department)
  
  // Check if user can generate shifts
  const canGenerateShifts = currentUser.role === 'MANAGER' || currentUser.role === 'ADMIN'

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
          new Date(s.shift_date).getMonth() === selectedDate.getMonth() &&
          new Date(s.shift_date).getFullYear() === selectedDate.getFullYear() &&
          (s.status === 'assigned' || s.status === 'reserved')
        ).length
      })

      // Generate shifts for each day
      let currentDate = new Date(start)
      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0]
        
        // Check if a 24h shift already exists for this day and department
        const existingDayShift = shifts.find(
          s => s.shift_date === dateStr && s.department === department
        )

        // If shift exists and is reserved, update it to assigned
        if (existingDayShift) {
          if (existingDayShift.status === 'reserved' && existingDayShift.assigned_to) {
            await supabase
              .from('shifts')
              .update({ status: 'assigned' })
              .eq('id', existingDayShift.id)
          }
          currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)
          continue
        }

        // Get yesterday's date to check for back-to-back shifts
        const yesterday = new Date(currentDate)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        
        // Find available staff for this 24h shift
        const availableStaff = departmentStaff.filter(staff => {
          // Check if user has reached their monthly limit
          const maxShifts = staff.max_shifts_per_month || 8
          if (userShiftCounts[staff.id] >= maxShifts) {
            return false
          }
          
          // Check if user is unavailable on this date
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

          return !isUnavailable && !hasShiftToday && !workedYesterday
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
        currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)
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
    } catch (error) {
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
            {generating ? '🔄 Se generează...' : '✨ Generează Ture'}
          </button>
        )}
      </div>
      
      <div className="border border-t-0 rounded-b-lg">
        <Calendar
          shifts={departmentShifts}
          unavailableDates={unavailableDates}
          onReserveShift={onReserveShift}
          onCancelShift={onCancelShift}
          onMarkUnavailable={onMarkUnavailable}
          onRemoveUnavailable={onRemoveUnavailable}
          onDeleteShift={onDeleteShift}
          currentUser={currentUser}
          selectedDate={selectedDate}
          onDateChange={onDateChange}
          pendingSwapRequests={pendingSwapRequests}
          department={department}
        />
      </div>
    </div>
  )
}