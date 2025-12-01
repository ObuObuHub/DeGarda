'use client'

import { useState } from 'react'
import { type Shift, type SwapRequest, type User } from '@/lib/supabase'
import { parseISODate } from '@/lib/dateUtils'

interface SwapRequestModalProps {
  isOpen: boolean
  onClose: () => void
  currentShift: Shift | null
  availableShifts: Shift[]
  currentUser: User
  onSendRequests: (targetShiftIds: string[]) => void
}

export default function SwapRequestModal({
  isOpen,
  onClose,
  currentShift,
  availableShifts,
  currentUser,
  onSendRequests
}: SwapRequestModalProps) {
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set())

  if (!isOpen || !currentShift) return null

  const formatDate = (dateStr: string) => {
    const date = parseISODate(dateStr)
    const dayNames = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm']
    const monthNames = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec']
    return `${dayNames[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]}`
  }

  // Filter shifts that can be swapped with
  const eligibleShifts = availableShifts.filter(shift =>
    shift.id !== currentShift.id &&
    shift.assigned_to &&
    shift.assigned_to !== currentUser.id &&
    shift.status === 'assigned' &&
    shift.department === currentShift.department
  )

  const toggleTarget = (shiftId: string) => {
    const newSelected = new Set(selectedTargets)
    if (newSelected.has(shiftId)) {
      newSelected.delete(shiftId)
    } else {
      newSelected.add(shiftId)
    }
    setSelectedTargets(newSelected)
  }

  const handleSend = () => {
    if (selectedTargets.size === 0) return
    onSendRequests(Array.from(selectedTargets))
    setSelectedTargets(new Set())
    onClose()
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
            ? 'bottom-0 left-0 right-0 rounded-b-none max-h-[80vh]'
            : 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md max-h-[80vh]'
        } flex flex-col`}
      >
        {/* Header */}
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg">Solicită schimb de tură</h3>
          <p className="text-sm text-gray-600 mt-1">
            Tura ta: {formatDate(currentShift.shift_date)} • {currentShift.department}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {eligibleShifts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nu există ture disponibile pentru schimb în acest departament.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Selectează turele cu care dorești să faci schimb:
              </p>
              <div className="space-y-2">
                {eligibleShifts.map(shift => (
                  <label
                    key={shift.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedTargets.has(shift.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTargets.has(shift.id)}
                      onChange={() => toggleTarget(shift.id)}
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{shift.user?.name || 'Necunoscut'}</p>
                      <p className="text-sm text-gray-600">{formatDate(shift.shift_date)}</p>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Anulează
          </button>
          <button
            onClick={handleSend}
            disabled={selectedTargets.size === 0}
            className="flex-1 py-2 px-4 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Trimite {selectedTargets.size > 0 && `(${selectedTargets.size})`}
          </button>
        </div>
      </div>
    </>
  )
}

// Component for viewing and responding to incoming swap requests
interface SwapRequestsViewProps {
  isOpen: boolean
  onClose: () => void
  requests: SwapRequest[]
  onAccept: (requestId: string) => void
  onReject: (requestId: string) => void
}

export function SwapRequestsView({
  isOpen,
  onClose,
  requests,
  onAccept,
  onReject
}: SwapRequestsViewProps) {
  if (!isOpen) return null

  const formatDate = (dateStr: string) => {
    const date = parseISODate(dateStr)
    const dayNames = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă']
    const monthNames = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
                       'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie']
    return `${dayNames[date.getDay()]}, ${date.getDate()} ${monthNames[date.getMonth()]}`
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
            ? 'bottom-0 left-0 right-0 rounded-b-none max-h-[60vh]'
            : 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md max-h-[80vh]'
        } flex flex-col`}
      >
        {/* Header */}
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg">Cereri de schimb primite</h3>
          <p className="text-sm text-gray-600">
            {requests.length} {requests.length === 1 ? 'cerere' : 'cereri'} în așteptare
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {requests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nu ai cereri de schimb în așteptare.
            </p>
          ) : (
            <div className="space-y-3">
              {requests.map(request => (
                <div key={request.id} className="border rounded-lg p-4">
                  <p className="font-medium">{request.requester?.name || 'Necunoscut'}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Dorește să schimbe: {request.requester_shift?.shift_date
                      ? formatDate(request.requester_shift.shift_date)
                      : 'Data necunoscută'}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => onAccept(request.id)}
                      className="flex-1 py-2 px-3 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                    >
                      Acceptă
                    </button>
                    <button
                      onClick={() => onReject(request.id)}
                      className="flex-1 py-2 px-3 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                    >
                      Refuză
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Închide
          </button>
        </div>
      </div>
    </>
  )
}
