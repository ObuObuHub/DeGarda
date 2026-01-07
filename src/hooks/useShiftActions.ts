'use client'

import { useCallback, useMemo } from 'react'
import { supabase, type User, type Shift } from '@/lib/supabase'
import { type ShiftType, type Department } from '@/types'
import { formatDateForDB, parseISODate } from '@/lib/dateUtils'
import { isWorkingStaff } from '@/lib/roles'
import { getDaysUntil } from '@/lib/feedback'

interface ToastFunctions {
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
}

// Conflict types for scheduling validation
export interface Conflict {
  type: 'double_booking' | 'rest_violation' | 'max_exceeded'
  message: string
  severity: 'warning' | 'error'
}

/**
 * Check for scheduling conflicts when assigning/reserving a shift
 * @param userId - The user being assigned to the shift
 * @param shiftDate - The date of the shift (YYYY-MM-DD)
 * @param allShifts - All shifts to check against
 * @param shiftTypes - Shift types for duration calculation
 * @param maxShiftsPerMonth - User's max shifts per month limit
 * @returns Array of conflicts found
 */
export function checkConflicts(
  userId: string,
  shiftDate: string,
  allShifts: Shift[],
  shiftTypes: ShiftType[],
  maxShiftsPerMonth: number = 8
): Conflict[] {
  const conflicts: Conflict[] = []
  const targetDate = parseISODate(shiftDate)
  const targetMonth = targetDate.getMonth()
  const targetYear = targetDate.getFullYear()

  // Get user's existing assigned/reserved shifts
  const userShifts = allShifts.filter(s =>
    s.assigned_to === userId &&
    (s.status === 'assigned' || s.status === 'reserved')
  )

  // 1. Check for double-booking (same day)
  const sameDayShifts = userShifts.filter(s => s.shift_date === shiftDate)
  if (sameDayShifts.length > 0) {
    conflicts.push({
      type: 'double_booking',
      message: 'Există deja o tură în această zi. Alege altă zi sau solicită schimb.',
      severity: 'error'
    })
  }

  // 2. Check for rest period violation (8 hours between shifts)
  // Get shifts from day before and day after
  const dayBefore = new Date(targetDate)
  dayBefore.setDate(dayBefore.getDate() - 1)
  const dayAfter = new Date(targetDate)
  dayAfter.setDate(dayAfter.getDate() + 1)

  const dayBeforeStr = formatDateForDB(dayBefore)
  const dayAfterStr = formatDateForDB(dayAfter)

  const adjacentShifts = userShifts.filter(s =>
    s.shift_date === dayBeforeStr || s.shift_date === dayAfterStr
  )

  // Check if any adjacent shift could violate rest period
  // This is simplified - assumes shift end time to next start time should be >= 8h
  for (const adjShift of adjacentShifts) {
    const adjShiftType = shiftTypes.find(st => st.id === adjShift.shift_type_id)
    if (adjShiftType && adjShiftType.duration_hours >= 12) {
      // For 12h+ shifts on adjacent days, there's likely a rest violation
      const isYesterday = adjShift.shift_date === dayBeforeStr
      conflicts.push({
        type: 'rest_violation',
        message: isYesterday
          ? 'Ai avut tură ieri - verifică dacă ai suficientă odihnă (min. 8h între ture).'
          : 'Ai tură mâine - verifică dacă vei avea suficientă odihnă (min. 8h între ture).',
        severity: 'warning'
      })
    }
  }

  // 3. Check max shifts per month exceeded
  const monthlyShifts = userShifts.filter(s => {
    const sDate = parseISODate(s.shift_date)
    return sDate.getMonth() === targetMonth && sDate.getFullYear() === targetYear
  })

  if (monthlyShifts.length >= maxShiftsPerMonth) {
    conflicts.push({
      type: 'max_exceeded',
      message: `Ai deja ${monthlyShifts.length}/${maxShiftsPerMonth} ture luna aceasta. Poți continua, dar discută cu managerul.`,
      severity: 'warning'
    })
  }

  return conflicts
}

/**
 * Get conflicts for a specific user on a specific shift
 * Utility function to be used by components
 */
export function getConflictsForShift(
  shift: Shift,
  currentUserId: string,
  allShifts: Shift[],
  shiftTypes: ShiftType[],
  maxShiftsPerMonth: number = 8
): Conflict[] {
  if (!shift.assigned_to || shift.assigned_to !== currentUserId) {
    return []
  }

  // Check conflicts for this user's shift
  // We filter out this shift from allShifts to avoid self-conflict
  const otherShifts = allShifts.filter(s => s.id !== shift.id)
  return checkConflicts(shift.assigned_to, shift.shift_date, otherShifts, shiftTypes, maxShiftsPerMonth)
}

interface DeadlineCheckFn {
  (departmentId: string, targetMonth: Date): boolean
}

interface UseShiftActionsReturn {
  reserveShift: (shiftId: string) => Promise<void>
  cancelShift: (shiftId: string) => Promise<void>
  createReservation: (date: Date, department?: string, shiftTypeId?: string) => Promise<void>
  setPreference: (date: Date, preferenceType: 'unavailable' | 'preferred') => Promise<void>
  removePreference: (date: Date) => Promise<void>
  markUnavailable: (date: Date) => Promise<void>  // Legacy
  removeUnavailable: (date: Date) => Promise<void>  // Legacy
  deleteShift: (shiftId: string) => Promise<void>
  assignShift: (shiftId: string, userId: string | null) => Promise<void>
  deleteAllShifts: () => Promise<void>
  checkConflicts: (userId: string, shiftDate: string) => Conflict[]
}

export function useShiftActions(
  user: User | null,
  shifts: Shift[],
  shiftTypes: ShiftType[],
  selectedDate: Date,
  onRefreshShifts: () => Promise<void>,
  onRefreshUnavailable: () => Promise<void>,
  toast?: ToastFunctions,
  isDeadlineLocked?: DeadlineCheckFn,
  departments?: Department[]
): UseShiftActionsReturn {
  // Resolve user's department name to department ID
  const userDepartmentId = useMemo(() => {
    if (!user?.department || !departments) return null
    return departments.find(d => d.name === user.department)?.id || null
  }, [user?.department, departments])

  // Helper to check deadline using resolved department ID
  const checkDeadlineLocked = useCallback((targetDate: Date): boolean => {
    if (!isDeadlineLocked || !userDepartmentId) return false
    return isDeadlineLocked(userDepartmentId, targetDate)
  }, [isDeadlineLocked, userDepartmentId])

  const reserveShift = useCallback(async (shiftId: string) => {
    if (!user) return

    // Get shift data first for deadline and department checks
    const { data: shiftData } = await supabase
      .from('shifts')
      .select('department, shift_date')
      .eq('id', shiftId)
      .single()

    if (!shiftData) {
      toast?.error('Tura nu a fost găsită.')
      return
    }

    // Check deadline lock for working staff
    if (isWorkingStaff(user.role)) {
      const shiftDate = parseISODate(shiftData.shift_date)
      if (checkDeadlineLocked(shiftDate)) {
        toast?.error('Termenul limită a expirat. Nu mai poți rezerva ture.')
        return
      }
    }

    // Working staff (STAFF and DEPARTMENT_MANAGER) can only reserve from their department
    if (isWorkingStaff(user.role)) {
      if (shiftData.department !== user.department) {
        toast?.error('Poți rezerva doar ture din departamentul tău!')
        return
      }
    }

    const { error } = await supabase
      .from('shifts')
      .update({ assigned_to: user.id, status: 'reserved' })
      .eq('id', shiftId)
      .eq('status', 'available')

    if (!error) {
      const daysUntil = getDaysUntil(shiftData.shift_date)
      const dateInfo = daysUntil === 0 ? 'azi' : daysUntil === 1 ? 'mâine' : `peste ${daysUntil} zile`
      toast?.success(`Tură rezervată pentru ${dateInfo}! Va fi confirmată la generarea programului.`)
      await onRefreshShifts()
    } else {
      toast?.error('Tura a fost deja luată de altcineva. Încearcă o altă zi.')
    }
  }, [user, onRefreshShifts, toast, checkDeadlineLocked])

  const cancelShift = useCallback(async (shiftId: string) => {
    if (!user) return

    const shift = shifts.find(s => s.id === shiftId)

    // Working staff (STAFF and DEPARTMENT_MANAGER) can delete their own reserved shifts
    if (shift && shift.status === 'reserved' && shift.assigned_to === user.id && isWorkingStaff(user.role)) {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', shiftId)

      if (!error) {
        toast?.info('Rezervare anulată. Tura este din nou disponibilă pentru alții.')
        await onRefreshShifts()
      }
    } else {
      const { error } = await supabase
        .from('shifts')
        .update({ assigned_to: null, status: 'available' })
        .eq('id', shiftId)
        .eq('assigned_to', user.id)

      if (!error) {
        toast?.info('Rezervare anulată. Tura este din nou disponibilă pentru alții.')
        await onRefreshShifts()
      }
    }
  }, [user, shifts, onRefreshShifts, toast])

  const createReservation = useCallback(async (date: Date, department?: string, shiftTypeId?: string) => {
    if (!user) return

    // Working staff (STAFF and DEPARTMENT_MANAGER) have reservation limits
    if (isWorkingStaff(user.role)) {
      if (!user.department) return

      // Check deadline lock
      if (checkDeadlineLocked(date)) {
        toast?.error('Termenul limită a expirat. Nu mai poți rezerva ture.')
        return
      }

      const month = date.getMonth()
      const year = date.getFullYear()
      const reservedCount = shifts.filter(shift => {
        const shiftDate = parseISODate(shift.shift_date)
        return shift.assigned_to === user.id &&
               shift.status === 'reserved' &&
               shiftDate.getMonth() === month &&
               shiftDate.getFullYear() === year
      }).length

      if (reservedCount >= 2) {
        toast?.warning('Ai deja 2 rezervări luna aceasta. Anulează una pentru a rezerva alta.')
        return
      }

      // Working staff can only reserve in their own department
      if (department && department !== user.department) {
        toast?.error('Poți crea ture doar în departamentul tău.')
        return
      }
    }

    const targetDepartment = isWorkingStaff(user.role) ? user.department : (department || user.department)
    if (!targetDepartment) return

    const targetShiftTypeId = shiftTypeId || shiftTypes.find(st => st.is_default)?.id
    if (!targetShiftTypeId) {
      toast?.error('Nu există niciun tip de tură definit. Contactați administratorul.')
      return
    }

    const dateStr = formatDateForDB(date)

    const existingShift = shifts.find(s =>
      s.shift_date === dateStr &&
      s.department === targetDepartment &&
      s.shift_type_id === targetShiftTypeId &&
      s.status === 'available'
    )

    const daysUntil = getDaysUntil(dateStr)
    const dateInfo = daysUntil === 0 ? 'azi' : daysUntil === 1 ? 'mâine' : `peste ${daysUntil} zile`

    if (existingShift) {
      const { error } = await supabase
        .from('shifts')
        .update({ assigned_to: user.id, status: 'reserved' })
        .eq('id', existingShift.id)

      if (!error) {
        toast?.success(`Tură rezervată pentru ${dateInfo}! Va fi confirmată la generarea programului.`)
        await onRefreshShifts()
      } else {
        toast?.error('Tura a fost deja luată. Încearcă altă zi.')
      }
    } else {
      if (!user.hospital_id) {
        toast?.error('Nu ești asociat unui spital. Contactează administratorul.')
        return
      }

      const { error } = await supabase
        .from('shifts')
        .insert({
          shift_date: dateStr,
          shift_type_id: targetShiftTypeId,
          department: targetDepartment,
          hospital_id: user.hospital_id,
          // Working staff (STAFF and DEPARTMENT_MANAGER) auto-assign to themselves
          assigned_to: isWorkingStaff(user.role) ? user.id : null,
          status: isWorkingStaff(user.role) ? 'reserved' : 'available'
        })

      if (!error) {
        const msg = isWorkingStaff(user.role)
          ? `Rezervare creată pentru ${dateInfo}! Va fi confirmată la generarea programului.`
          : 'Tură creată. Poate fi acum rezervată de personal.'
        toast?.success(msg)
        await onRefreshShifts()
      } else {
        toast?.error('Eroare la creare. Încearcă din nou.')
      }
    }
  }, [user, shifts, shiftTypes, onRefreshShifts, toast, checkDeadlineLocked])

  const setPreference = useCallback(async (date: Date, preferenceType: 'unavailable' | 'preferred') => {
    if (!user) return

    // Check deadline lock for working staff
    if (isWorkingStaff(user.role) && checkDeadlineLocked(date)) {
      toast?.error('Termenul limită a expirat. Nu mai poți marca date.')
      return
    }

    const dateStr = formatDateForDB(date)

    // First, remove any existing preference for this date
    await supabase
      .from('unavailable_dates')
      .delete()
      .eq('user_id', user.id)
      .eq('unavailable_date', dateStr)

    // Then insert the new preference
    const { error } = await supabase
      .from('unavailable_dates')
      .insert({
        user_id: user.id,
        unavailable_date: dateStr,
        preference_type: preferenceType
      })

    if (!error) {
      const message = preferenceType === 'preferred'
        ? 'Marcat ca zi preferată. Vei avea prioritate la programare!'
        : 'Marcat indisponibil. Nu vei fi programat în această zi (dacă e posibil).'
      toast?.info(message)
      await onRefreshUnavailable()
    }
  }, [user, onRefreshUnavailable, toast, checkDeadlineLocked])

  // Legacy wrapper for backward compatibility
  const markUnavailable = useCallback(async (date: Date) => {
    await setPreference(date, 'unavailable')
  }, [setPreference])

  const removePreference = useCallback(async (date: Date) => {
    if (!user) return

    // Check deadline lock for working staff
    if (isWorkingStaff(user.role) && checkDeadlineLocked(date)) {
      toast?.error('Termenul limită a expirat. Nu mai poți modifica preferințele.')
      return
    }

    const dateStr = formatDateForDB(date)

    const { error } = await supabase
      .from('unavailable_dates')
      .delete()
      .eq('user_id', user.id)
      .eq('unavailable_date', dateStr)

    if (!error) {
      toast?.info('Preferință ștearsă. Ziua este acum disponibilă pentru programare normală.')
      await onRefreshUnavailable()
    }
  }, [user, onRefreshUnavailable, toast, checkDeadlineLocked])

  // Legacy wrapper for backward compatibility
  const removeUnavailable = useCallback(async (date: Date) => {
    await removePreference(date)
  }, [removePreference])

  const deleteShift = useCallback(async (shiftId: string) => {
    if (!user || user.role === 'STAFF') return

    // DEPARTMENT_MANAGER can only delete shifts in their own department
    if (user.role === 'DEPARTMENT_MANAGER') {
      const shift = shifts.find(s => s.id === shiftId)
      if (!shift || shift.department !== user.department) {
        toast?.error('Poți șterge doar ture din departamentul tău.')
        return
      }
    }

    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('id', shiftId)

    if (!error) {
      toast?.success('Tura a fost ștearsă.')
      await onRefreshShifts()
    } else {
      toast?.error('Nu s-a putut șterge tura.')
    }
  }, [user, shifts, onRefreshShifts, toast])

  const assignShift = useCallback(async (shiftId: string, userId: string | null) => {
    if (!user || user.role === 'STAFF') return

    // DEPARTMENT_MANAGER can only assign shifts in their own department
    if (user.role === 'DEPARTMENT_MANAGER') {
      const shift = shifts.find(s => s.id === shiftId)
      if (!shift || shift.department !== user.department) {
        toast?.error('Poți gestiona doar ture din departamentul tău.')
        return
      }
    }

    const { error } = await supabase
      .from('shifts')
      .update({
        assigned_to: userId,
        status: userId ? 'assigned' : 'available'
      })
      .eq('id', shiftId)

    if (!error) {
      toast?.success(userId ? 'Tura a fost asignată.' : 'Asignarea a fost anulată.')
      await onRefreshShifts()
    } else {
      toast?.error('Nu s-a putut asigna tura.')
    }
  }, [user, shifts, onRefreshShifts, toast])

  const deleteAllShifts = useCallback(async () => {
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'HOSPITAL_ADMIN')) return

    const { error: shiftsError } = await supabase
      .from('shifts')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000')

    const { error: unavailableError } = await supabase
      .from('unavailable_dates')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000')

    if (!shiftsError && !unavailableError) {
      toast?.success('Toate turele și zilele indisponibile au fost șterse!')
      await Promise.all([onRefreshShifts(), onRefreshUnavailable()])
    } else {
      const errors = []
      if (shiftsError) errors.push(`Ture: ${shiftsError.message || 'Unknown error'}`)
      if (unavailableError) errors.push(`Zile indisponibile: ${unavailableError.message || 'Unknown error'}`)
      toast?.error('Eroare la ștergere: ' + errors.join(', '))
    }
  }, [user, onRefreshShifts, onRefreshUnavailable, toast])

  // Wrapper for checkConflicts that uses hook's shifts and shiftTypes
  const checkConflictsForUser = useCallback((userId: string, shiftDate: string): Conflict[] => {
    const targetUser = user?.id === userId ? user : null
    const maxShifts = targetUser?.max_shifts_per_month || 8
    return checkConflicts(userId, shiftDate, shifts, shiftTypes, maxShifts)
  }, [user, shifts, shiftTypes])

  return {
    reserveShift,
    cancelShift,
    createReservation,
    setPreference,
    removePreference,
    markUnavailable,
    removeUnavailable,
    deleteShift,
    assignShift,
    deleteAllShifts,
    checkConflicts: checkConflictsForUser
  }
}
