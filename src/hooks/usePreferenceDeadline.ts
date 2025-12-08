'use client'

import { useCallback, useState, useEffect } from 'react'
import { supabase, type User } from '@/lib/supabase'
import { type PreferenceDeadline } from '@/types'

interface ToastFunctions {
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
}

interface UsePreferenceDeadlineReturn {
  deadlines: PreferenceDeadline[]
  isLoading: boolean
  activateDeadline: (departmentId: string, targetMonth: Date) => Promise<boolean>
  getDeadlineForDepartment: (departmentId: string, targetMonth: Date) => PreferenceDeadline | null
  isDeadlineLocked: (departmentId: string, targetMonth: Date) => boolean
  isDeadlineActive: (departmentId: string, targetMonth: Date) => boolean
  getTimeRemaining: (deadline: PreferenceDeadline) => { hours: number; minutes: number; seconds: number } | null
  refreshDeadlines: () => Promise<void>
}

/**
 * Get the first day of a month for a given date
 */
function getFirstDayOfMonth(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

export function usePreferenceDeadline(
  user: User | null,
  hospitalId: string | null,
  toast?: ToastFunctions,
  selectedDate?: Date  // Optional: refresh when month changes
): UsePreferenceDeadlineReturn {
  const [deadlines, setDeadlines] = useState<PreferenceDeadline[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const refreshDeadlines = useCallback(async () => {
    if (!hospitalId) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('preference_deadlines')
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching deadlines:', error)
        return
      }

      setDeadlines(data || [])
    } finally {
      setIsLoading(false)
    }
  }, [hospitalId])

  // Load deadlines on mount and when hospital changes
  useEffect(() => {
    refreshDeadlines()
  }, [refreshDeadlines])

  // Refresh deadlines when selected month changes
  useEffect(() => {
    if (selectedDate) {
      refreshDeadlines()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate?.getMonth(), selectedDate?.getFullYear()])

  const activateDeadline = useCallback(async (
    departmentId: string,
    targetMonth: Date
  ): Promise<boolean> => {
    if (!user || !hospitalId) return false

    // Application-level role check (defense-in-depth since RLS uses anon key)
    const allowedRoles = ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DEPARTMENT_MANAGER']
    if (!allowedRoles.includes(user.role)) {
      console.error('Unauthorized deadline activation attempt:', {
        userId: user.id,
        userRole: user.role,
        requiredRoles: allowedRoles
      })
      toast?.error('Nu aveți permisiunea de a activa termene limită.')
      return false
    }

    const targetMonthStr = getFirstDayOfMonth(targetMonth)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now

    // Check if deadline already exists for this department/month
    const existing = deadlines.find(
      d => d.department_id === departmentId && d.target_month === targetMonthStr
    )

    if (existing) {
      // Update existing deadline
      const { error } = await supabase
        .from('preference_deadlines')
        .update({
          activated_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          activated_by: user.id
        })
        .eq('id', existing.id)

      if (error) {
        console.error('Deadline update failed:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          userId: user.id,
          userRole: user.role,
          deadlineId: existing.id
        })
        toast?.error('Nu s-a putut activa termenul limită.')
        return false
      }

      toast?.success('Termenul limită a fost reactivat! Staff-ul are 24 de ore.')
    } else {
      // Create new deadline
      const { error } = await supabase
        .from('preference_deadlines')
        .insert({
          department_id: departmentId,
          hospital_id: hospitalId,
          target_month: targetMonthStr,
          activated_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          activated_by: user.id
        })

      if (error) {
        console.error('Deadline insert failed:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          userId: user.id,
          userRole: user.role,
          departmentId,
          hospitalId
        })
        toast?.error('Nu s-a putut activa termenul limită.')
        return false
      }

      toast?.success('Termenul limită a fost activat! Staff-ul are 24 de ore.')
    }

    await refreshDeadlines()
    return true
  }, [user, hospitalId, deadlines, refreshDeadlines, toast])

  const getDeadlineForDepartment = useCallback((
    departmentId: string,
    targetMonth: Date
  ): PreferenceDeadline | null => {
    const targetMonthStr = getFirstDayOfMonth(targetMonth)
    return deadlines.find(
      d => d.department_id === departmentId && d.target_month === targetMonthStr
    ) || null
  }, [deadlines])

  const isDeadlineLocked = useCallback((
    departmentId: string,
    targetMonth: Date
  ): boolean => {
    const deadline = getDeadlineForDepartment(departmentId, targetMonth)
    if (!deadline) return false

    const now = new Date()
    const expiresAt = new Date(deadline.expires_at)
    return now > expiresAt
  }, [getDeadlineForDepartment])

  const isDeadlineActive = useCallback((
    departmentId: string,
    targetMonth: Date
  ): boolean => {
    const deadline = getDeadlineForDepartment(departmentId, targetMonth)
    if (!deadline) return false

    const now = new Date()
    const expiresAt = new Date(deadline.expires_at)
    return now <= expiresAt
  }, [getDeadlineForDepartment])

  const getTimeRemaining = useCallback((
    deadline: PreferenceDeadline
  ): { hours: number; minutes: number; seconds: number } | null => {
    const now = new Date()
    const expiresAt = new Date(deadline.expires_at)
    const diff = expiresAt.getTime() - now.getTime()

    if (diff <= 0) return null

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    return { hours, minutes, seconds }
  }, [])

  return {
    deadlines,
    isLoading,
    activateDeadline,
    getDeadlineForDepartment,
    isDeadlineLocked,
    isDeadlineActive,
    getTimeRemaining,
    refreshDeadlines
  }
}
