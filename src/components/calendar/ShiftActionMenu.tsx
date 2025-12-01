'use client'

import { type User, type Shift } from '@/lib/supabase'

interface ShiftActionMenuProps {
  isOpen: boolean
  onClose: () => void
  shift: Shift | null
  date: Date | null
  currentUser: User
  isUnavailable: boolean
  hasReservation: boolean
  users?: User[]
  onMarkUnavailable: () => void
  onRemoveUnavailable: () => void
  onReserve: () => void
  onCancelReservation: () => void
  onAssign: (userId: string | null) => void
  onDelete: () => void
  onStartSwap: () => void
}

export default function ShiftActionMenu({
  isOpen,
  onClose,
  shift,
  date,
  currentUser,
  isUnavailable,
  hasReservation,
  users = [],
  onMarkUnavailable,
  onRemoveUnavailable,
  onReserve,
  onCancelReservation,
  onAssign,
  onDelete,
  onStartSwap
}: ShiftActionMenuProps) {
  if (!isOpen) return null

  const isStaff = currentUser.role === 'STAFF'
  const isManager = currentUser.role !== 'STAFF'
  const isAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'HOSPITAL_ADMIN'

  const formatDate = (d: Date) => {
    const dayNames = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă']
    const monthNames = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
                       'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie']
    return `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]}`
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />
      <div
        className={`fixed z-50 bg-white rounded-lg shadow-xl border ${
          isMobile
            ? 'bottom-0 left-0 right-0 rounded-b-none p-4'
            : 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-4 min-w-[320px]'
        }`}
      >
        <div className="mb-4">
          <h3 className="font-semibold text-lg mb-1">
            {shift ? 'Acțiuni pentru tură' : 'Acțiuni pentru zi'}
          </h3>
          {date && (
            <p className="text-sm text-gray-600">
              {formatDate(date)}
              {shift?.department && ` • ${shift.department}`}
              {shift?.user && ` • ${shift.user.name}`}
            </p>
          )}
        </div>

        <div className="space-y-2">
          {/* Staff Actions */}
          {isStaff && !shift && (
            <>
              {!isUnavailable && !hasReservation && (
                <ActionButton
                  icon="🚫"
                  label="Marchează indisponibil"
                  onClick={() => {
                    onMarkUnavailable()
                    onClose()
                  }}
                />
              )}
              {isUnavailable && !hasReservation && (
                <>
                  <ActionButton
                    icon="✅"
                    label="Anulează indisponibilitate"
                    onClick={() => {
                      onRemoveUnavailable()
                      onClose()
                    }}
                  />
                  <ActionButton
                    icon="⭐"
                    label="Rezervă tură"
                    variant="success"
                    onClick={() => {
                      onReserve()
                      onClose()
                    }}
                  />
                </>
              )}
              {hasReservation && (
                <ActionButton
                  icon="❌"
                  label="Anulează rezervarea"
                  variant="danger"
                  onClick={() => {
                    onCancelReservation()
                    onClose()
                  }}
                />
              )}
            </>
          )}

          {/* Staff Actions for existing shift */}
          {isStaff && shift && (
            <>
              {shift.assigned_to === currentUser.id && shift.status === 'assigned' && (
                <ActionButton
                  icon="↔️"
                  label="Solicită schimb"
                  onClick={() => {
                    onStartSwap()
                    onClose()
                  }}
                />
              )}
              {shift.assigned_to === currentUser.id && shift.status === 'reserved' && (
                <ActionButton
                  icon="❌"
                  label="Anulează rezervarea"
                  variant="danger"
                  onClick={() => {
                    onCancelReservation()
                    onClose()
                  }}
                />
              )}
              {shift.status === 'available' && shift.department === currentUser.department && (
                <ActionButton
                  icon="⭐"
                  label="Rezervă această tură"
                  variant="success"
                  onClick={() => {
                    onReserve()
                    onClose()
                  }}
                />
              )}
            </>
          )}

          {/* Manager/Admin Actions */}
          {isManager && shift && (
            <>
              <ActionButton
                icon="👥"
                label={shift.assigned_to ? 'Reasignează tura' : 'Asignează tura'}
                onClick={() => {
                  // Show staff list - handled by parent
                }}
                subMenu={
                  <div className="mt-2 ml-8 space-y-1 border-l-2 border-gray-200 pl-3">
                    {users.filter(u => u.role === 'STAFF').map(user => (
                      <button
                        key={user.id}
                        onClick={() => {
                          onAssign(user.id)
                          onClose()
                        }}
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                      >
                        {user.name}
                      </button>
                    ))}
                  </div>
                }
              />
              {shift.assigned_to && (
                <ActionButton
                  icon="🔓"
                  label="Marchează disponibil"
                  onClick={() => {
                    onAssign(null)
                    onClose()
                  }}
                />
              )}
              {isAdmin && (
                <ActionButton
                  icon="🗑️"
                  label="Șterge tura"
                  variant="danger"
                  onClick={() => {
                    onDelete()
                    onClose()
                  }}
                />
              )}
            </>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Închide
        </button>
      </div>
    </>
  )
}

interface ActionButtonProps {
  icon: string
  label: string
  onClick?: () => void
  variant?: 'default' | 'success' | 'danger'
  subMenu?: React.ReactNode
}

function ActionButton({ icon, label, onClick, variant = 'default', subMenu }: ActionButtonProps) {
  const variantStyles = {
    default: 'hover:bg-gray-100',
    success: 'hover:bg-green-50 text-green-700',
    danger: 'hover:bg-red-50 text-red-600'
  }

  return (
    <div>
      <button
        onClick={onClick}
        className={`w-full text-left px-4 py-3 rounded-lg text-base flex items-center gap-3 transition-colors ${variantStyles[variant]}`}
      >
        <span className="text-xl">{icon}</span>
        <span>{label}</span>
      </button>
      {subMenu}
    </div>
  )
}
