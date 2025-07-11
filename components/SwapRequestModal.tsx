'use client'

import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { staff } from '@/lib/data'

interface SwapRequestModalProps {
  isOpen: boolean
  onClose: () => void
  shift: {
    date: string
    doctorId: string
    doctorName: string
    shiftId: string
  }
  onSubmit: (toStaffId: string | null, reason: string) => void
}

export const SwapRequestModal: React.FC<SwapRequestModalProps> = ({
  isOpen,
  onClose,
  shift,
  onSubmit
}) => {
  const [toStaffId, setToStaffId] = useState<string>('')
  const [reason, setReason] = useState('')

  // Get available staff (exclude current doctor)
  const availableStaff = staff.filter(s => 
    s.role === 'staff' && s.id !== shift.doctorId
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (reason.trim()) {
      onSubmit(toStaffId || null, reason)
      setToStaffId('')
      setReason('')
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Solicită Schimb Gardă"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-sm text-label-secondary">
            Gardă din data de <strong>{new Date(shift.date).toLocaleDateString('ro-RO')}</strong>
          </p>
          <p className="text-sm text-label-secondary mt-1">
            Atribuită lui: <strong>{shift.doctorName}</strong>
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-label-secondary mb-2">
            Doresc să schimb cu:
          </label>
          <select
            value={toStaffId}
            onChange={(e) => setToStaffId(e.target.value)}
            className="w-full px-4 py-3 bg-background-secondary border border-transparent rounded-ios text-base"
          >
            <option value="">Oricine disponibil</option>
            {availableStaff.map(member => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Motiv"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="ex: Urgență familială"
          required
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={onClose}>
            Anulează
          </Button>
          <Button type="submit">
            Trimite Cererea
          </Button>
        </div>
      </form>
    </Modal>
  )
}