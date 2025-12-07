'use client'

import { useState, useEffect } from 'react'
import { type User, type Shift, type UnavailableDate, type SwapRequest } from '@/lib/supabase'
import { type ShiftType } from '@/types'
import { type Conflict } from '@/hooks/useShiftActions'
import { parseISODate, formatDateForDB } from '@/lib/dateUtils'
import ShiftCell, { EmptyDayCell } from './calendar/ShiftCell'
import ShiftActionMenu from './calendar/ShiftActionMenu'
import SwapRequestModal, { SwapRequestsView } from './calendar/SwapRequestModal'
import ConfirmDialog from './ui/ConfirmDialog'

interface CalendarProps {
  shifts: Shift[]
  shiftTypes?: ShiftType[]
  unavailableDates: UnavailableDate[]
  swapRequests?: SwapRequest[]
  onReserveShift: (shiftId: string) => void
  onCancelShift: (shiftId: string) => void
  onMarkUnavailable: (date: Date) => void
  onRemoveUnavailable: (date: Date) => void
  onSetPreference?: (date: Date, type: 'unavailable' | 'preferred') => void
  onRemovePreference?: (date: Date) => void
  onDeleteShift?: (shiftId: string) => void
  onCreateReservation?: (date: Date, department?: string, shiftTypeId?: string) => void
  onRequestSwap?: (requesterShiftId: string, targetShiftIds: string[]) => void
  onAssignShift?: (shiftId: string, userId: string | null) => void
  onAcceptSwap?: (swapRequestId: string) => void
  onRejectSwap?: (swapRequestId: string) => void
  onCancelSwap?: (swapRequestId: string) => void
  onCheckConflicts?: (userId: string, shiftDate: string) => Conflict[]
  currentUser: User
  selectedDate: Date
  onDateChange: (date: Date) => void
  department?: string
  departmentColor?: string
  users?: User[]
  defaultShiftTypeId?: string
}

export default function Calendar({
  shifts,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  shiftTypes = [],
  unavailableDates,
  swapRequests = [],
  onReserveShift,
  onCancelShift,
  onMarkUnavailable,
  onRemoveUnavailable,
  onSetPreference,
  onRemovePreference,
  onDeleteShift,
  onCreateReservation,
  onRequestSwap,
  onAssignShift,
  onAcceptSwap,
  onRejectSwap,
  onCancelSwap,
  onCheckConflicts,
  currentUser,
  selectedDate,
  onDateChange,
  department,
  departmentColor,
  users = [],
  defaultShiftTypeId
}: CalendarProps) {
  // Simplified state - using action menu instead of toggle cycle
  const [actionMenuOpen, setActionMenuOpen] = useState(false)
  const [selectedDate2, setSelectedDate2] = useState<Date | null>(null)
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)

  // Swap modal state
  const [swapModalOpen, setSwapModalOpen] = useState(false)
  const [swapShift, setSwapShift] = useState<Shift | null>(null)

  // Incoming swap requests view
  const [swapRequestsOpen, setSwapRequestsOpen] = useState(false)
  const [viewingSwapShift, setViewingSwapShift] = useState<Shift | null>(null)

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null)
  const [confirmMessage, setConfirmMessage] = useState('')

  // Keyboard escape to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActionMenuOpen(false)
        setSwapModalOpen(false)
        setSwapRequestsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days = []
    const current = new Date(startDate)
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
      ud => ud.user_id === currentUser.id &&
            ud.unavailable_date === dateStr &&
            (ud.preference_type === 'unavailable' || !ud.preference_type)
    )
  }

  const isPreferred = (date: Date) => {
    const dateStr = formatDateForDB(date)
    return unavailableDates.some(
      ud => ud.user_id === currentUser.id &&
            ud.unavailable_date === dateStr &&
            ud.preference_type === 'preferred'
    )
  }

  const hasUserReservation = (date: Date) => {
    const dayShifts = getShiftsForDay(date)
    return dayShifts.some(s =>
      s.assigned_to === currentUser.id &&
      s.status === 'reserved' &&
      s.department === currentUser.department
    )
  }

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

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
    onDateChange(newDate)
  }

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })
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

  // Event handlers
  const handleDateClick = (date: Date) => {
    if (!isCurrentMonth(date)) return
    if (date < new Date(new Date().setHours(0, 0, 0, 0))) return
    if (currentUser.role !== 'STAFF') return

    setSelectedDate2(date)
    setSelectedShift(null)
    setActionMenuOpen(true)
  }

  const handleShiftClick = (shift: Shift, e: React.MouseEvent) => {
    e.stopPropagation()

    const incomingRequests = getIncomingSwapRequests(shift.id)

    // If shift has incoming swap requests, show them
    if (incomingRequests.length > 0 && shift.assigned_to === currentUser.id) {
      setViewingSwapShift(shift)
      setSwapRequestsOpen(true)
      return
    }

    setSelectedShift(shift)
    setSelectedDate2(parseISODate(shift.shift_date))
    setActionMenuOpen(true)
  }

  // Action handlers for the menu
  const handleMarkUnavailable = async () => {
    if (selectedDate2) {
      await onMarkUnavailable(selectedDate2)
    }
  }

  const handleRemoveUnavailable = async () => {
    if (selectedDate2) {
      await onRemoveUnavailable(selectedDate2)
    }
  }

  const handleSetPreference = (type: 'unavailable' | 'preferred') => {
    if (selectedDate2 && onSetPreference) {
      onSetPreference(selectedDate2, type)
    }
  }

  const handleRemovePreference = () => {
    if (selectedDate2 && onRemovePreference) {
      onRemovePreference(selectedDate2)
    }
  }

  const handleReserve = async () => {
    if (selectedShift) {
      await onReserveShift(selectedShift.id)
    } else if (selectedDate2 && onCreateReservation) {
      await onCreateReservation(selectedDate2, currentUser.department, defaultShiftTypeId)
    }
  }

  const handleCancelReservation = () => {
    if (selectedShift) {
      setConfirmMessage('Sigur vrei să anulezi această rezervare?')
      setConfirmAction(() => () => {
        onCancelShift(selectedShift.id)
        if (selectedDate2 && isUnavailable(selectedDate2)) {
          onRemoveUnavailable(selectedDate2)
        }
      })
      setConfirmOpen(true)
    }
  }

  const handleStartSwap = () => {
    if (selectedShift) {
      setSwapShift(selectedShift)
      setSwapModalOpen(true)
    }
  }

  const handleSendSwapRequests = (targetShiftIds: string[]) => {
    if (swapShift && onRequestSwap) {
      onRequestSwap(swapShift.id, targetShiftIds)
    }
  }

  const handleAssign = (userId: string | null) => {
    if (selectedShift && onAssignShift) {
      onAssignShift(selectedShift.id, userId)
    }
  }

  const handleDelete = () => {
    if (selectedShift && onDeleteShift) {
      setConfirmMessage('Sigur vrei să ștergi această tură?')
      setConfirmAction(() => () => onDeleteShift(selectedShift.id))
      setConfirmOpen(true)
    }
  }

  const days = getDaysInMonth(selectedDate)
  const weekDays = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Săm']
  const weekDaysMobile = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

  return (
    <div className={department ? 'p-4' : 'card'}>
      {/* Calendar Header - only show if not in department view */}
      {!department && (
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="btn btn-secondary focus-ring"
            aria-label="Luna precedentă"
          >
            <span className="sm:hidden">←</span>
            <span className="hidden sm:inline">← Luna precedentă</span>
          </button>

          <div className="text-center">
            <h2 className="text-xl font-semibold capitalize">{formatMonth(selectedDate)}</h2>
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
            className="btn btn-secondary focus-ring"
            aria-label="Luna următoare"
          >
            <span className="sm:hidden">→</span>
            <span className="hidden sm:inline">Luna următoare →</span>
          </button>
        </div>
      )}

      {/* Calendar Legend */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-500 mb-2 font-medium">Legendă:</p>
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-yellow-200 ring-2 ring-yellow-500"></span>
            <span>Tura ta</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-gray-100 border-2 border-dashed border-blue-400"></span>
            <span>Disponibil</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded" style={{ backgroundColor: departmentColor || '#6B7280' }}></span>
            <span>Altă persoană</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-green-100 ring-2 ring-green-500 flex items-center justify-center text-green-600 text-xs">💚</span>
            <span>Prefer să lucrez</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-gray-100 flex items-center justify-center text-red-500 text-xs">✕</span>
            <span>Indisponibil</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-blue-100"></span>
            <span>Schimb trimis</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-red-100"></span>
            <span>Schimb primit</span>
          </div>
        </div>
      </div>

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
          const hasReservation = hasUserReservation(date)
          const isPastDate = date < new Date(new Date().setHours(0, 0, 0, 0))
          const canInteract = currentUser.role === 'STAFF' && isCurrentMonthDay && !isPastDate

          return (
            <div
              key={date.toISOString()}
              data-date={formatDateForDB(date)}
              className={`calendar-day bg-white relative overflow-hidden ${
                !isCurrentMonthDay ? 'opacity-40' : ''
              } ${isToday(date) ? 'bg-blue-50 border-2 border-blue-300' : ''} ${
                isPastDate ? 'opacity-60' : ''
              } ${canInteract ? 'cursor-pointer hover:shadow-md transition-all' : ''}`}
              onClick={() => handleDateClick(date)}
            >
              {/* Date number */}
              <div className="absolute top-1 left-2 z-10">
                <span className={`text-sm font-medium ${
                  isToday(date) ? 'text-blue-700' : 'text-gray-900'
                }`}>
                  {date.getDate()}
                </span>
              </div>

              {/* Shifts */}
              <div className="absolute inset-0 flex flex-col pt-6">
                {dayShifts.map((shift) => {
                  // Check conflicts for this shift if it's assigned to someone
                  const shiftConflicts = shift.assigned_to && onCheckConflicts
                    ? onCheckConflicts(shift.assigned_to, shift.shift_date)
                    : []

                  return (
                    <ShiftCell
                      key={shift.id}
                      shift={shift}
                      currentUser={currentUser}
                      incomingSwapRequests={getIncomingSwapRequests(shift.id)}
                      outgoingSwapRequests={getOutgoingSwapRequests(shift.id)}
                      conflicts={shiftConflicts}
                      departmentColor={departmentColor}
                      onClick={(e) => handleShiftClick(shift, e)}
                    />
                  )
                })}
              </div>

              {/* Empty day state */}
              {dayShifts.length === 0 && (
                <EmptyDayCell
                  date={date}
                  isUnavailable={unavailable}
                  isPreferred={isPreferred(date)}
                  hasReservation={hasReservation}
                  canInteract={canInteract}
                  onClick={() => handleDateClick(date)}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Action Menu - replaces confusing toggle cycle */}
      <ShiftActionMenu
        isOpen={actionMenuOpen}
        onClose={() => setActionMenuOpen(false)}
        shift={selectedShift}
        date={selectedDate2}
        currentUser={currentUser}
        isUnavailable={selectedDate2 ? isUnavailable(selectedDate2) : false}
        isPreferred={selectedDate2 ? isPreferred(selectedDate2) : false}
        hasReservation={selectedDate2 ? hasUserReservation(selectedDate2) : false}
        users={users}
        conflicts={selectedDate2 && onCheckConflicts
          ? onCheckConflicts(currentUser.id, formatDateForDB(selectedDate2))
          : []
        }
        outgoingSwapRequestId={selectedShift ? getOutgoingSwapRequests(selectedShift.id)[0]?.id : undefined}
        onCheckConflicts={onCheckConflicts}
        onSetPreference={handleSetPreference}
        onRemovePreference={handleRemovePreference}
        onMarkUnavailable={handleMarkUnavailable}
        onRemoveUnavailable={handleRemoveUnavailable}
        onReserve={handleReserve}
        onCancelReservation={handleCancelReservation}
        onAssign={handleAssign}
        onDelete={handleDelete}
        onStartSwap={handleStartSwap}
        onCancelSwap={onCancelSwap}
      />

      {/* Swap Request Modal - simplified flow */}
      <SwapRequestModal
        isOpen={swapModalOpen}
        onClose={() => {
          setSwapModalOpen(false)
          setSwapShift(null)
        }}
        currentShift={swapShift}
        availableShifts={shifts}
        currentUser={currentUser}
        onSendRequests={handleSendSwapRequests}
      />

      {/* Incoming Swap Requests View */}
      <SwapRequestsView
        isOpen={swapRequestsOpen}
        onClose={() => {
          setSwapRequestsOpen(false)
          setViewingSwapShift(null)
        }}
        requests={viewingSwapShift ? getIncomingSwapRequests(viewingSwapShift.id) : []}
        onAccept={(requestId) => {
          onAcceptSwap?.(requestId)
          setSwapRequestsOpen(false)
        }}
        onReject={(requestId) => {
          onRejectSwap?.(requestId)
          setSwapRequestsOpen(false)
        }}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Confirmare"
        message={confirmMessage}
        onConfirm={() => {
          confirmAction?.()
          setConfirmOpen(false)
          setConfirmAction(null)
        }}
        onCancel={() => {
          setConfirmOpen(false)
          setConfirmAction(null)
        }}
      />
    </div>
  )
}
