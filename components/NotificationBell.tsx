'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { usePolling } from '@/hooks/usePolling'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  created_at: string
}

interface NotificationBellProps {
  userId: string
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ userId }) => {
  const [showDropdown, setShowDropdown] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`/api/notifications?userId=${userId}`)
      const data = await response.json()
      
      if (data.success) {
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  // Poll for new notifications
  usePolling(fetchNotifications, [userId], { interval: 30000, enabled: true })

  const markAsRead = async (notificationIds: string[]) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds, userId })
      })
      
      // Update local state
      setNotifications(notifications.map(n => 
        notificationIds.includes(n.id) ? { ...n, read: true } : n
      ))
      setUnreadCount(Math.max(0, unreadCount - notificationIds.length))
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead([notification.id])
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60))
      return `acum ${minutes}m`
    } else if (hours < 24) {
      return `acum ${hours}h`
    } else {
      const days = Math.floor(hours / 24)
      return `acum ${days}z`
    }
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="relative p-2"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-system-red text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          <div className="absolute right-0 mt-2 w-80 z-50">
            <Card className="shadow-lg max-h-96 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-separator">
                <h3 className="font-semibold">Notificări</h3>
              </div>
              
              <div className="overflow-y-auto flex-1">
                {notifications.length > 0 ? (
                  notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-separator cursor-pointer hover:bg-gray-50 ${
                        !notification.read ? 'bg-system-blue/5' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{notification.title}</p>
                          <p className="text-sm text-label-secondary mt-1">
                            {notification.message}
                          </p>
                        </div>
                        <span className="text-xs text-label-tertiary ml-2">
                          {formatTime(notification.created_at)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-label-tertiary">
                    <p>Nu ai notificări noi</p>
                  </div>
                )}
              </div>

              {unreadCount > 0 && (
                <div className="p-3 border-t border-separator">
                  <Button 
                    size="sm" 
                    fullWidth
                    variant="ghost"
                    onClick={() => {
                      const unreadIds = notifications
                        .filter(n => !n.read)
                        .map(n => n.id)
                      markAsRead(unreadIds)
                    }}
                  >
                    Marchează toate ca citite
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}