'use client'

import { useState, useRef, useEffect } from 'react'
import { type Shift, type SwapRequest, type User } from '@/lib/supabase'
import { parseISODate } from '@/lib/dateUtils'

interface Notification {
  id: string
  type: 'swap_request' | 'shift_assigned' | 'shift_available' | 'reminder'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
}

interface NotificationBellProps {
  shifts: Shift[]
  swapRequests: SwapRequest[]
  currentUser: User
  onAcceptSwap?: (swapRequestId: string) => void
  onRejectSwap?: (swapRequestId: string) => void
}

export default function NotificationBell({
  shifts,
  swapRequests,
  currentUser,
  onAcceptSwap,
  onRejectSwap
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set())
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Generate notifications from current data
  const notifications: Notification[] = []

  // Incoming swap requests
  const incomingSwaps = swapRequests.filter(sr =>
    sr.target_user_id === currentUser.id &&
    sr.status === 'pending'
  )

  incomingSwaps.forEach(sr => {
    const requesterShift = shifts.find(s => s.id === sr.requester_shift_id)
    const requesterName = requesterShift?.user?.name || 'Cineva'
    const targetShift = shifts.find(s => s.id === sr.target_shift_id)
    const targetDate = targetShift ? parseISODate(targetShift.shift_date) : null

    notifications.push({
      id: `swap-${sr.id}`,
      type: 'swap_request',
      title: 'Cerere de schimb',
      message: `${requesterName} dorește să schimbe tura${targetDate ? ` din ${formatDate(targetDate)}` : ''}`,
      timestamp: new Date(sr.created_at || Date.now()),
      read: readNotificationIds.has(`swap-${sr.id}`)
    })
  })

  // Available shifts in user's department (if staff)
  if (currentUser.role === 'STAFF') {
    const today = new Date()
    const availableShifts = shifts.filter(s =>
      s.status === 'available' &&
      s.department === currentUser.department &&
      parseISODate(s.shift_date) >= today
    ).slice(0, 3) // Limit to 3

    availableShifts.forEach(shift => {
      const shiftDate = parseISODate(shift.shift_date)
      notifications.push({
        id: `available-${shift.id}`,
        type: 'shift_available',
        title: 'Tură disponibilă',
        message: `Tură disponibilă pe ${formatDate(shiftDate)} în ${shift.department}`,
        timestamp: new Date(shift.created_at || Date.now()),
        read: readNotificationIds.has(`available-${shift.id}`)
      })
    })

    // Shifts assigned to user in next 7 days (reminders)
    const upcomingShifts = shifts.filter(s => {
      if (s.assigned_to !== currentUser.id) return false
      const shiftDate = parseISODate(s.shift_date)
      const diffDays = Math.ceil((shiftDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return diffDays >= 0 && diffDays <= 2
    })

    upcomingShifts.forEach(shift => {
      const shiftDate = parseISODate(shift.shift_date)
      const diffDays = Math.ceil((shiftDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      notifications.push({
        id: `reminder-${shift.id}`,
        type: 'reminder',
        title: diffDays === 0 ? 'Tura de azi' : diffDays === 1 ? 'Tură mâine' : 'Tură în curând',
        message: `Ai tură în ${shift.department} pe ${formatDate(shiftDate)}`,
        timestamp: new Date(),
        read: readNotificationIds.has(`reminder-${shift.id}`)
      })
    })
  }

  // Sort by timestamp (newest first)
  notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = (id: string) => {
    setReadNotificationIds(prev => new Set([...prev, id]))
  }

  const markAllAsRead = () => {
    setReadNotificationIds(new Set(notifications.map(n => n.id)))
  }

  const formatDate = (date: Date) => {
    const dayNames = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm']
    return `${dayNames[date.getDay()]} ${date.getDate()}.${String(date.getMonth() + 1).padStart(2, '0')}`
  }

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'swap_request': return '🔄'
      case 'shift_assigned': return '✅'
      case 'shift_available': return '📅'
      case 'reminder': return '⏰'
      default: return '📌'
    }
  }

  const handleSwapAction = (swapId: string, action: 'accept' | 'reject') => {
    const swapRequestId = swapId.replace('swap-', '')
    if (action === 'accept' && onAcceptSwap) {
      onAcceptSwap(swapRequestId)
    } else if (action === 'reject' && onRejectSwap) {
      onRejectSwap(swapRequestId)
    }
    markAsRead(swapId)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        aria-label={`Notificări${unreadCount > 0 ? ` (${unreadCount} necitite)` : ''}`}
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="p-3 border-b flex items-center justify-between bg-gray-50">
            <h3 className="font-semibold text-sm">Notificări</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Marchează toate citite
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Nu ai notificări noi
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{getIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">{notification.title}</p>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{notification.message}</p>

                      {/* Action buttons for swap requests */}
                      {notification.type === 'swap_request' && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSwapAction(notification.id, 'accept')
                            }}
                            className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                          >
                            Acceptă
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSwapAction(notification.id, 'reject')
                            }}
                            className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Refuză
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
