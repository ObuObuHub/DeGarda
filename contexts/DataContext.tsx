'use client'

/**
 * LEGACY DataContext - DO NOT USE FOR NEW CODE!
 * 
 * This is a compatibility wrapper around the new focused contexts.
 * All new code should use the focused contexts directly:
 * - useShifts() from ShiftsContext
 * - useStaff() from StaffContext  
 * - useNotifications() from NotificationsContext
 * 
 * This wrapper exists only to avoid breaking existing components during migration.
 */

import React, { createContext, useContext, useState, useCallback } from 'react'
import { useShifts } from './ShiftsContext'
import { useStaff } from './StaffContext'
import { useNotifications } from './NotificationsContext'
import { Staff, Shift, ShiftType, Notification } from '@/types'

interface DataContextType {
  // State
  shifts: Record<string, Shift>
  staff: Staff[]
  hospitals: Array<{ id: number; name: string; city: string }>
  notifications: Notification[]
  unreadNotificationCount: number
  isLoading: boolean
  isOffline: boolean
  autoRefresh: boolean
  selectedHospital: string | null
  
  // Methods
  loadShifts: (year: number, month: number, hospitalId?: string) => Promise<void>
  loadStaff: () => Promise<void>
  loadHospitals: () => Promise<void>
  loadNotifications: (userId: string) => Promise<void>
  markNotificationsAsRead: (notificationIds: number[], userId: string) => Promise<void>
  updateShift: (date: string, staffId: string | null, hospitalId: string, type?: ShiftType, department?: string) => Promise<void>
  setAutoRefresh: (enabled: boolean) => void
  setSelectedHospital: (hospitalId: string | null) => void
  refreshData: () => Promise<void>
  addNotification: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export const useData = () => {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}

interface DataProviderProps {
  children: React.ReactNode
}

/**
 * LEGACY WRAPPER - DO NOT USE FOR NEW CODE!
 * This wraps the new focused contexts to maintain backward compatibility
 */
export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  // Legacy state that's not in focused contexts
  const [hospitals, setHospitals] = useState<Array<{ id: number; name: string; city: string }>>([])
  const [isOffline, setIsOffline] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedHospital, setSelectedHospitalState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedHospital') || null
    }
    return null
  })

  // Use the new focused contexts
  const shifts = useShifts()
  const staff = useStaff()
  const notifications = useNotifications()

  // Legacy hospital selection with localStorage
  const setSelectedHospital = useCallback((hospitalId: string | null) => {
    setSelectedHospitalState(hospitalId)
    if (typeof window !== 'undefined') {
      if (hospitalId) {
        localStorage.setItem('selectedHospital', hospitalId)
      } else {
        localStorage.removeItem('selectedHospital')
      }
    }
  }, [])

  // Legacy hospitals loading (should be moved to a HospitalsContext)
  const loadHospitals = useCallback(async () => {
    try {
      const response = await fetch('/api/hospitals', {
        credentials: 'include'
      })
      const data = await response.json()
      if (data.success) {
        setHospitals(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load hospitals:', error)
    }
  }, [])

  // Legacy refresh data method
  const refreshData = useCallback(async () => {
    await Promise.all([
      shifts.refreshShifts(),
      staff.refreshStaff(),
      loadHospitals()
    ])
  }, [shifts.refreshShifts, staff.refreshStaff, loadHospitals])

  // Legacy wrapper values
  const value: DataContextType = {
    // State from focused contexts
    shifts: shifts.shifts,
    staff: staff.staff,
    notifications: notifications.notifications,
    unreadNotificationCount: notifications.unreadCount,
    isLoading: shifts.isLoading || staff.isLoading || notifications.isLoading,
    
    // Legacy state
    hospitals,
    isOffline,
    autoRefresh,
    selectedHospital,
    
    // Methods from focused contexts
    loadShifts: shifts.loadShifts,
    updateShift: shifts.updateShift,
    loadStaff: staff.loadStaff,
    loadNotifications: notifications.loadNotifications,
    markNotificationsAsRead: notifications.markAsRead,
    addNotification: notifications.addNotification,
    
    // Legacy methods
    loadHospitals,
    setAutoRefresh,
    setSelectedHospital,
    refreshData
  }

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}