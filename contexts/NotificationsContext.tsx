'use client'

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { useApi } from '@/hooks/useApi'
import { Notification } from '@/types'

interface NotificationsContextType {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error: string | null
  loadNotifications: (userId: string) => Promise<void>
  markAsRead: (notificationIds: number[], userId: string) => Promise<void>
  addNotification: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void
  removeNotification: (id: number) => void
  clearAll: () => void
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

export const useNotifications = () => {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider')
  }
  return context
}

interface NotificationsProviderProps {
  children: React.ReactNode
}

export const NotificationsProvider: React.FC<NotificationsProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([])
  
  // Track timeouts for auto-removal
  const timeouts = useRef<Map<number, NodeJS.Timeout>>(new Map())
  const nextLocalId = useRef(-1) // Use negative IDs for local notifications

  // Use our standardized API hook
  const notificationsApi = useApi({ 
    logContext: 'NotificationsContext',
    onSuccess: (data) => {
      if (Array.isArray(data)) {
        setNotifications(data)
      }
    }
  })

  const loadNotifications = useCallback(async (userId: string) => {
    try {
      await notificationsApi.get(`/api/notifications?userId=${userId}`)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    }
  }, [notificationsApi])

  const markAsRead = useCallback(async (notificationIds: number[], userId: string) => {
    try {
      await notificationsApi.post('/api/notifications/mark-read', {
        notificationIds,
        userId
      })
      
      // Update local state optimistically
      setNotifications(prev => 
        prev.map(notification =>
          notificationIds.includes(notification.id)
            ? { ...notification, is_read: true }
            : notification
        )
      )
    } catch (error) {
      console.error('Failed to mark notifications as read:', error)
    }
  }, [notificationsApi])

  const addNotification = useCallback((
    message: string, 
    type: 'success' | 'error' | 'info' | 'warning' = 'info'
  ) => {
    const id = nextLocalId.current--
    const notification: Notification = {
      id,
      message,
      type,
      created_at: new Date().toISOString(),
      is_read: false
    }

    setLocalNotifications(prev => [notification, ...prev])

    // Auto-remove success and info notifications after 5 seconds
    if (type === 'success' || type === 'info') {
      const timeout = setTimeout(() => {
        removeNotification(id)
      }, 5000)
      
      timeouts.current.set(id, timeout)
    }
  }, [])

  const removeNotification = useCallback((id: number) => {
    // Clear any pending timeout
    const timeout = timeouts.current.get(id)
    if (timeout) {
      clearTimeout(timeout)
      timeouts.current.delete(id)
    }

    // Remove from local notifications (server notifications should be handled differently)
    if (id < 0) {
      setLocalNotifications(prev => prev.filter(n => n.id !== id))
    }
  }, [])

  const clearAll = useCallback(() => {
    // Clear all timeouts
    timeouts.current.forEach(timeout => clearTimeout(timeout))
    timeouts.current.clear()
    
    // Clear local notifications
    setLocalNotifications([])
  }, [])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeouts.current.forEach(timeout => clearTimeout(timeout))
    }
  }, [])

  // Combine server and local notifications
  const allNotifications = [...localNotifications, ...notifications]
  const unreadCount = allNotifications.filter(n => !n.is_read).length

  const value: NotificationsContextType = {
    notifications: allNotifications,
    unreadCount,
    isLoading: notificationsApi.isLoading,
    error: notificationsApi.error,
    loadNotifications,
    markAsRead,
    addNotification,
    removeNotification,
    clearAll
  }

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}