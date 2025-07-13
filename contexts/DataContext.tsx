'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
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
  
  // Request deduplication
  const pendingRequests = useRef<Map<string, Promise<any>>>(new Map())

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

  // Track timeouts for cleanup
  const notificationTimeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map())

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
    
    // Auto-remove after 5 seconds with proper cleanup
    const timeoutId = setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id))
      notificationTimeoutsRef.current.delete(notification.id)
    }, 5000)
    
    notificationTimeoutsRef.current.set(notification.id, timeoutId)
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
      console.log('Shifts API response:', data)
      if (data.success) {
        console.log('Setting shifts in context:', data.shifts)
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

  // Load staff with deduplication
  const loadStaff = useCallback(async () => {
    const requestKey = 'loadStaff'
    
    // Check if request is already pending
    if (pendingRequests.current.has(requestKey)) {
      return pendingRequests.current.get(requestKey)
    }
    
    const promise = (async () => {
      try {
        const response = await fetch('/api/staff')
        if (!response.ok) throw new Error('Failed to fetch staff')
        
        const data = await response.json()
        // API returns array directly, not wrapped in success object
        setStaff(Array.isArray(data) ? data : (data.staff || []))
      } catch (error) {
        console.error('Error loading staff:', error)
        addNotification('Failed to load staff', 'error')
      } finally {
        pendingRequests.current.delete(requestKey)
      }
    })()
    
    pendingRequests.current.set(requestKey, promise)
    return promise
  }, [addNotification])

  // Load hospitals with deduplication
  const loadHospitals = useCallback(async () => {
    const requestKey = 'loadHospitals'
    
    // Check if request is already pending
    if (pendingRequests.current.has(requestKey)) {
      return pendingRequests.current.get(requestKey)
    }
    
    const promise = (async () => {
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
      } finally {
        pendingRequests.current.delete(requestKey)
      }
    })()
    
    pendingRequests.current.set(requestKey, promise)
    return promise
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
            id: data.shift.id?.toString(),
            doctorId: staffId,
            doctorName: staffId ? staff.find(s => s.id.toString() === staffId)?.name || null : null,
            department: data.shift.department || department,
            type: data.shift.type || type,
            status: data.shift.status,
            hospitalId: data.shift.hospital_id?.toString() || hospitalId
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

  // Track last refresh time to prevent duplicate refreshes
  const lastRefreshRef = useRef<Date>(new Date())
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced refresh to prevent multiple simultaneous calls
  const debouncedRefresh = useCallback(() => {
    // Cancel any pending refresh
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }

    // Check if enough time has passed since last refresh (5 seconds minimum)
    const timeSinceLastRefresh = Date.now() - lastRefreshRef.current.getTime()
    if (timeSinceLastRefresh < 5000) {
      return
    }

    refreshTimeoutRef.current = setTimeout(() => {
      lastRefreshRef.current = new Date()
      refreshData()
    }, 1000) // 1 second debounce
  }, [refreshData])

  // Combined auto-refresh and visibility change handling
  useEffect(() => {
    if (!autoRefresh) return

    let refreshInterval: NodeJS.Timeout

    const startRefreshInterval = () => {
      refreshInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          debouncedRefresh()
        }
      }, 60000) // Increased to 60 seconds to reduce CPU usage
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && autoRefresh) {
        // Clear and restart interval when becoming visible
        if (refreshInterval) clearInterval(refreshInterval)
        debouncedRefresh()
        startRefreshInterval()
      } else if (document.visibilityState === 'hidden') {
        // Stop polling when hidden
        if (refreshInterval) clearInterval(refreshInterval)
      }
    }

    // Start initial interval
    startRefreshInterval()

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (refreshInterval) clearInterval(refreshInterval)
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [autoRefresh, debouncedRefresh])

  // Load initial data
  useEffect(() => {
    refreshData()
  }, [refreshData])

  // Cleanup notification timeouts on unmount
  useEffect(() => {
    return () => {
      // Clear all notification timeouts
      notificationTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
      notificationTimeoutsRef.current.clear()
    }
  }, [])

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