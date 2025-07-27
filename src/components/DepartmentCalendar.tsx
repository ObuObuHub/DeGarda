'use client'

import { type User, type Shift, type UnavailableDate } from '@/lib/supabase'
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
  onCreateReservation?: (date: Date, department?: string) => void
  onRequestSwap?: (shiftId: string) => void
  onAssignShift?: (shiftId: string, userId: string | null) => void
  currentUser: User
  selectedDate: Date
  onDateChange: (date: Date) => void
  users: User[]
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
  onCreateReservation,
  onRequestSwap,
  onAssignShift,
  currentUser,
  selectedDate,
  onDateChange,
  users
}: DepartmentCalendarProps) {
  // Filter shifts for this department only
  const departmentShifts = shifts.filter(shift => shift.department === department)

  return (
    <div className="mb-8">
      <div 
        className="flex justify-between items-center p-4 rounded-t-lg text-white font-semibold"
        style={{ backgroundColor: DEPARTMENT_COLORS[department] }}
      >
        <h2 className="text-lg">{department}</h2>
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
          onCreateReservation={onCreateReservation}
          onRequestSwap={onRequestSwap}
          onAssignShift={onAssignShift}
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