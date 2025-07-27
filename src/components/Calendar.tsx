'use client'

import { useState, useEffect } from 'react'
import { type User, type Shift, type UnavailableDate, type SwapRequest } from '@/lib/supabase'
import { DEPARTMENT_COLORS } from '@/types'

interface CalendarProps {
  shifts: Shift[]
  unavailableDates: UnavailableDate[]
  swapRequests?: SwapRequest[]
  onReserveShift: (shiftId: string) => void
  onCancelShift: (shiftId: string) => void
  onMarkUnavailable: (date: Date) => void
  onRemoveUnavailable: (date: Date) => void
  onDeleteShift?: (shiftId: string) => void
  onCreateReservation?: (date: Date, department?: string) => void
  onRequestSwap?: (requesterShiftId: string, targetShiftIds: string[]) => void
  onAssignShift?: (shiftId: string, userId: string | null) => void
  onAcceptSwap?: (swapRequestId: string) => void
  onRejectSwap?: (swapRequestId: string) => void
  currentUser: User
  selectedDate: Date
  onDateChange: (date: Date) => void
  department?: string
  users?: User[]
}

export default function Calendar({ 
  shifts,
  unavailableDates,
  swapRequests = [],
  onReserveShift,
  onCancelShift,
  onMarkUnavailable,
  onRemoveUnavailable,
  onDeleteShift,
  onCreateReservation,
  onRequestSwap,
  onAssignShift,
  onAcceptSwap,
  onRejectSwap,
  currentUser, 
  selectedDate, 
  onDateChange,
  department,
  users = []
}: CalendarProps) {
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [showAssignMenu, setShowAssignMenu] = useState(false)
  const [selectedForSwap, setSelectedForSwap] = useState<Shift | null>(null)
  const [selectedTargetShifts, setSelectedTargetShifts] = useState<Set<string>>(new Set())
  const [showSwapMenu, setShowSwapMenu] = useState<string | null>(null)
  
  // Helper functions for swap requests
  const getIncomingSwapRequests = (shiftId: string) => {
    return swapRequests.filter(sr => 
      sr.target_shift_id === shiftId && 
      sr.target_user_id === currentUser.id &&
      sr.status === 'pending'
    )
  }
  
  const getOutgoingSwapRequests = (shiftId: string) => {
    return swapRequests.filter(sr => 
      sr.requester_shift_id === shiftId && 
      sr.requester_id === currentUser.id &&
      sr.status === 'pending'
    )
  }
  
  // Add keyboard listener for Escape key to cancel swap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedForSwap) {
        setSelectedForSwap(null)
        setSelectedTargetShifts(new Set())
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedForSwap])
  
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

  const handleShiftClick = async (shift: Shift, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    const status = getShiftStatus(shift)
    const incomingRequests = getIncomingSwapRequests(shift.id)
    
    // If clicking on a shift with incoming requests, show the swap menu
    if (incomingRequests.length > 0 && status === 'your-shift') {
      setContextMenuPosition({ x: event.clientX, y: event.clientY })
      setShowSwapMenu(shift.id)
      return
    }
    
    // If there's a shift selected for swap
    if (selectedForSwap) {
      // Can't swap with the same shift
      if (selectedForSwap.id === shift.id) {
        // If user clicks their selected shift again, confirm sending requests
        if (selectedTargetShifts.size > 0) {
          if (confirm(`Trimite cereri de schimb către ${selectedTargetShifts.size} ture?`)) {
            // Send swap requests to all selected shifts
            if (onRequestSwap) {
              onRequestSwap(selectedForSwap.id, Array.from(selectedTargetShifts))
              setSelectedForSwap(null)
              setSelectedTargetShifts(new Set())
            }
          }
        } else {
          // Just deselect if no targets selected
          setSelectedForSwap(null)
        }
        return
      }
      
      // Handle swap logic
      if (status === 'available') {
        // Direct swap with available shift
        if (onAssignShift) {
          // Move current user to the available shift
          await onAssignShift(shift.id, currentUser.id)
          // Make the original shift available
          await onAssignShift(selectedForSwap.id, null)
          setSelectedForSwap(null)
          setSelectedTargetShifts(new Set())
          alert('Schimb realizat cu succes!')
        }
      } else if (shift.assigned_to && shift.assigned_to !== currentUser.id) {
        // Toggle selection for this shift
        const newSelectedTargets = new Set(selectedTargetShifts)
        if (newSelectedTargets.has(shift.id)) {
          newSelectedTargets.delete(shift.id)
        } else {
          newSelectedTargets.add(shift.id)
        }
        setSelectedTargetShifts(newSelectedTargets)
      }
      return
    }
    
    // Normal click behavior for admins/managers
    if (currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER') {
      setSelectedShift(shift)
      setContextMenuPosition({ x: event.clientX, y: event.clientY })
      setShowContextMenu(true)
      return
    }
    
    // For staff - if clicking own shift, select it for swap
    if (status === 'your-shift' && shift.status !== 'pending_swap') {
      setSelectedForSwap(shift)
      return
    }
    
    // For staff - can reserve available shifts in their department
    if (status === 'available' && shift.department === currentUser.department) {
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
      {/* Show swap hint when a shift is selected */}
      {selectedForSwap && (
        <div className="mb-4 p-3 bg-purple-100 border border-purple-300 rounded-lg text-sm">
          <span className="font-semibold">↔️ Schimb selectat:</span> {selectedForSwap.shift_date} - {selectedForSwap.department}
          <br />
          <span className="text-gray-600">
            Click pe mai multe ture pentru a trimite cereri multiple • 
            {selectedTargetShifts.size > 0 && (
              <span className="font-semibold text-green-700"> {selectedTargetShifts.size} ture selectate</span>
            )}
            {selectedTargetShifts.size > 0 && ' • Click pe tura ta pentru a trimite • '}
            ESC pentru a anula
          </span>
        </div>
      )}
      
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
                  
                  const incomingRequests = getIncomingSwapRequests(shift.id)
                  const outgoingRequests = getOutgoingSwapRequests(shift.id)
                  const hasIncomingRequest = incomingRequests.length > 0
                  const hasOutgoingRequest = outgoingRequests.length > 0
                  
                  return (
                    <div
                      key={shift.id}
                      className={`flex-1 cursor-pointer transition-all relative overflow-visible ${
                        selectedForSwap?.id === shift.id
                          ? 'ring-4 ring-purple-500 ring-offset-2 animate-pulse' 
                          : selectedTargetShifts.has(shift.id)
                          ? 'ring-4 ring-green-500 ring-offset-2'
                          : hasIncomingRequest
                          ? 'ring-4 ring-red-500 ring-offset-2 animate-pulse shadow-lg'
                          : hasOutgoingRequest
                          ? 'ring-4 ring-blue-500 ring-offset-2'
                          : status === 'your-shift' 
                          ? 'ring-4 ring-yellow-500 ring-offset-2' 
                          : status === 'pending-swap'
                          ? 'ring-2 ring-orange-500 shadow-md animate-pulse'
                          : status === 'available'
                          ? 'hover:shadow-md hover:scale-105 border-2 border-dashed border-gray-300'
                          : ''
                      } ${index > 0 ? 'border-t-2 border-white' : ''}`}
                      style={{ 
                        backgroundColor: selectedForSwap?.id === shift.id
                          ? '#A855F7' // Purple for selected for swap
                          : selectedTargetShifts.has(shift.id)
                          ? '#86EFAC' // Light green for selected targets
                          : hasIncomingRequest
                          ? '#FEE2E2' // Light red background for incoming requests
                          : hasOutgoingRequest
                          ? '#DBEAFE' // Light blue for outgoing
                          : status === 'your-shift' 
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
                      }${
                        selectedForSwap?.id === shift.id ? ' (Selectat pentru schimb)' : ''
                      }${
                        hasIncomingRequest ? ` - ${incomingRequests.length} cereri de schimb!` : ''
                      }`}
                    >
                      {/* Show staff name or availability */}
                      {shift.user ? (
                        <div className="flex items-center justify-center h-full relative">
                          <div className={`text-xs font-semibold ${
                            selectedForSwap?.id === shift.id
                              ? 'text-white'
                              : hasIncomingRequest
                              ? 'text-red-900'
                              : status === 'your-shift' || status === 'pending-swap' 
                              ? 'text-gray-800' 
                              : 'text-white'
                          }`}>
                            {shift.user.name.split(' ')[0]}
                          </div>
                          {/* Prominent overlay for incoming swap requests */}
                          {hasIncomingRequest && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded animate-pulse transform -rotate-12">
                                CERERE
                              </div>
                            </div>
                          )}
                          {/* Overlay for outgoing requests */}
                          {hasOutgoingRequest && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
                                TRIMIS
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <span className="text-2xl text-gray-400">+</span>
                        </div>
                      )}
                      
                      {/* Status indicators - small corner badges */}
                      <div className="absolute top-0.5 right-0.5 flex gap-0.5">
                        {selectedForSwap?.id === shift.id && (
                          <span className="text-lg animate-bounce">↔️</span>
                        )}
                        {selectedTargetShifts.has(shift.id) && (
                          <span className="text-lg">✅</span>
                        )}
                        {shift.status === 'reserved' && !selectedForSwap?.id && !selectedTargetShifts.has(shift.id) && !hasIncomingRequest && (
                          <span className="text-xs bg-white/20 rounded px-0.5">R</span>
                        )}
                        {shift.status === 'assigned' && !selectedForSwap?.id && !selectedTargetShifts.has(shift.id) && !hasIncomingRequest && (
                          <span className="text-xs text-white">✓</span>
                        )}
                        {shift.status === 'pending_swap' && !selectedForSwap?.id && !selectedTargetShifts.has(shift.id) && (
                          <span className="text-xs animate-pulse">🔄</span>
                        )}
                      </div>
                    </div>
                  )
                })}
                
              </div>
              
              {/* Add reservation button for empty cells */}
              {dayShifts.length === 0 && 
               isCurrentMonthDay && 
               !isPastDate && 
               onCreateReservation && 
               (currentUser.department || currentUser.role === 'MANAGER' || currentUser.role === 'ADMIN') && (
                <button
                  className="absolute inset-0 border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all flex items-center justify-center group"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCreateReservation(date, department)
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
              </>
            ) : getShiftStatus(selectedShift) === 'available' && 
                (currentUser.role !== 'STAFF' || selectedShift.department === currentUser.department) ? (
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
      
      {/* Inline Swap Request Menu */}
      {showSwapMenu && (() => {
        const shift = shifts.find(s => s.id === showSwapMenu)
        if (!shift) return null
        
        const incomingRequests = getIncomingSwapRequests(showSwapMenu)
        console.log('Showing swap menu for shift:', showSwapMenu)
        console.log('Incoming requests:', incomingRequests)
        
        return (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowSwapMenu(null)}
            />
            <div
              className="fixed bg-white rounded-lg shadow-lg border p-4 z-50 min-w-[250px] max-h-96 overflow-y-auto"
              style={{ 
                left: `${Math.min(contextMenuPosition.x, window.innerWidth - 300)}px`, 
                top: `${Math.min(contextMenuPosition.y, window.innerHeight - 200)}px` 
              }}
            >
              <h3 className="font-semibold mb-3">Cereri de schimb primite:</h3>
              <div className="space-y-2">
                {incomingRequests.length === 0 ? (
                  <p className="text-sm text-gray-500">Nu sunt cereri de schimb.</p>
                ) : (
                  incomingRequests.map(request => (
                    <div key={request.id} className="border p-2 rounded">
                      <p className="text-sm font-medium">{request.requester?.name || 'Necunoscut'}</p>
                      <p className="text-xs text-gray-600">
                        Vrea să schimbe: {request.requester_shift?.shift_date || 'Data necunoscută'}
                      </p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => {
                          if (onAcceptSwap) {
                            onAcceptSwap(request.id)
                            setShowSwapMenu(null)
                          }
                        }}
                        className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                      >
                        ✅ Acceptă
                      </button>
                      <button
                        onClick={() => {
                          if (onRejectSwap) {
                            onRejectSwap(request.id)
                            setShowSwapMenu(null)
                          }
                        }}
                        className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                      >
                        ❌ Refuză
                      </button>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>
          </>
        )
      })()}
    </div>
  )
}