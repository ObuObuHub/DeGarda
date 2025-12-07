'use client'

import { useState } from 'react'
import { type User, type Shift } from '@/lib/supabase'
import { type Conflict } from '@/hooks/useShiftActions'
import Tooltip from '@/components/ui/Tooltip'

interface ShiftActionMenuProps {
  isOpen: boolean
  onClose: () => void
  shift: Shift | null
  date: Date | null
  currentUser: User
  isUnavailable: boolean
  isPreferred: boolean
  hasReservation: boolean
  users?: User[]
  conflicts?: Conflict[]
  outgoingSwapRequestId?: string
  onCheckConflicts?: (userId: string, shiftDate: string) => Conflict[]
  onSetPreference: (type: 'unavailable' | 'preferred') => void
  onRemovePreference: () => void
  onMarkUnavailable: () => void  // Legacy
  onRemoveUnavailable: () => void  // Legacy
  onReserve: () => void
  onCancelReservation: () => void
  onAssign: (userId: string | null) => void
  onDelete: () => void
  onStartSwap: () => void
  onCancelSwap?: (swapRequestId: string) => void
}

export default function ShiftActionMenu({
  isOpen,
  onClose,
  shift,
  date,
  currentUser,
  isUnavailable,
  isPreferred,
  hasReservation,
  users = [],
  conflicts = [],
  outgoingSwapRequestId,
  onCheckConflicts,
  onSetPreference,
  onRemovePreference,
  // Legacy props kept for backward compatibility (unused)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onMarkUnavailable,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onRemoveUnavailable,
  onReserve,
  onCancelReservation,
  onAssign,
  onDelete,
  onStartSwap,
  onCancelSwap
}: ShiftActionMenuProps) {
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false)
  const [pendingAssignUserId, setPendingAssignUserId] = useState<string | null>(null)
  const [pendingConflicts, setPendingConflicts] = useState<Conflict[]>([])

  if (!isOpen) return null

  const isStaff = currentUser.role === 'STAFF'
  const isManager = currentUser.role !== 'STAFF'
  const isAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'HOSPITAL_ADMIN'

  // Check if there are blocking conflicts (errors)
  const hasBlockingConflicts = conflicts.some(c => c.severity === 'error')

  // Handler for assigning with conflict check
  const handleAssignWithCheck = (userId: string) => {
    if (onCheckConflicts && date) {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const userConflicts = onCheckConflicts(userId, dateStr)

      if (userConflicts.length > 0) {
        setPendingConflicts(userConflicts)
        setPendingAssignUserId(userId)
        setShowOverrideConfirm(true)
        return
      }
    }
    onAssign(userId)
    onClose()
  }

  // Handler for confirming assignment despite conflicts
  const handleConfirmAssign = () => {
    if (pendingAssignUserId !== null) {
      onAssign(pendingAssignUserId)
    }
    setShowOverrideConfirm(false)
    setPendingAssignUserId(null)
    setPendingConflicts([])
    onClose()
  }

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
            ? 'bottom-0 left-0 right-0 rounded-b-none p-4 pb-safe'
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
          <p className="text-xs text-gray-400 mt-2">
            Alege o acțiune din lista de mai jos:
          </p>
        </div>

        {/* Conflict Warnings Banner */}
        {conflicts.length > 0 && (
          <div className={`mb-4 p-3 rounded-lg ${
            hasBlockingConflicts ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-start gap-2">
              <span className="text-lg">{hasBlockingConflicts ? '🚫' : '⚠️'}</span>
              <div className="flex-1">
                <p className={`font-medium text-sm ${hasBlockingConflicts ? 'text-red-800' : 'text-yellow-800'}`}>
                  {hasBlockingConflicts ? 'Conflict de programare' : 'Avertismente'}
                </p>
                <ul className="mt-1 space-y-1">
                  {conflicts.map((conflict, index) => (
                    <li key={index} className={`text-xs ${
                      conflict.severity === 'error' ? 'text-red-700' : 'text-yellow-700'
                    }`}>
                      • {conflict.message}
                    </li>
                  ))}
                </ul>
                {isStaff && hasBlockingConflicts && (
                  <p className="text-xs text-red-600 mt-2 font-medium">
                    Nu poți rezerva această tură din cauza conflictelor.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Override Confirmation Modal */}
        {showOverrideConfirm && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="font-medium text-sm text-yellow-800 mb-2">
              Confirmare asignare cu conflicte
            </p>
            <ul className="mb-3 space-y-1">
              {pendingConflicts.map((conflict, index) => (
                <li key={index} className={`text-xs ${
                  conflict.severity === 'error' ? 'text-red-700' : 'text-yellow-700'
                }`}>
                  • {conflict.message}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmAssign}
                className="flex-1 px-3 py-2 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                Asignează oricum
              </button>
              <button
                onClick={() => {
                  setShowOverrideConfirm(false)
                  setPendingAssignUserId(null)
                  setPendingConflicts([])
                }}
                className="flex-1 px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Anulează
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {/* Staff Actions */}
          {isStaff && !shift && (
            <>
              {/* Preference options - show when no reservation */}
              {!hasReservation && !isPreferred && !isUnavailable && (
                <>
                  <ActionButton
                    icon="💚"
                    label="Prefer să lucrez"
                    tooltip="Marchează că preferi să lucrezi în această zi"
                    variant="success"
                    onClick={async () => {
                      onSetPreference('preferred')
                      onClose()
                    }}
                  />
                  <ActionButton
                    icon="🚫"
                    label="Indisponibil"
                    tooltip="Nu poți lucra în această zi"
                    variant="danger"
                    onClick={async () => {
                      onSetPreference('unavailable')
                      onClose()
                    }}
                  />
                </>
              )}

              {/* Already has a preference - show remove option and switch option */}
              {!hasReservation && (isPreferred || isUnavailable) && (
                <>
                  {isPreferred && (
                    <ActionButton
                      icon="🚫"
                      label="Schimbă în Indisponibil"
                      tooltip="Marchează că nu poți lucra"
                      variant="danger"
                      onClick={async () => {
                        onSetPreference('unavailable')
                        onClose()
                      }}
                    />
                  )}
                  {isUnavailable && (
                    <ActionButton
                      icon="💚"
                      label="Schimbă în Preferată"
                      tooltip="Marchează că preferi să lucrezi"
                      variant="success"
                      onClick={async () => {
                        onSetPreference('preferred')
                        onClose()
                      }}
                    />
                  )}
                  <ActionButton
                    icon="❌"
                    label="Șterge preferința"
                    tooltip="Revino la starea normală"
                    onClick={async () => {
                      onRemovePreference()
                      onClose()
                    }}
                  />
                </>
              )}

              {/* Reserve option - always available if no reservation */}
              {!hasReservation && (
                <ActionButton
                  icon="⭐"
                  label="Rezervă tură"
                  tooltip="Solicită să lucrezi în această zi"
                  variant="success"
                  onClick={async () => {
                    await onReserve()
                    onClose()
                  }}
                />
              )}

              {/* Cancel reservation */}
              {hasReservation && (
                <ActionButton
                  icon="❌"
                  label="Anulează rezervarea"
                  tooltip="Renunță la rezervarea făcută"
                  variant="danger"
                  onClick={async () => {
                    await onCancelReservation()
                    onClose()
                  }}
                />
              )}
            </>
          )}

          {/* Staff Actions for existing shift */}
          {isStaff && shift && (
            <>
              {shift.assigned_to === currentUser.id && shift.status === 'assigned' && !outgoingSwapRequestId && (
                <ActionButton
                  icon="↔️"
                  label="Solicită schimb"
                  tooltip="Propune schimb de tură cu un coleg"
                  onClick={async () => {
                    await onStartSwap()
                    onClose()
                  }}
                />
              )}
              {shift.assigned_to === currentUser.id && outgoingSwapRequestId && onCancelSwap && (
                <ActionButton
                  icon="🚫"
                  label="Anulează cererea de schimb"
                  tooltip="Retrage cererea de schimb trimisă"
                  variant="danger"
                  onClick={async () => {
                    await onCancelSwap(outgoingSwapRequestId)
                    onClose()
                  }}
                />
              )}
              {shift.assigned_to === currentUser.id && shift.status === 'reserved' && (
                <ActionButton
                  icon="❌"
                  label="Anulează rezervarea"
                  tooltip="Renunță la rezervarea făcută"
                  variant="danger"
                  onClick={async () => {
                    await onCancelReservation()
                    onClose()
                  }}
                />
              )}
              {shift.status === 'available' && shift.department === currentUser.department && (
                <ActionButton
                  icon="⭐"
                  label="Rezervă această tură"
                  tooltip="Solicită să lucrezi această tură"
                  variant="success"
                  onClick={async () => {
                    await onReserve()
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
                tooltip="Alege un membru al echipei"
                onClick={() => {
                  // Show staff list - handled by parent
                }}
                subMenu={
                  <div className="mt-2 ml-8 space-y-1 border-l-2 border-gray-200 pl-3">
                    {users.filter(u => u.role === 'STAFF').map(user => {
                      // Check conflicts for this user when rendering
                      let userConflicts: Conflict[] = []
                      if (onCheckConflicts && date) {
                        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                        userConflicts = onCheckConflicts(user.id, dateStr)
                      }
                      const hasConflict = userConflicts.length > 0

                      return (
                        <button
                          key={user.id}
                          onClick={() => handleAssignWithCheck(user.id)}
                          className={`block w-full text-left px-3 py-2 text-sm rounded flex items-center justify-between ${
                            hasConflict ? 'hover:bg-yellow-50' : 'hover:bg-gray-100'
                          }`}
                        >
                          <span>{user.name}</span>
                          {hasConflict && (
                            <Tooltip content={userConflicts.map(c => c.message).join(', ')} position="left">
                              <span className="text-yellow-600 cursor-help">⚠️</span>
                            </Tooltip>
                          )}
                        </button>
                      )
                    })}
                  </div>
                }
              />
              {shift.assigned_to && (
                <ActionButton
                  icon="🔓"
                  label="Marchează disponibil"
                  tooltip="Eliberează tura pentru a fi rezervată de altcineva"
                  onClick={async () => {
                    await onAssign(null)
                    onClose()
                  }}
                />
              )}
              {(isAdmin || currentUser.role === 'DEPARTMENT_MANAGER') && (
                <ActionButton
                  icon="🗑️"
                  label="Șterge tura"
                  tooltip="Șterge definitiv această tură"
                  variant="danger"
                  onClick={async () => {
                    await onDelete()
                    onClose()
                  }}
                />
              )}
            </>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 min-h-[44px] text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Închide meniul"
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
  tooltip?: string
  onClick?: () => void
  variant?: 'default' | 'success' | 'danger'
  subMenu?: React.ReactNode
}

function ActionButton({ icon, label, tooltip, onClick, variant = 'default', subMenu }: ActionButtonProps) {
  const variantStyles = {
    default: 'hover:bg-gray-100',
    success: 'hover:bg-green-50 text-green-700',
    danger: 'hover:bg-red-50 text-red-600'
  }

  return (
    <div>
      <button
        onClick={onClick}
        title={tooltip}
        className={`w-full text-left px-4 py-3 min-h-[44px] rounded-lg text-base flex items-center gap-3 transition-colors active:bg-gray-200 ${variantStyles[variant]}`}
      >
        <span className="text-xl">{icon}</span>
        <div className="flex-1">
          <span>{label}</span>
          {tooltip && <p className="text-xs text-gray-400 mt-0.5">{tooltip}</p>}
        </div>
      </button>
      {subMenu}
    </div>
  )
}
