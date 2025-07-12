'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
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

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const [shifts, setShifts] = useState<Record<string, Shift>>({})
  const [staff, setStaff] = useState<Staff[]>([])
  const [hospitals, setHospitals] = useState<Array<{ id: number; name: string; city: string }>>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isOffline, setIsOffline] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedHospital, setSelectedHospitalState] = useState<string | null>(() => {
    // Load from localStorage on initial render
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedHospital') || null
    }
    return null
  })

  // Persist selected hospital to localStorage
  const setSelectedHospital = (hospitalId: string | null) => {
    setSelectedHospitalState(hospitalId)
    if (typeof window !== 'undefined') {
      if (hospitalId) {
        localStorage.setItem('selectedHospital', hospitalId)
      } else {
        localStorage.removeItem('selectedHospital')
      }
    }
  }

  // Add notification to local state
  const addNotification = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const notification: Notification = {
      id: Date.now(),
      type,
      title: message,
      message,
      read: false,
      created_at: new Date().toISOString()
    }
    setNotifications(prev => [notification, ...prev])
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id))
    }, 5000)
  }, [])

  // Load shifts
  const loadShifts = useCallback(async (year: number, month: number, hospitalId?: string) => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        year: year.toString(),
        month: month.toString()
      })
      if (hospitalId) {
        params.append('hospitalId', hospitalId)
      }
      
      const response = await fetch(`/api/shifts?${params}`)
      if (!response.ok) throw new Error('Failed to fetch shifts')
      
      const data = await response.json()
      if (data.success) {
        setShifts(data.shifts || {})
        setIsOffline(false)
      }
    } catch (error) {
      console.error('Error loading shifts:', error)
      setIsOffline(true)
      addNotification('Failed to load shifts', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [addNotification])

  // Load staff
  const loadStaff = useCallback(async () => {
    try {
      const response = await fetch('/api/staff')
      if (!response.ok) throw new Error('Failed to fetch staff')
      
      const data = await response.json()
      if (data.success) {
        setStaff(data.staff || [])
      }
    } catch (error) {
      console.error('Error loading staff:', error)
      addNotification('Failed to load staff', 'error')
    }
  }, [addNotification])

  // Load hospitals
  const loadHospitals = useCallback(async () => {
    try {
      const response = await fetch('/api/hospitals')
      if (!response.ok) throw new Error('Failed to fetch hospitals')
      
      const data = await response.json()
      if (data.success) {
        setHospitals(data.hospitals || [])
      }
    } catch (error) {
      console.error('Error loading hospitals:', error)
      addNotification('Failed to load hospitals', 'error')
    }
  }, [addNotification])

  // Load notifications
  const loadNotifications = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`/api/notifications?userId=${userId}`)
      if (!response.ok) throw new Error('Failed to fetch notifications')
      
      const data = await response.json()
      if (data.success) {
        setNotifications(data.notifications || [])
        setUnreadNotificationCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    }
  }, [])

  // Mark notifications as read
  const markNotificationsAsRead = useCallback(async (notificationIds: number[], userId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds, userId })
      })
      
      if (!response.ok) throw new Error('Failed to mark notifications as read')
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          notificationIds.includes(n.id) ? { ...n, read: true } : n
        )
      )
      setUnreadNotificationCount(prev => Math.max(0, prev - notificationIds.length))
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
  }, [])

  // Update shift
  const updateShift = useCallback(async (date: string, staffId: string | null, hospitalId: string, type: ShiftType = '24h', department?: string) => {
    try {
      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, staffId, hospitalId, type, department })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update shift')
      }
      
      const data = await response.json()
      if (data.success) {
        // Update local state
        setShifts(prev => ({
          ...prev,
          [date]: {
            ...data.shift,
            doctorId: staffId,
            doctorName: staffId ? staff.find(s => s.id.toString() === staffId)?.name || null : null
          }
        }))
        addNotification('Shift updated successfully', 'success')
      }
    } catch (error) {
      console.error('Error updating shift:', error)
      addNotification(error instanceof Error ? error.message : 'Failed to update shift', 'error')
      throw error
    }
  }, [staff, addNotification])

  // Refresh all data
  const refreshData = useCallback(async () => {
    const promises = [loadHospitals(), loadStaff()]
    await Promise.all(promises)
  }, [loadHospitals, loadStaff])

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return

    const refreshInterval = setInterval(() => {
      // Only refresh if document is visible
      if (document.visibilityState === 'visible') {
        refreshData()
      }
    }, 30000) // 30 seconds

    return () => clearInterval(refreshInterval)
  }, [autoRefresh, refreshData])

  // Sync when document becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && autoRefresh) {
        refreshData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [autoRefresh, refreshData])

  // Load initial data
  useEffect(() => {
    refreshData()
  }, [refreshData])

  const value: DataContextType = {
    // State
    shifts,
    staff,
    hospitals,
    notifications,
    unreadNotificationCount,
    isLoading,
    isOffline,
    autoRefresh,
    selectedHospital,
    
    // Methods
    loadShifts,
    loadStaff,
    loadHospitals,
    loadNotifications,
    markNotificationsAsRead,
    updateShift,
    setAutoRefresh,
    setSelectedHospital,
    refreshData,
    addNotification
  }

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}