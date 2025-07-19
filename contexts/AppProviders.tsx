'use client'

import React from 'react'
import { ShiftsProvider } from './ShiftsContext'
import { StaffProvider } from './StaffContext'
import { NotificationsProvider } from './NotificationsContext'

interface AppProvidersProps {
  children: React.ReactNode
}

/**
 * Centralized provider that wraps all the focused context providers
 * This replaces the old bloated DataProvider
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <NotificationsProvider>
      <StaffProvider>
        <ShiftsProvider>
          {children}
        </ShiftsProvider>
      </StaffProvider>
    </NotificationsProvider>
  )
}

/**
 * Convenience hook that provides access to all contexts
 * This maintains backward compatibility while using the new focused contexts
 */
export const useAppData = () => {
  // Import hooks dynamically to avoid circular dependencies
  const { useShifts } = require('./ShiftsContext')
  const { useStaff } = require('./StaffContext')
  const { useNotifications } = require('./NotificationsContext')
  
  const shifts = useShifts()
  const staff = useStaff()
  const notifications = useNotifications()

  return {
    // Shifts
    shifts: shifts.shifts,
    isLoadingShifts: shifts.isLoading,
    shiftsError: shifts.error,
    loadShifts: shifts.loadShifts,
    updateShift: shifts.updateShift,
    refreshShifts: shifts.refreshShifts,
    getShiftsForDate: shifts.getShiftsForDate,
    getShiftsForMonth: shifts.getShiftsForMonth,

    // Staff  
    staff: staff.staff,
    isLoadingStaff: staff.isLoading,
    staffError: staff.error,
    loadStaff: staff.loadStaff,
    refreshStaff: staff.refreshStaff,
    getStaffByHospital: staff.getStaffByHospital,
    getStaffById: staff.getStaffById,
    getAvailableStaff: staff.getAvailableStaff,

    // Notifications
    notifications: notifications.notifications,
    unreadNotificationCount: notifications.unreadCount,
    isLoadingNotifications: notifications.isLoading,
    notificationsError: notifications.error,
    loadNotifications: notifications.loadNotifications,
    markNotificationsAsRead: notifications.markAsRead,
    addNotification: notifications.addNotification,
    removeNotification: notifications.removeNotification,
    clearAllNotifications: notifications.clearAll,

    // Overall loading state
    isLoading: shifts.isLoading || staff.isLoading || notifications.isLoading
  }
}