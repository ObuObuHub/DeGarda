'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, type User, type Shift, type UnavailableDate, type SwapRequest } from '@/lib/supabase'
import { type ShiftType, type Department } from '@/types'
import { formatDateForDB, getFirstDayOfMonth, getLastDayOfMonth } from '@/lib/dateUtils'

interface UseDashboardDataReturn {
  shifts: Shift[]
  shiftTypes: ShiftType[]
  departments: Department[]
  unavailableDates: UnavailableDate[]
  swapRequests: SwapRequest[]
  allUsers: User[]
  loading: boolean
  loadShifts: () => Promise<void>
  loadUnavailableDates: () => Promise<void>
  loadSwapRequests: () => Promise<void>
  loadUsers: () => Promise<void>
}

export function useDashboardData(
  user: User | null,
  selectedDate: Date
): UseDashboardDataReturn {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [unavailableDates, setUnavailableDates] = useState<UnavailableDate[]>([])
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const loadShifts = useCallback(async () => {
    if (!user) return

    const startOfMonth = getFirstDayOfMonth(selectedDate)
    const endOfMonth = getLastDayOfMonth(selectedDate)

    let query = supabase
      .from('shifts')
      .select(`
        *,
        user:assigned_to(name, department, role),
        shift_type:shift_types(id, name, start_time, end_time, duration_hours)
      `)
      .gte('shift_date', formatDateForDB(startOfMonth))
      .lte('shift_date', formatDateForDB(endOfMonth))
      .order('shift_date')

    if (user.role !== 'SUPER_ADMIN' && user.hospital_id) {
      query = query.eq('hospital_id', user.hospital_id)
    }

    const { data } = await query
    setShifts(data || [])
  }, [user, selectedDate])

  const loadShiftTypes = useCallback(async () => {
    if (!user) return

    let query = supabase
      .from('shift_types')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (user.role !== 'SUPER_ADMIN' && user.hospital_id) {
      query = query.eq('hospital_id', user.hospital_id)
    }

    const { data } = await query
    setShiftTypes(data || [])
  }, [user])

  const loadDepartments = useCallback(async () => {
    if (!user) return

    let query = supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (user.role !== 'SUPER_ADMIN' && user.hospital_id) {
      query = query.eq('hospital_id', user.hospital_id)
    }

    const { data } = await query
    setDepartments(data || [])
  }, [user])

  const loadUnavailableDates = useCallback(async () => {
    if (!user) return

    const query = supabase
      .from('unavailable_dates')
      .select('*')

    if (user.role === 'STAFF') {
      query.eq('user_id', user.id)
    }

    const { data } = await query
    setUnavailableDates(data || [])
  }, [user])

  const loadSwapRequests = useCallback(async () => {
    if (!user) return

    const { data } = await supabase
      .from('swap_requests')
      .select(`
        *,
        requester:users!requester_id(name, department),
        target_user:users!target_user_id(name, department),
        requester_shift:shifts!requester_shift_id(shift_date, department),
        target_shift:shifts!target_shift_id(shift_date, department)
      `)
      .or(`requester_id.eq.${user.id},target_user_id.eq.${user.id}`)
      .eq('status', 'pending')

    setSwapRequests(data || [])
  }, [user])

  const loadUsers = useCallback(async () => {
    if (!user) return

    let query = supabase
      .from('users')
      .select('*, hospital:hospitals(name, code)')
      .order('name')

    if (user.role !== 'SUPER_ADMIN' && user.hospital_id) {
      query = query.eq('hospital_id', user.hospital_id)
    }

    const { data } = await query
    setAllUsers(data || [])
  }, [user])

  // Load all data when user or date changes
  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const loadAllData = async () => {
      setLoading(true)
      await Promise.all([
        loadShifts(),
        loadShiftTypes(),
        loadDepartments(),
        loadUnavailableDates(),
        loadSwapRequests(),
        user.role !== 'STAFF' ? loadUsers() : Promise.resolve()
      ])
      setLoading(false)
    }

    loadAllData()
  }, [user, selectedDate, loadShifts, loadShiftTypes, loadDepartments, loadUnavailableDates, loadSwapRequests, loadUsers])

  return {
    shifts,
    shiftTypes,
    departments,
    unavailableDates,
    swapRequests,
    allUsers,
    loading,
    loadShifts,
    loadUnavailableDates,
    loadSwapRequests,
    loadUsers
  }
}
