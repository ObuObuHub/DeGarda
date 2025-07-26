'use client'

import { useState } from 'react'
import { type User, type Shift, type UnavailableDate } from '@/lib/supabase'
import { DEPARTMENT_COLORS } from '@/types'

interface CalendarProps {
  shifts: Shift[]
  unavailableDates: UnavailableDate[]
  onReserveShift: (shiftId: string) => void
  onCancelShift: (shiftId: string) => void
  onMarkUnavailable: (date: Date) => void
  onRemoveUnavailable: (date: Date) => void
  currentUser: User
  selectedDate: Date
  onDateChange: (date: Date) => void
  pendingSwapRequests?: { from_shift_id: string; to_shift_id: string }[]
}

export default function Calendar({ 
  shifts,
  unavailableDates,
  onReserveShift,
  onCancelShift,
  onMarkUnavailable,
  onRemoveUnavailable,
  currentUser, 
  selectedDate, 
  onDateChange,
  pendingSwapRequests = []
}: CalendarProps) {
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay()) // Start from Sunday
    
    const days = []
    const current = new Date(startDate)
    
    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }

  const getShiftsForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return shifts.filter(shift => shift.shift_date === dateStr)
  }

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('ro-RO', { 
      month: 'long', 
      year: 'numeric' 
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === selectedDate.getMonth()
  }

  const isUnavailable = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return unavailableDates.some(
      ud => ud.user_id === currentUser.id && ud.unavailable_date === dateStr
    )
  }

  const getUserShiftsCount = () => {
    return shifts.filter(shift => shift.assigned_to === currentUser.id).length
  }

  const getShiftStatus = (shift: Shift) => {
    const isPending = pendingSwapRequests.some(
      req => req.from_shift_id === shift.id || req.to_shift_id === shift.id
    )
    
    if (shift.assigned_to === currentUser.id) {
      return isPending ? 'your-shift-pending' : 'your-shift'
    } else if (shift.status === 'available') {
      return 'available'
    } else {
      return isPending ? 'other-shift-pending' : 'other-shift'
    }
  }

  const getShiftIcon = (shift: Shift) => {
    return '📅' // Single icon for 24-hour shifts
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
    onDateChange(newDate)
  }

  const days = getDaysInMonth(selectedDate)
  const weekDays = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Săm']

  const handleShiftClick = (shift: Shift, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    const status = getShiftStatus(shift)
    
    if (status === 'your-shift' || status === 'your-shift-pending' || status === 'available') {
      setSelectedShift(shift)
      setContextMenuPosition({ x: event.clientX, y: event.clientY })
      setShowContextMenu(true)
    }
  }

  const handleDateClick = (date: Date, event: React.MouseEvent) => {
    if (!isCurrentMonth(date) || date < new Date()) return
    
    if (event.shiftKey || event.ctrlKey) {
      if (isUnavailable(date)) {
        onRemoveUnavailable(date)
      } else {
        onMarkUnavailable(date)
      }
    }
  }

  const closeContextMenu = () => {
    setShowContextMenu(false)
    setSelectedShift(null)
  }

  return (
    <div className="card">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
        <button
          onClick={() => navigateMonth('prev')}
          className="btn btn-secondary"
        >
          ← Luna precedentă
        </button>
        
        <div className="text-center">
          <h2 className="text-xl font-semibold capitalize">
            {formatMonth(selectedDate)}
          </h2>
          <p className="text-sm text-gray-600">
            Ai {getUserShiftsCount()} ture luna aceasta
          </p>
        </div>
        
        <button
          onClick={() => navigateMonth('next')}
          className="btn btn-secondary"
        >
          Luna următoare →
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
        {/* Week day headers */}
        {weekDays.map((day) => (
          <div
            key={day}
            className="bg-gray-100 px-3 py-2 text-center text-sm font-medium text-gray-700"
          >
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {days.map((date) => {
          const dayShifts = getShiftsForDay(date)
          const isCurrentMonthDay = isCurrentMonth(date)
          const unavailable = isUnavailable(date)
          const isPastDate = date < new Date(new Date().setHours(0,0,0,0))
          
          return (
            <div
              key={date.toISOString()}
              className={`calendar-day bg-white relative ${
                !isCurrentMonthDay ? 'opacity-40' : ''
              } ${isToday(date) ? 'bg-blue-50 border-2 border-blue-300' : ''} ${
                unavailable ? 'bg-gray-100' : ''
              } ${isPastDate ? 'opacity-60' : ''}`}
              onClick={(e) => handleDateClick(date, e)}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-sm font-medium ${
                  isToday(date) ? 'text-blue-700' : 'text-gray-900'
                }`}>
                  {date.getDate()}
                </span>
                {unavailable && (
                  <span className="text-xs text-gray-500" title="Indisponibil">
                    🚫
                  </span>
                )}
              </div>
              
              <div className="space-y-1">
                {dayShifts.map((shift) => {
                  const status = getShiftStatus(shift)
                  
                  return (
                    <div
                      key={shift.id}
                      className={`shift-badge cursor-pointer transition-all ${
                        status === 'your-shift' 
                          ? 'ring-2 ring-yellow-400 shadow-md' 
                          : status === 'your-shift-pending'
                          ? 'ring-2 ring-orange-400 shadow-md opacity-80'
                          : status === 'available'
                          ? 'hover:shadow-md hover:scale-105'
                          : status === 'other-shift-pending'
                          ? 'opacity-60'
                          : 'opacity-80'
                      }`}
                      style={{ 
                        backgroundColor: DEPARTMENT_COLORS[shift.department] 
                      }}
                      onClick={(e) => handleShiftClick(shift, e)}
                      title={`${shift.department} - 24 ore - ${
                        shift.user?.name || 'Disponibil'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">
                          {shift.department.substring(0, 3)}
                        </span>
                        <span className="text-xs">
                          {getShiftIcon(shift)}
                        </span>
                      </div>
                      
                      {status === 'your-shift' && (
                        <div className="text-xs font-bold">TU</div>
                      )}
                      {status === 'available' && (
                        <div className="text-xs opacity-90">Liber</div>
                      )}
                      {(status === 'your-shift-pending' || status === 'other-shift-pending') && (
                        <div className="text-xs">⏳</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Enhanced Legend */}
      <div className="mt-6 border-t pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700">Departamente:</h4>
            {Object.entries(DEPARTMENT_COLORS).map(([dept, color]) => (
              <div key={dept} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-gray-600">{dept}</span>
              </div>
            ))}
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700">Ture:</h4>
            <div className="flex items-center gap-2">
              <span>🌅</span>
              <span className="text-xs text-gray-600">Dimineață</span>
            </div>
            <div className="flex items-center gap-2">
              <span>☀️</span>
              <span className="text-xs text-gray-600">Amiază</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🌙</span>
              <span className="text-xs text-gray-600">Noapte</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700">Status:</h4>
            <div className="flex items-center gap-2">
              <div className="w-12 h-4 bg-yellow-300 rounded-sm ring-2 ring-yellow-400"></div>
              <span className="text-xs text-gray-600">Tura ta</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-4 bg-gray-300 rounded-sm opacity-80"></div>
              <span className="text-xs text-gray-600">Disponibil</span>
            </div>
            <div className="flex items-center gap-2">
              <span>⏳</span>
              <span className="text-xs text-gray-600">În așteptare</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700">Acțiuni:</h4>
            <p className="text-xs text-gray-600">Click pe tură pentru opțiuni</p>
            <p className="text-xs text-gray-600">Ctrl+Click pe zi pentru disponibilitate</p>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {showContextMenu && selectedShift && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={closeContextMenu}
          />
          <div
            className="fixed bg-white rounded-lg shadow-lg border p-2 z-50 min-w-[180px]"
            style={{ 
              left: `${contextMenuPosition.x}px`, 
              top: `${contextMenuPosition.y}px` 
            }}
          >
            {getShiftStatus(selectedShift) === 'available' ? (
              <button
                onClick={() => {
                  onReserveShift(selectedShift.id)
                  closeContextMenu()
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
              >
                ✅ Rezervă tura
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    onCancelShift(selectedShift.id)
                    closeContextMenu()
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                >
                  ❌ Anulează tura
                </button>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                  onClick={() => {
                    // Will implement swap request
                    closeContextMenu()
                  }}
                >
                  🔄 Solicită schimb
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}