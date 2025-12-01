import { formatDateForDB, addDays } from '@/lib/dateUtils'

// Type definitions matching the app
interface User {
  id: string
  name: string
  department: string
  role: string
  max_shifts_per_month?: number
}

interface Shift {
  id: string
  shift_date: string
  department: string
  assigned_to?: string
  status: string
}

interface UnavailableDate {
  user_id: string
  unavailable_date: string
}

// Helper function that mirrors the availability logic in DepartmentCalendar
function getAvailableStaff(
  departmentStaff: User[],
  currentDate: Date,
  shifts: Shift[],
  shiftsToCreate: Array<{ shift_date: string; assigned_to?: string }>,
  unavailableDates: UnavailableDate[],
  userShiftCounts: Record<string, number>
) {
  const dateStr = formatDateForDB(currentDate)
  const yesterday = addDays(currentDate, -1)
  const yesterdayStr = formatDateForDB(yesterday)
  const tomorrow = addDays(currentDate, 1)
  const tomorrowStr = formatDateForDB(tomorrow)

  const unavailableStaffCount = departmentStaff.filter(staff =>
    unavailableDates.some(
      ud => ud.user_id === staff.id && ud.unavailable_date === dateStr
    )
  ).length

  const allStaffUnavailable = unavailableStaffCount === departmentStaff.length

  return departmentStaff.filter(staff => {
    const maxShifts = staff.max_shifts_per_month || 8
    if (userShiftCounts[staff.id] >= maxShifts) {
      return false
    }

    if (allStaffUnavailable) {
      const hasShiftToday = shifts.some(
        s => s.assigned_to === staff.id && s.shift_date === dateStr
      )
      return !hasShiftToday
    }

    const isUnavailable = unavailableDates.some(
      ud => ud.user_id === staff.id && ud.unavailable_date === dateStr
    )

    const hasShiftToday = shifts.some(
      s => s.assigned_to === staff.id && s.shift_date === dateStr
    )

    const workedYesterday =
      shifts.some(s => s.assigned_to === staff.id && s.shift_date === yesterdayStr) ||
      shiftsToCreate.some(s => s.assigned_to === staff.id && s.shift_date === yesterdayStr)

    const worksTomorrow = shifts.some(
      s => s.assigned_to === staff.id && s.shift_date === tomorrowStr
    )

    return !isUnavailable && !hasShiftToday && !workedYesterday && !worksTomorrow
  })
}

describe('Shift Generation - Availability Logic', () => {
  const mockStaff: User[] = [
    { id: 'staff-1', name: 'Staff 1', department: 'ATI', role: 'STAFF', max_shifts_per_month: 8 },
    { id: 'staff-2', name: 'Staff 2', department: 'ATI', role: 'STAFF', max_shifts_per_month: 8 },
    { id: 'staff-3', name: 'Staff 3', department: 'ATI', role: 'STAFF', max_shifts_per_month: 8 },
  ]

  test('excludes staff who are marked unavailable', () => {
    const currentDate = new Date(2025, 7, 15) // August 15, 2025
    const unavailableDates: UnavailableDate[] = [
      { user_id: 'staff-1', unavailable_date: '2025-08-15' },
    ]

    const available = getAvailableStaff(
      mockStaff,
      currentDate,
      [],
      [],
      unavailableDates,
      { 'staff-1': 0, 'staff-2': 0, 'staff-3': 0 }
    )

    expect(available.map(s => s.id)).not.toContain('staff-1')
    expect(available.map(s => s.id)).toContain('staff-2')
    expect(available.map(s => s.id)).toContain('staff-3')
  })

  test('excludes staff who worked yesterday (prevents back-to-back)', () => {
    const currentDate = new Date(2025, 7, 15) // August 15
    const shifts: Shift[] = [
      { id: 's1', shift_date: '2025-08-14', department: 'ATI', assigned_to: 'staff-1', status: 'assigned' },
    ]

    const available = getAvailableStaff(
      mockStaff,
      currentDate,
      shifts,
      [],
      [],
      { 'staff-1': 1, 'staff-2': 0, 'staff-3': 0 }
    )

    expect(available.map(s => s.id)).not.toContain('staff-1')
    expect(available.map(s => s.id)).toContain('staff-2')
  })

  test('excludes staff who work tomorrow (prevents back-to-back from existing shifts)', () => {
    const currentDate = new Date(2025, 7, 15) // August 15
    const shifts: Shift[] = [
      { id: 's1', shift_date: '2025-08-16', department: 'ATI', assigned_to: 'staff-1', status: 'assigned' },
    ]

    const available = getAvailableStaff(
      mockStaff,
      currentDate,
      shifts,
      [],
      [],
      { 'staff-1': 1, 'staff-2': 0, 'staff-3': 0 }
    )

    expect(available.map(s => s.id)).not.toContain('staff-1')
    expect(available.map(s => s.id)).toContain('staff-2')
  })

  test('excludes staff who reached monthly limit', () => {
    const currentDate = new Date(2025, 7, 15)

    const available = getAvailableStaff(
      mockStaff,
      currentDate,
      [],
      [],
      [],
      { 'staff-1': 8, 'staff-2': 5, 'staff-3': 0 } // staff-1 at max
    )

    expect(available.map(s => s.id)).not.toContain('staff-1')
    expect(available.map(s => s.id)).toContain('staff-2')
    expect(available.map(s => s.id)).toContain('staff-3')
  })

  test('excludes staff who already have shift today', () => {
    const currentDate = new Date(2025, 7, 15)
    const shifts: Shift[] = [
      { id: 's1', shift_date: '2025-08-15', department: 'ATI', assigned_to: 'staff-1', status: 'assigned' },
    ]

    const available = getAvailableStaff(
      mockStaff,
      currentDate,
      shifts,
      [],
      [],
      { 'staff-1': 1, 'staff-2': 0, 'staff-3': 0 }
    )

    expect(available.map(s => s.id)).not.toContain('staff-1')
  })

  test('checks shiftsToCreate for yesterday prevention', () => {
    const currentDate = new Date(2025, 7, 15)
    const shiftsToCreate = [
      { shift_date: '2025-08-14', assigned_to: 'staff-1' },
    ]

    const available = getAvailableStaff(
      mockStaff,
      currentDate,
      [],
      shiftsToCreate,
      [],
      { 'staff-1': 1, 'staff-2': 0, 'staff-3': 0 }
    )

    expect(available.map(s => s.id)).not.toContain('staff-1')
  })

  test('includes all staff when all are unavailable (fallback)', () => {
    const currentDate = new Date(2025, 7, 15)
    const unavailableDates: UnavailableDate[] = [
      { user_id: 'staff-1', unavailable_date: '2025-08-15' },
      { user_id: 'staff-2', unavailable_date: '2025-08-15' },
      { user_id: 'staff-3', unavailable_date: '2025-08-15' },
    ]

    const available = getAvailableStaff(
      mockStaff,
      currentDate,
      [],
      [],
      unavailableDates,
      { 'staff-1': 0, 'staff-2': 0, 'staff-3': 0 }
    )

    // All should be included when everyone is unavailable
    expect(available.length).toBe(3)
  })

  test('respects custom max_shifts_per_month', () => {
    const staffWithCustomLimit: User[] = [
      { id: 'staff-1', name: 'Staff 1', department: 'ATI', role: 'STAFF', max_shifts_per_month: 4 },
      { id: 'staff-2', name: 'Staff 2', department: 'ATI', role: 'STAFF', max_shifts_per_month: 8 },
    ]

    const currentDate = new Date(2025, 7, 15)

    const available = getAvailableStaff(
      staffWithCustomLimit,
      currentDate,
      [],
      [],
      [],
      { 'staff-1': 4, 'staff-2': 4 } // Both at 4, but staff-1 max is 4, staff-2 max is 8
    )

    expect(available.map(s => s.id)).not.toContain('staff-1') // At max
    expect(available.map(s => s.id)).toContain('staff-2') // Under max
  })
})

describe('Shift Generation - Fair Distribution', () => {
  test('sorting by shift count gives priority to least-worked staff', () => {
    const staff = [
      { id: 's1', count: 5 },
      { id: 's2', count: 2 },
      { id: 's3', count: 8 },
      { id: 's4', count: 3 },
    ]

    // Sort by count ascending (least shifts first)
    const sorted = [...staff].sort((a, b) => a.count - b.count)

    expect(sorted[0].id).toBe('s2') // 2 shifts
    expect(sorted[1].id).toBe('s4') // 3 shifts
    expect(sorted[2].id).toBe('s1') // 5 shifts
    expect(sorted[3].id).toBe('s3') // 8 shifts
  })
})
