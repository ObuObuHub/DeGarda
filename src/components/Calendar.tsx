'use client'

import { useState, useEffect } from 'react'
import { type User, type Shift, type UnavailableDate, type SwapRequest } from '@/lib/supabase'
import { DEPARTMENT_COLORS } from '@/types'
import { parseISODate, formatDateForDB } from '@/lib/dateUtils'

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
  const [showAssignMenu, setShowAssignMenu] = useState(false)
  const [selectedForSwap, setSelectedForSwap] = useState<Shift | null>(null)
  const [selectedTargetShifts, setSelectedTargetShifts] = useState<Set<string>>(new Set())
  const [showSwapMenu, setShowSwapMenu] = useState<string | null>(null)
  const [isPortrait, setIsPortrait] = useState(false)
  const [showRotationHint, setShowRotationHint] = useState(true)
  
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
  
  // Add orientation detection
  useEffect(() => {
    const checkOrientation = () => {
      const portrait = window.matchMedia('(orientation: portrait)').matches
      const isMobile = window.innerWidth < 768
      setIsPortrait(portrait && isMobile)
    }
    
    checkOrientation()
    window.addEventListener('resize', checkOrientation)
    window.addEventListener('orientationchange', checkOrientation)
    
    return () => {
      window.removeEventListener('resize', checkOrientation)
      window.removeEventListener('orientationchange', checkOrientation)
    }
  }, [])
  
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
    const dateStr = formatDateForDB(date)
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
    const dateStr = formatDateForDB(date)
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
      const shiftDate = parseISODate(shift.shift_date)
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
  const weekDaysMobile = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
  
  // Helper function to format date for display
  const formatDateForDisplay = (dateStr: string) => {
    const date = parseISODate(dateStr)
    
    const dayNames = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă']
    const monthNames = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 
                       'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie']
    
    const dayName = dayNames[date.getDay()]
    const dayNum = date.getDate()
    const monthName = monthNames[date.getMonth()]
    
    return `${dayName}, ${dayNum} ${monthName}`
  }

  const handleShiftClick = async (shift: Shift, event: React.MouseEvent) => {
    // For staff clicking their own reserved shifts, let date handler cycle them
    if (shift.status === 'reserved' && 
        shift.assigned_to === currentUser.id && 
        currentUser.role === 'STAFF') {
      // Don't prevent propagation - let it bubble to date click
      return
    }
    
    event.preventDefault()
    event.stopPropagation()
    
    const status = getShiftStatus(shift)
    const incomingRequests = getIncomingSwapRequests(shift.id)
    
    // If clicking on a shift with incoming requests, show the swap menu
    if (incomingRequests.length > 0 && status === 'your-shift') {
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
    if (currentUser.role !== 'STAFF') {
      setSelectedShift(shift)
      setShowContextMenu(true)
      return
    }
    
    // For staff - if clicking own ASSIGNED shift, select it for swap
    // Reserved shifts should cycle back to empty, not enter swap mode
    if (status === 'your-shift' && shift.status === 'assigned') {
      setSelectedForSwap(shift)
      return
    }
    
    // For staff - directly reserve available shifts in their department
    if (status === 'available' && shift.department === currentUser.department && currentUser.role === 'STAFF') {
      onReserveShift(shift.id)
      return
    }
  }

  const handleDateClick = async (date: Date) => {
    // Only allow clicks on current month and future dates
    if (!isCurrentMonth(date) || date < new Date(new Date().setHours(0,0,0,0))) return
    
    // Only staff can use the cycling system
    if (currentUser.role !== 'STAFF') return
    
    const dayShifts = getShiftsForDay(date)
    const userReservation = dayShifts.find(s => 
      s.assigned_to === currentUser.id && 
      s.status === 'reserved' &&
      s.department === currentUser.department
    )
    const isDateUnavailable = isUnavailable(date)
    
    // SIMPLE TOGGLE CYCLE: Empty → Unavailable → Reserved → Empty
    if (userReservation) {
      // STATE 3: Reserved → Empty
      // Cancel shift (will be deleted) and remove unavailable
      await onCancelShift(userReservation.id)
      if (isDateUnavailable) {
        await onRemoveUnavailable(date)
      }
    } else if (isDateUnavailable) {
      // STATE 2: Unavailable → Reserved
      // Create reservation (keep unavailable flag)
      if (onCreateReservation) {
        await onCreateReservation(date, currentUser.department)
      }
    } else {
      // STATE 1: Empty → Unavailable
      // Mark as unavailable
      await onMarkUnavailable(date)
    }
  }

  const closeContextMenu = () => {
    setShowContextMenu(false)
    setSelectedShift(null)
  }

  return (
    <div className={department ? "p-4" : "card"}>
      {/* Show rotation hint for mobile portrait mode */}
      {isPortrait && showRotationHint && (
        <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-lg text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📱</span>
            <span>Rotește telefonul pentru o vizualizare mai bună</span>
          </div>
          <button
            onClick={() => setShowRotationHint(false)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ✕
          </button>
        </div>
      )}
      
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
            {currentUser.role === 'STAFF' && (
              <>
                <p className="text-sm text-gray-600">
                  Rezervări: {getReservedShiftsCount()} din 2
                </p>
                <p className="text-sm text-gray-600">
                  Zile indisponibile: {unavailableDates.filter(ud => ud.user_id === currentUser.id).length}
                </p>
              </>
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
        {weekDays.map((day, index) => (
          <div
            key={day}
            className="bg-gray-100 px-1 md:px-3 py-2 text-center text-xs md:text-sm font-medium text-gray-700"
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{weekDaysMobile[index]}</span>
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
              data-date={formatDateForDB(date)}
              className={`calendar-day bg-white relative overflow-hidden ${
                !isCurrentMonthDay ? 'opacity-40' : ''
              } ${isToday(date) ? 'bg-blue-50 border-2 border-blue-300' : ''} ${
                isPastDate ? 'opacity-60' : ''
              } ${
                currentUser.role === 'STAFF' && isCurrentMonthDay && !isPastDate ? 'cursor-pointer hover:shadow-md transition-all group' : ''
              }`}
              onClick={() => handleDateClick(date)}
            >
              <div className="absolute top-1 left-2 z-10">
                <span className={`text-sm font-medium ${
                  isToday(date) ? 'text-blue-700' : 'text-gray-900'
                }`}>
                  {date.getDate()}
                </span>
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
                          ? 'hover:shadow-md hover:scale-105'
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
                        <div className="flex items-center justify-center h-full relative px-1">
                          <div className={`shift-name font-semibold whitespace-nowrap overflow-hidden text-ellipsis ${
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
                      ) : null}
                      
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
              
              {/* Visual indicator for empty cells that can be clicked */}
              {dayShifts.length === 0 && 
               isCurrentMonthDay && 
               !isPastDate && 
               currentUser.role === 'STAFF' && 
               currentUser.department && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-gray-300 text-6xl opacity-0 group-hover:opacity-100 transition-opacity">○</span>
                </div>
              )}
              
              {/* Show unavailable indicator centered - show when user doesn't have a reservation */}
              {unavailable && !dayShifts.some(s => 
                s.assigned_to === currentUser.id && 
                s.status === 'reserved' &&
                s.department === currentUser.department
              ) && (
                <div className="absolute inset-0 bg-gray-100 flex items-center justify-center pointer-events-none">
                  <span className="text-3xl" title="Indisponibil">🚫</span>
                </div>
              )}
              
              {/* Show reserved indicator for staff reservations */}
              {dayShifts.some(s => 
                s.assigned_to === currentUser.id && 
                s.status === 'reserved' &&
                s.department === currentUser.department
              ) && (
                <div className="absolute inset-0 bg-yellow-100 flex items-center justify-center pointer-events-none">
                  <span className="text-3xl" title="Rezervat de tine">⭐</span>
                </div>
              )}
            </div>
          )
        })}
      </div>


      {/* Mobile-friendly Modal instead of context menu */}
      {showContextMenu && selectedShift && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black bg-opacity-50" 
            onClick={closeContextMenu}
          />
          <div
            className={`fixed z-50 bg-white rounded-lg shadow-xl border ${
              window.innerWidth < 768 
                ? 'bottom-0 left-0 right-0 rounded-b-none p-4 animate-slide-up'
                : 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-4 min-w-[300px]'
            }`}
          >
            <div className="mb-4">
              <h3 className="font-semibold text-lg mb-1">Acțiuni pentru tură</h3>
              <p className="text-sm text-gray-600">
                {selectedShift.shift_date} - {selectedShift.department}
                {selectedShift.user && ` - ${selectedShift.user.name}`}
              </p>
            </div>
            {currentUser.role !== 'STAFF' ? (
              <div className="space-y-2">
                {selectedShift.assigned_to && (
                  <button
                    onClick={() => {
                      setShowAssignMenu(true)
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg text-base flex items-center gap-3 transition-colors"
                  >
                    <span className="text-xl">👥</span>
                    <span>Reasignează tura</span>
                  </button>
                )}
                {!selectedShift.assigned_to && (
                  <button
                    onClick={() => {
                      setShowAssignMenu(true)
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg text-base flex items-center gap-3 transition-colors"
                  >
                    <span className="text-xl">👥</span>
                    <span>Asignează tura</span>
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
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg text-base flex items-center gap-3 transition-colors"
                  >
                    <span className="text-xl">🔓</span>
                    <span>Marchează disponibil</span>
                  </button>
                )}
                {(currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'HOSPITAL_ADMIN') && (
                  <button
                    onClick={() => {
                      if (onDeleteShift) {
                        onDeleteShift(selectedShift.id)
                      }
                      closeContextMenu()
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-red-100 rounded-lg text-base text-red-600 flex items-center gap-3 transition-colors"
                  >
                    <span className="text-xl">🗑️</span>
                    <span>Șterge tura</span>
                  </button>
                )}
              </div>
            ) : getShiftStatus(selectedShift) === 'your-shift' ? (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    onCancelShift(selectedShift.id)
                    closeContextMenu()
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg text-base flex items-center gap-3 transition-colors"
                >
                  <span className="text-xl">❌</span>
                  <span>Anulează tura</span>
                </button>
              </div>
            ) : getShiftStatus(selectedShift) === 'available' && 
                (currentUser.role !== 'STAFF' || selectedShift.department === currentUser.department) ? (
              <button
                onClick={() => {
                  onReserveShift(selectedShift.id)
                  closeContextMenu()
                }}
                className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg text-base flex items-center gap-3 transition-colors"
              >
                <span className="text-xl">✅</span>
                <span>Rezervă tura</span>
              </button>
            ) : null}
          </div>
        </>
      )}
      
      {/* Staff Assignment Menu - Mobile Friendly */}
      {showAssignMenu && selectedShift && (
        <>
          <div 
            className="fixed inset-0 z-50 bg-black bg-opacity-50" 
            onClick={() => {
              setShowAssignMenu(false)
              closeContextMenu()
            }}
          />
          <div
            className={`fixed z-50 bg-white rounded-lg shadow-xl border ${
              window.innerWidth < 768 
                ? 'bottom-0 left-0 right-0 rounded-b-none p-4 max-h-[70vh] animate-slide-up'
                : 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-4 min-w-[300px] max-h-[80vh]'
            } overflow-y-auto`}
          >
            <h3 className="font-semibold text-lg mb-4 sticky top-0 bg-white pb-2">Alege personal:</h3>
            <div className="space-y-2">
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
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg text-base transition-colors"
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
        
        return (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowSwapMenu(null)}
            />
            <div
              className={`fixed z-50 bg-white rounded-lg shadow-xl border ${
                window.innerWidth < 768 
                  ? 'bottom-0 left-0 right-0 rounded-b-none p-4 max-h-[50vh] animate-slide-up'
                  : 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-4 min-w-[350px] max-h-[80vh]'
              } overflow-y-auto`}
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
                        Vrea să schimbe: {request.requester_shift?.shift_date 
                          ? formatDateForDisplay(request.requester_shift.shift_date)
                          : 'Data necunoscută'}
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