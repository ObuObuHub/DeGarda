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
  onDeleteShift?: (shiftId: string) => void
  onCreateReservation?: (date: Date) => void
  onRequestSwap?: (shiftId: string) => void
  onAssignShift?: (shiftId: string, userId: string | null) => void
  currentUser: User
  selectedDate: Date
  onDateChange: (date: Date) => void
  pendingSwapRequests?: { from_shift_id: string; to_shift_id: string }[]
  department?: string
  users?: User[]
}

export default function Calendar({ 
  shifts,
  unavailableDates,
  onReserveShift,
  onCancelShift,
  onMarkUnavailable,
  onRemoveUnavailable,
  onDeleteShift,
  onCreateReservation,
  onRequestSwap,
  onAssignShift,
  currentUser, 
  selectedDate, 
  onDateChange,
  pendingSwapRequests = [],
  department,
  users = []
}: CalendarProps) {
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [showAssignMenu, setShowAssignMenu] = useState(false)
  
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
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

  const getReservedShiftsCount = () => {
    const month = selectedDate.getMonth()
    const year = selectedDate.getFullYear()
    return shifts.filter(shift => {
      const shiftDate = new Date(shift.shift_date)
      return shift.assigned_to === currentUser.id &&
             shift.status === 'reserved' &&
             shiftDate.getMonth() === month &&
             shiftDate.getFullYear() === year
    }).length
  }

  const getShiftStatus = (shift: Shift) => {
    if (shift.status === 'pending_swap') {
      return 'pending-swap'
    }
    
    if (shift.assigned_to === currentUser.id) {
      return 'your-shift'
    } else if (shift.status === 'available') {
      return 'available'
    } else {
      return 'other-shift'
    }
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
    
    // Admin can interact with any shift
    if (currentUser.role === 'ADMIN' || 
        status === 'your-shift' || 
        status === 'your-shift-pending' || 
        status === 'available') {
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
    <div className={department ? "p-4" : "card"}>
      {/* Calendar Header - only show if not in department view */}
      {!department && (
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
              Turele tale: {getUserShiftsCount()} din {currentUser.max_shifts_per_month || 8}
            </p>
            {onCreateReservation && (
              <p className="text-sm text-gray-600">
                Rezervări: {getReservedShiftsCount()} din 2
              </p>
            )}
          </div>
          
          <button
            onClick={() => navigateMonth('next')}
            className="btn btn-secondary"
          >
            Luna următoare →
          </button>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
        {/* Week day headers */}
        {weekDays.map((day) => (
          <div
            key={day}
            className="bg-gray-100 px-1 md:px-3 py-2 text-center text-xs md:text-sm font-medium text-gray-700"
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
              data-date={date.toISOString().split('T')[0]}
              className={`calendar-day bg-white relative overflow-hidden ${
                !isCurrentMonthDay ? 'opacity-40' : ''
              } ${isToday(date) ? 'bg-blue-50 border-2 border-blue-300' : ''} ${
                unavailable ? 'bg-gray-100' : ''
              } ${isPastDate ? 'opacity-60' : ''}`}
              onClick={(e) => handleDateClick(date, e)}
            >
              <div className="absolute top-1 left-2 z-10 flex justify-between items-start w-full pr-4">
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
              
              <div className="absolute inset-0 flex flex-col">
                {dayShifts.map((shift, index) => {
                  const status = getShiftStatus(shift)
                  const shiftCount = dayShifts.length
                  
                  return (
                    <div
                      key={shift.id}
                      className={`flex-1 cursor-pointer transition-all ${
                        status === 'your-shift' 
                          ? 'ring-4 ring-yellow-500 ring-offset-2' 
                          : status === 'pending-swap'
                          ? 'ring-2 ring-orange-500 shadow-md animate-pulse'
                          : status === 'available'
                          ? 'hover:shadow-md hover:scale-105 border-2 border-dashed border-gray-300'
                          : ''
                      } ${index > 0 ? 'border-t-2 border-white' : ''}`}
                      style={{ 
                        backgroundColor: status === 'your-shift' 
                          ? '#FCD34D' // Yellow for user's shifts
                          : status === 'pending-swap'
                          ? '#FB923C' // Orange for pending swap
                          : status === 'available' 
                          ? 'transparent'
                          : DEPARTMENT_COLORS[shift.department] 
                      }}
                      onClick={(e) => handleShiftClick(shift, e)}
                      title={`${shift.department} - 24 ore - ${
                        shift.user?.name || 'Disponibil'
                      }${
                        shift.status === 'reserved' ? ' (Rezervat)' : 
                        shift.status === 'assigned' ? ' (Asignat)' : ''
                      }`}
                    >
                      {/* Show staff name or availability */}
                      {shift.user ? (
                        <div className="flex items-center justify-center h-full">
                          <div className={`text-xs font-semibold ${
                            status === 'your-shift' || status === 'your-shift-pending' 
                              ? 'text-gray-800' 
                              : 'text-white'
                          }`}>
                            {shift.user.name.split(' ')[0]}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <span className="text-2xl text-gray-400">+</span>
                        </div>
                      )}
                      
                      {/* Status indicators - small corner badges */}
                      {(shift.status === 'reserved' || shift.status === 'assigned' || shift.status === 'pending_swap') && (
                        <div className="absolute top-0.5 right-0.5">
                          {shift.status === 'reserved' && (
                            <span className="text-xs bg-white/20 rounded px-0.5">R</span>
                          )}
                          {shift.status === 'assigned' && (
                            <span className="text-xs text-white">✓</span>
                          )}
                          {shift.status === 'pending_swap' && (
                            <span className="text-xs animate-pulse">🔄</span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
                
              </div>
              
              {/* Add reservation button for empty cells */}
              {dayShifts.length === 0 && 
               isCurrentMonthDay && 
               !isPastDate && 
               onCreateReservation && 
               currentUser.department && (
                <button
                  className="absolute inset-0 border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all flex items-center justify-center group"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCreateReservation(date)
                  }}
                  title="Rezervă această dată"
                >
                  <span className="text-gray-400 group-hover:text-gray-600 text-3xl mt-4">+</span>
                </button>
              )}
            </div>
          )
        })}
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
            {(currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER') ? (
              <>
                {selectedShift.assigned_to && (
                  <button
                    onClick={() => {
                      setShowAssignMenu(true)
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                  >
                    👥 Reasignează tura
                  </button>
                )}
                {!selectedShift.assigned_to && (
                  <button
                    onClick={() => {
                      setShowAssignMenu(true)
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                  >
                    👥 Asignează tura
                  </button>
                )}
                {selectedShift.assigned_to && (
                  <button
                    onClick={() => {
                      if (onAssignShift) {
                        onAssignShift(selectedShift.id, null)
                      }
                      closeContextMenu()
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                  >
                    🔓 Marchează disponibil
                  </button>
                )}
                {currentUser.role === 'ADMIN' && (
                  <button
                    onClick={() => {
                      if (onDeleteShift) {
                        onDeleteShift(selectedShift.id)
                      }
                      closeContextMenu()
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-red-100 rounded text-sm text-red-600"
                  >
                    🗑️ Șterge tura
                  </button>
                )}
              </>
            ) : getShiftStatus(selectedShift) === 'your-shift' ? (
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
                  onClick={() => {
                    if (onRequestSwap) {
                      onRequestSwap(selectedShift.id)
                    }
                    closeContextMenu()
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                >
                  🔄 Solicită schimb
                </button>
              </>
            ) : getShiftStatus(selectedShift) === 'available' ? (
              <button
                onClick={() => {
                  onReserveShift(selectedShift.id)
                  closeContextMenu()
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
              >
                ✅ Rezervă tura
              </button>
            ) : null}
          </div>
        </>
      )}
      
      {/* Staff Assignment Menu */}
      {showAssignMenu && selectedShift && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => {
              setShowAssignMenu(false)
              closeContextMenu()
            }}
          />
          <div
            className="fixed bg-white rounded-lg shadow-lg border p-4 z-50 min-w-[200px] max-h-80 overflow-y-auto"
            style={{ 
              left: `${contextMenuPosition.x + 190}px`, 
              top: `${contextMenuPosition.y}px` 
            }}
          >
            <h3 className="font-medium text-gray-900 mb-2">Alege personal:</h3>
            <div className="space-y-1">
              {users.filter(u => u.role === 'STAFF').map(user => (
                <button
                  key={user.id}
                  onClick={() => {
                    if (onAssignShift) {
                      onAssignShift(selectedShift.id, user.id)
                    }
                    setShowAssignMenu(false)
                    closeContextMenu()
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                >
                  {user.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}