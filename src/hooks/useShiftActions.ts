'use client'

import { useCallback } from 'react'
import { supabase, type User, type Shift } from '@/lib/supabase'
import { type ShiftType } from '@/types'
import { formatDateForDB, parseISODate } from '@/lib/dateUtils'

interface UseShiftActionsReturn {
  reserveShift: (shiftId: string) => Promise<void>
  cancelShift: (shiftId: string) => Promise<void>
  createReservation: (date: Date, department?: string, shiftTypeId?: string) => Promise<void>
  markUnavailable: (date: Date) => Promise<void>
  removeUnavailable: (date: Date) => Promise<void>
  deleteShift: (shiftId: string) => Promise<void>
  assignShift: (shiftId: string, userId: string | null) => Promise<void>
  deleteAllShifts: () => Promise<void>
}

export function useShiftActions(
  user: User | null,
  shifts: Shift[],
  shiftTypes: ShiftType[],
  selectedDate: Date,
  onRefreshShifts: () => Promise<void>,
  onRefreshUnavailable: () => Promise<void>
): UseShiftActionsReturn {

  const reserveShift = useCallback(async (shiftId: string) => {
    if (!user) return

    if (user.role === 'STAFF') {
      const { data: shiftData } = await supabase
        .from('shifts')
        .select('department')
        .eq('id', shiftId)
        .single()

      if (!shiftData || shiftData.department !== user.department) {
        alert('Poți rezerva doar ture din departamentul tău!')
        return
      }
    }

    const { error } = await supabase
      .from('shifts')
      .update({ assigned_to: user.id, status: 'reserved' })
      .eq('id', shiftId)
      .eq('status', 'available')

    if (!error) {
      await onRefreshShifts()
    } else {
      alert('Nu s-a putut rezerva tura. Poate a fost deja luată.')
    }
  }, [user, onRefreshShifts])

  const cancelShift = useCallback(async (shiftId: string) => {
    if (!user) return

    const shift = shifts.find(s => s.id === shiftId)

    if (shift && shift.status === 'reserved' && shift.assigned_to === user.id && user.role === 'STAFF') {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', shiftId)

      if (!error) {
        await onRefreshShifts()
      }
    } else {
      const { error } = await supabase
        .from('shifts')
        .update({ assigned_to: null, status: 'available' })
        .eq('id', shiftId)
        .eq('assigned_to', user.id)

      if (!error) {
        await onRefreshShifts()
      }
    }
  }, [user, shifts, onRefreshShifts])

  const createReservation = useCallback(async (date: Date, department?: string, shiftTypeId?: string) => {
    if (!user) return

    if (user.role === 'STAFF') {
      if (!user.department) return

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
        alert('Poți rezerva maxim 2 ture pe lună!')
        return
      }
    }

    const targetDepartment = department || user.department
    if (!targetDepartment) return

    const targetShiftTypeId = shiftTypeId || shiftTypes.find(st => st.is_default)?.id
    if (!targetShiftTypeId) {
      alert('Nu există niciun tip de tură definit. Contactați administratorul.')
      return
    }

    const dateStr = formatDateForDB(date)

    const existingShift = shifts.find(s =>
      s.shift_date === dateStr &&
      s.department === targetDepartment &&
      s.shift_type_id === targetShiftTypeId &&
      s.status === 'available'
    )

    if (existingShift) {
      const { error } = await supabase
        .from('shifts')
        .update({ assigned_to: user.id, status: 'reserved' })
        .eq('id', existingShift.id)

      if (!error) {
        await onRefreshShifts()
      } else {
        alert('Nu s-a putut rezerva tura.')
      }
    } else {
      if (!user.hospital_id) {
        alert('Nu ești asociat unui spital.')
        return
      }

      const { error } = await supabase
        .from('shifts')
        .insert({
          shift_date: dateStr,
          shift_type_id: targetShiftTypeId,
          department: targetDepartment,
          hospital_id: user.hospital_id,
          assigned_to: user.role === 'STAFF' ? user.id : null,
          status: user.role === 'STAFF' ? 'reserved' : 'available'
        })

      if (!error) {
        await onRefreshShifts()
      } else {
        alert('Nu s-a putut crea rezervarea.')
      }
    }
  }, [user, shifts, shiftTypes, onRefreshShifts])

  const markUnavailable = useCallback(async (date: Date) => {
    if (!user) return

    const dateStr = formatDateForDB(date)

    const { error } = await supabase
      .from('unavailable_dates')
      .insert({ user_id: user.id, unavailable_date: dateStr })

    if (!error) {
      await onRefreshUnavailable()
    }
  }, [user, onRefreshUnavailable])

  const removeUnavailable = useCallback(async (date: Date) => {
    if (!user) return

    const dateStr = formatDateForDB(date)

    const { error } = await supabase
      .from('unavailable_dates')
      .delete()
      .eq('user_id', user.id)
      .eq('unavailable_date', dateStr)

    if (!error) {
      await onRefreshUnavailable()
    }
  }, [user, onRefreshUnavailable])

  const deleteShift = useCallback(async (shiftId: string) => {
    if (!user || user.role === 'STAFF') return

    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('id', shiftId)

    if (!error) {
      await onRefreshShifts()
    } else {
      alert('Nu s-a putut șterge tura.')
    }
  }, [user, onRefreshShifts])

  const assignShift = useCallback(async (shiftId: string, userId: string | null) => {
    if (!user || user.role === 'STAFF') return

    const { error } = await supabase
      .from('shifts')
      .update({
        assigned_to: userId,
        status: userId ? 'assigned' : 'available'
      })
      .eq('id', shiftId)

    if (!error) {
      await onRefreshShifts()
    } else {
      alert('Nu s-a putut asigna tura.')
    }
  }, [user, onRefreshShifts])

  const deleteAllShifts = useCallback(async () => {
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'HOSPITAL_ADMIN')) return

    if (!confirm('Sigur vrei să ștergi TOATE turele și zilele indisponibile? Această acțiune nu poate fi anulată!')) {
      return
    }

    const { error: shiftsError } = await supabase
      .from('shifts')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000')

    const { error: unavailableError } = await supabase
      .from('unavailable_dates')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000')

    if (!shiftsError && !unavailableError) {
      alert('Toate turele și zilele indisponibile au fost șterse!')
      await Promise.all([onRefreshShifts(), onRefreshUnavailable()])
    } else {
      const errors = []
      if (shiftsError) errors.push(`Ture: ${shiftsError.message}`)
      if (unavailableError) errors.push(`Zile indisponibile: ${unavailableError.message}`)
      alert('Eroare la ștergere: ' + errors.join(', '))
    }
  }, [user, onRefreshShifts, onRefreshUnavailable])

  return {
    reserveShift,
    cancelShift,
    createReservation,
    markUnavailable,
    removeUnavailable,
    deleteShift,
    assignShift,
    deleteAllShifts
  }
}
