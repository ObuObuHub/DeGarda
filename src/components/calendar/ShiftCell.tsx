'use client'

import { type Shift, type SwapRequest, type User } from '@/lib/supabase'
import { type Conflict } from '@/hooks/useShiftActions'
import Tooltip from '@/components/ui/Tooltip'

interface ShiftCellProps {
  shift: Shift
  currentUser: User
  incomingSwapRequests: SwapRequest[]
  outgoingSwapRequests: SwapRequest[]
  conflicts?: Conflict[]
  departmentColor?: string
  onClick: (e: React.MouseEvent) => void
}

type ShiftStatus = 'your-shift' | 'your-reserved' | 'available' | 'other-shift' | 'pending-swap'

export default function ShiftCell({
  shift,
  currentUser,
  incomingSwapRequests,
  outgoingSwapRequests,
  conflicts = [],
  departmentColor = '#6B7280',
  onClick
}: ShiftCellProps) {
  const getStatus = (): ShiftStatus => {
    if (shift.status === 'pending_swap') return 'pending-swap'
    if (shift.assigned_to === currentUser.id) {
      return shift.status === 'reserved' ? 'your-reserved' : 'your-shift'
    }
    if (shift.status === 'available') return 'available'
    return 'other-shift'
  }

  const status = getStatus()
  const hasIncoming = incomingSwapRequests.length > 0
  const hasOutgoing = outgoingSwapRequests.length > 0
  const hasConflicts = conflicts.length > 0
  const hasBlockingConflict = conflicts.some(c => c.severity === 'error')

  // Simplified color scheme
  const getBackgroundColor = () => {
    if (hasIncoming) return '#FEE2E2' // Light red for incoming requests
    if (hasOutgoing) return '#DBEAFE' // Light blue for outgoing

    switch (status) {
      case 'your-shift':
      case 'your-reserved':
        return '#FEF3C7' // Light yellow for user's shifts
      case 'pending-swap':
        return '#FED7AA' // Light orange for pending swap
      case 'available':
        return '#F3F4F6' // Light gray for available
      default:
        return departmentColor
    }
  }

  const getTextColor = () => {
    if (hasIncoming || status === 'your-shift' || status === 'your-reserved' || status === 'pending-swap' || status === 'available') {
      return 'text-gray-800'
    }
    return 'text-white'
  }

  // Simple status badge with tooltip
  const getBadge = () => {
    if (hasIncoming) {
      return (
        <Tooltip content={`${incomingSwapRequests.length} cereri de schimb primite`} position="left">
          <span className="absolute top-0.5 right-0.5 px-1.5 py-0.5 text-xs font-bold bg-red-600 text-white rounded cursor-help">
            {incomingSwapRequests.length}
          </span>
        </Tooltip>
      )
    }
    if (hasOutgoing) {
      return (
        <Tooltip content="Ai trimis o cerere de schimb" position="left">
          <span className="absolute top-0.5 right-0.5 px-1.5 py-0.5 text-xs font-bold bg-blue-600 text-white rounded cursor-help">
            !
          </span>
        </Tooltip>
      )
    }
    if (hasConflicts) {
      const conflictMessage = conflicts.map(c => c.message).join('; ')
      return (
        <Tooltip content={conflictMessage} position="left">
          <span className={`absolute top-0.5 right-0.5 px-1.5 py-0.5 text-xs font-bold text-white rounded cursor-help ${
            hasBlockingConflict ? 'bg-red-600' : 'bg-yellow-600'
          }`}>
            ⚠
          </span>
        </Tooltip>
      )
    }
    if (status === 'your-reserved') {
      return (
        <Tooltip content="Rezervat de tine - nu este confirmat" position="left">
          <span className="absolute top-0.5 right-0.5 px-1.5 py-0.5 text-xs font-bold bg-yellow-600 text-white rounded cursor-help">
            R
          </span>
        </Tooltip>
      )
    }
    return null
  }

  const shiftTypeName = shift.shift_type?.name || ''

  return (
    <div
      className={`flex-1 cursor-pointer transition-all relative overflow-hidden hover:shadow-md ${
        status === 'your-shift' || status === 'your-reserved'
          ? 'ring-2 ring-yellow-500'
          : ''
      }`}
      style={{ backgroundColor: getBackgroundColor() }}
      onClick={onClick}
      title={`${shift.department} - ${shiftTypeName} - ${shift.user?.name || 'Disponibil'}${
        status === 'your-reserved' ? ' (Rezervat de tine)' :
        status === 'your-shift' ? ' (Tura ta)' : ''
      }${hasIncoming ? ` - ${incomingSwapRequests.length} cereri de schimb` : ''}`}
    >
      {/* Staff name */}
      {shift.user && (
        <div className="flex items-center justify-center h-full px-1">
          <span className={`shift-name font-medium whitespace-nowrap overflow-hidden text-ellipsis ${getTextColor()}`}>
            {shift.user.name.split(' ')[0]}
          </span>
        </div>
      )}

      {/* Available indicator - more prominent */}
      {!shift.user && status === 'available' && (
        <div className="flex items-center justify-center h-full border-2 border-dashed border-blue-400 rounded m-0.5">
          <span className="text-blue-600 text-xs font-medium">LIBER</span>
        </div>
      )}

      {/* Show swap target when outgoing swap exists */}
      {hasOutgoing && shift.user && (
        <div className="absolute bottom-0 left-0 right-0 bg-blue-600 text-white text-xs px-1 truncate text-center">
          Schimb trimis
        </div>
      )}

      {/* Badge */}
      {getBadge()}
    </div>
  )
}

// Empty day cell component
interface EmptyDayCellProps {
  date: Date // kept for potential future use
  isUnavailable: boolean
  hasReservation: boolean
  canInteract: boolean
  onClick: () => void
}

export function EmptyDayCell({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  date,
  isUnavailable,
  hasReservation,
  canInteract,
  onClick
}: EmptyDayCellProps) {
  if (hasReservation) {
    return (
      <div
        className={`absolute inset-0 flex items-center justify-center bg-yellow-100 ${
          canInteract ? 'cursor-pointer hover:bg-yellow-200' : ''
        }`}
        onClick={canInteract ? onClick : undefined}
      >
        <div className="text-center">
          <span className="text-2xl">⭐</span>
          <span className="block text-xs text-yellow-800 font-medium">Rezervat</span>
        </div>
      </div>
    )
  }

  if (isUnavailable) {
    return (
      <div
        className={`absolute inset-0 flex items-center justify-center ${
          canInteract ? 'cursor-pointer hover:opacity-80' : ''
        }`}
        style={{
          background: 'repeating-linear-gradient(45deg, #fee2e2, #fee2e2 5px, #fecaca 5px, #fecaca 10px)'
        }}
        onClick={canInteract ? onClick : undefined}
      >
        <div className="text-center bg-white/80 rounded px-2 py-1">
          <span className="text-red-500 text-lg font-bold">✕</span>
          <span className="block text-xs text-red-600 font-medium">Indisponibil</span>
        </div>
      </div>
    )
  }

  if (canInteract) {
    return (
      <div
        className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-gray-50 group"
        onClick={onClick}
      >
        <span className="text-gray-300 text-4xl opacity-0 group-hover:opacity-100 transition-opacity">+</span>
      </div>
    )
  }

  return null
}
