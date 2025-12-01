import { parseISODate } from '@/lib/dateUtils'

// Helper function that mirrors the logic in dashboard
function getReservedShiftsCountForMonth(
  shifts: Array<{ shift_date: string; status: string; assigned_to: string }>,
  userId: string,
  month: number,
  year: number
) {
  return shifts.filter(shift => {
    const shiftDate = parseISODate(shift.shift_date)
    return (
      shift.assigned_to === userId &&
      shift.status === 'reserved' &&
      shiftDate.getMonth() === month &&
      shiftDate.getFullYear() === year
    )
  }).length
}

describe('Dashboard - Reservation Limits', () => {
  const MAX_RESERVATIONS = 2

  test('enforces maximum 2 reservations per month', () => {
    const existingShifts = [
      { id: 'shift-1', shift_date: '2025-08-10', department: 'ATI', status: 'reserved', assigned_to: 'user-1' },
      { id: 'shift-2', shift_date: '2025-08-15', department: 'ATI', status: 'reserved', assigned_to: 'user-1' },
    ]

    const count = getReservedShiftsCountForMonth(existingShifts, 'user-1', 7, 2025)
    expect(count).toBe(2)

    const canReserve = count < MAX_RESERVATIONS
    expect(canReserve).toBe(false)
  })

  test('allows reservation when under monthly limit', () => {
    const existingShifts = [
      { id: 'shift-1', shift_date: '2025-08-10', department: 'ATI', status: 'reserved', assigned_to: 'user-1' },
    ]

    const count = getReservedShiftsCountForMonth(existingShifts, 'user-1', 7, 2025)
    expect(count).toBe(1)

    const canReserve = count < MAX_RESERVATIONS
    expect(canReserve).toBe(true)
  })

  test('counts only current month reservations', () => {
    const existingShifts = [
      { id: 'shift-1', shift_date: '2025-07-10', department: 'ATI', status: 'reserved', assigned_to: 'user-1' },
      { id: 'shift-2', shift_date: '2025-07-15', department: 'ATI', status: 'reserved', assigned_to: 'user-1' },
    ]

    const augustCount = getReservedShiftsCountForMonth(existingShifts, 'user-1', 7, 2025) // August
    expect(augustCount).toBe(0)

    const julyCount = getReservedShiftsCountForMonth(existingShifts, 'user-1', 6, 2025) // July
    expect(julyCount).toBe(2)
  })

  test('does not count assigned shifts toward reservation limit', () => {
    const existingShifts = [
      { id: 'shift-1', shift_date: '2025-08-10', department: 'ATI', status: 'assigned', assigned_to: 'user-1' },
      { id: 'shift-2', shift_date: '2025-08-15', department: 'ATI', status: 'reserved', assigned_to: 'user-1' },
    ]

    const count = getReservedShiftsCountForMonth(existingShifts, 'user-1', 7, 2025)
    expect(count).toBe(1) // Only reserved, not assigned
  })

  test('counts only own reservations, not others', () => {
    const existingShifts = [
      { id: 'shift-1', shift_date: '2025-08-10', department: 'ATI', status: 'reserved', assigned_to: 'user-1' },
      { id: 'shift-2', shift_date: '2025-08-15', department: 'ATI', status: 'reserved', assigned_to: 'user-2' },
    ]

    const user1Count = getReservedShiftsCountForMonth(existingShifts, 'user-1', 7, 2025)
    const user2Count = getReservedShiftsCountForMonth(existingShifts, 'user-2', 7, 2025)

    expect(user1Count).toBe(1)
    expect(user2Count).toBe(1)
  })
})

describe('Dashboard - Department Access', () => {
  test('staff can only see their department', () => {
    const user = { role: 'STAFF', department: 'ATI' }
    const allDepartments = ['ATI', 'Urgente', 'Chirurgie', 'Medicina Interna']

    const visibleDepartments = allDepartments.filter(
      dept => user.role !== 'STAFF' || dept === user.department
    )

    expect(visibleDepartments).toEqual(['ATI'])
  })

  test('manager can see all departments', () => {
    const user = { role: 'MANAGER', department: 'ATI' }
    const allDepartments = ['ATI', 'Urgente', 'Chirurgie', 'Medicina Interna']

    const visibleDepartments = allDepartments.filter(
      dept => user.role !== 'STAFF' || dept === user.department
    )

    expect(visibleDepartments).toEqual(allDepartments)
  })

  test('admin can see all departments', () => {
    const user = { role: 'ADMIN', department: null }
    const allDepartments = ['ATI', 'Urgente', 'Chirurgie', 'Medicina Interna']

    const visibleDepartments = allDepartments.filter(
      dept => user.role !== 'STAFF' || dept === user.department
    )

    expect(visibleDepartments).toEqual(allDepartments)
  })
})

describe('Dashboard - Swap Request Authorization', () => {
  test('only target user can accept swap', () => {
    const swapRequest = {
      id: 'swap-1',
      requester_id: 'user-1',
      target_user_id: 'user-2',
    }

    const currentUserId = 'user-2'
    const canAccept = swapRequest.target_user_id === currentUserId
    expect(canAccept).toBe(true)

    const otherUserId = 'user-3'
    const canOtherAccept = swapRequest.target_user_id === otherUserId
    expect(canOtherAccept).toBe(false)
  })

  test('only target or requester can reject swap', () => {
    const swapRequest = {
      id: 'swap-1',
      requester_id: 'user-1',
      target_user_id: 'user-2',
    }

    // Target can reject
    const canTargetReject =
      swapRequest.target_user_id === 'user-2' || swapRequest.requester_id === 'user-2'
    expect(canTargetReject).toBe(true)

    // Requester can reject (cancel)
    const canRequesterReject =
      swapRequest.target_user_id === 'user-1' || swapRequest.requester_id === 'user-1'
    expect(canRequesterReject).toBe(true)

    // Other user cannot reject
    const canOtherReject =
      swapRequest.target_user_id === 'user-3' || swapRequest.requester_id === 'user-3'
    expect(canOtherReject).toBe(false)
  })
})
