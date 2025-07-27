'use client'

import { useState } from 'react'
import { supabase, type User, type Shift } from '@/lib/supabase'

interface SwapRequestModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser: User
  userShifts: Shift[]
  targetShifts: Shift[]
  onSwapRequested: () => void
}

export default function SwapRequestModal({
  isOpen,
  onClose,
  currentUser,
  userShifts,
  targetShifts,
  onSwapRequested
}: SwapRequestModalProps) {
  const [fromShiftId, setFromShiftId] = useState('')
  const [toShiftId, setToShiftId] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fromShiftId || !toShiftId) return

    setLoading(true)

    const { error } = await supabase
      .from('swap_requests')
      .insert({
        requester_id: currentUser.id,
        from_shift_id: fromShiftId,
        to_shift_id: toShiftId
      })

    if (!error) {
      onSwapRequested()
      onClose()
      setFromShiftId('')
      setToShiftId('')
    }
    
    setLoading(false)
  }

  const formatShift = (shift: Shift) => {
    const date = new Date(shift.shift_date).toLocaleDateString('ro-RO')
    const owner = shift.user?.name || 'Necunoscut'
    const status = shift.status === 'assigned' ? 'Asignat' : 'Rezervat'
    return `${date} - ${shift.department} - ${owner} (${status})`
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">🔄 Cerere Schimb Tură</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tura pe care o ai și vrei să o schimbi:
            </label>
            <select
              value={fromShiftId}
              onChange={(e) => setFromShiftId(e.target.value)}
              className="input"
              required
            >
              <option value="">Selectează tura ta</option>
              {userShifts.map(shift => (
                <option key={shift.id} value={shift.id}>
                  {formatShift(shift)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tura în care vrei să intri:
            </label>
            <select
              value={toShiftId}
              onChange={(e) => setToShiftId(e.target.value)}
              className="input"
              required
            >
              <option value="">Selectează tura dorită</option>
              {targetShifts.map(shift => (
                <option key={shift.id} value={shift.id}>
                  {formatShift(shift)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading || !fromShiftId || !toShiftId}
              className="btn btn-primary flex-1"
            >
              {loading ? 'Se trimite...' : '📤 Trimite Cererea'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Anulează
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}