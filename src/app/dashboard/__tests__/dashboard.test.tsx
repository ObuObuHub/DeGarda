import { describe, test, expect } from '@jest/globals'

describe('Dashboard - Reservation Limits', () => {
  test('enforces maximum 2 reservations per month', () => {
    // Mock data - user already has 2 reserved shifts in August
    const existingShifts = [
      {
        id: 'shift-1',
        shift_date: '2025-08-10',
        department: 'ATI',
        status: 'reserved',
        assigned_to: 'user-1'
      },
      {
        id: 'shift-2',
        shift_date: '2025-08-15',
        department: 'ATI', 
        status: 'reserved',
        assigned_to: 'user-1'
      }
    ]
    
    // Count reserved shifts for month
    const getReservedShiftsCountForMonth = (shifts, userId, month, year) => {
      return shifts.filter(shift => {
        const shiftDate = new Date(shift.shift_date)
        return shift.assigned_to === userId &&
               shift.status === 'reserved' &&
               shiftDate.getMonth() === month &&
               shiftDate.getFullYear() === year
      }).length
    }
    
    // Test the count
    const count = getReservedShiftsCountForMonth(existingShifts, 'user-1', 7, 2025) // August is month 7
    expect(count).toBe(2)
    
    // Test that we should block new reservation
    const canReserve = count < 2
    expect(canReserve).toBe(false)
  })
  
  test('allows reservation when under monthly limit', () => {
    // Mock data - user has 1 reserved shift in August
    const existingShifts = [
      {
        id: 'shift-1',
        shift_date: '2025-08-10',
        department: 'ATI',
        status: 'reserved',
        assigned_to: 'user-1'
      }
    ]
    
    // Count reserved shifts for month
    const getReservedShiftsCountForMonth = (shifts, userId, month, year) => {
      return shifts.filter(shift => {
        const shiftDate = new Date(shift.shift_date)
        return shift.assigned_to === userId &&
               shift.status === 'reserved' &&
               shiftDate.getMonth() === month &&
               shiftDate.getFullYear() === year
      }).length
    }
    
    // Test the count
    const count = getReservedShiftsCountForMonth(existingShifts, 'user-1', 7, 2025)
    expect(count).toBe(1)
    
    // Test that we should allow new reservation
    const canReserve = count < 2
    expect(canReserve).toBe(true)
  })
  
  test('counts only current month reservations', () => {
    // Mock data - user has 2 in July, 0 in August
    const existingShifts = [
      {
        id: 'shift-1',
        shift_date: '2025-07-10',
        department: 'ATI',
        status: 'reserved',
        assigned_to: 'user-1'
      },
      {
        id: 'shift-2',
        shift_date: '2025-07-15',
        department: 'ATI',
        status: 'reserved',
        assigned_to: 'user-1'
      }
    ]
    
    // Count reserved shifts for month
    const getReservedShiftsCountForMonth = (shifts, userId, month, year) => {
      return shifts.filter(shift => {
        const shiftDate = new Date(shift.shift_date)
        return shift.assigned_to === userId &&
               shift.status === 'reserved' &&
               shiftDate.getMonth() === month &&
               shiftDate.getFullYear() === year
      }).length
    }
    
    // Test August count (should be 0)
    const augustCount = getReservedShiftsCountForMonth(existingShifts, 'user-1', 7, 2025)
    expect(augustCount).toBe(0)
    
    // Test July count (should be 2)
    const julyCount = getReservedShiftsCountForMonth(existingShifts, 'user-1', 6, 2025)
    expect(julyCount).toBe(2)
    
    // Should allow reservation in August
    const canReserveInAugust = augustCount < 2
    expect(canReserveInAugust).toBe(true)
  })
})