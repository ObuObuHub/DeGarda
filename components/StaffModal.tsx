'use client'

import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StaffMember } from '@/lib/data'
import { useHospital } from '@/contexts/HospitalContext'

interface StaffModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (staff: Omit<StaffMember, 'id'>) => void
  staff?: StaffMember
}

export const StaffModal: React.FC<StaffModalProps> = ({
  isOpen,
  onClose,
  onSave,
  staff
}) => {
  const { selectedHospitalId } = useHospital()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    type: 'medic' as StaffMember['type'],
    specialization: 'ATI',
    hospitalId: selectedHospitalId || '1',
    role: 'staff' as StaffMember['role']
  })

  useEffect(() => {
    if (staff) {
      setFormData({
        name: staff.name,
        email: staff.email,
        type: staff.type,
        specialization: staff.specialization,
        hospitalId: staff.hospitalId,
        role: staff.role
      })
    } else {
      setFormData({
        name: '',
        email: '',
        type: 'medic',
        specialization: 'ATI',
        hospitalId: selectedHospitalId || '1',
        role: 'staff'
      })
    }
  }, [staff, selectedHospitalId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={staff ? 'Editează Personal' : 'Adaugă Personal'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nume"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Nume Prenume"
          required
        />

        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="nume.prenume@degarda.ro"
        />

        <div>
          <label className="block text-sm font-medium text-label-secondary mb-2">
            Tip
          </label>
          <select
            className="w-full px-4 py-3 bg-background-secondary border border-transparent rounded-ios text-base"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as StaffMember['type'] })}
          >
            <option value="medic">Medic</option>
            <option value="biolog">Biolog</option>
            <option value="chimist">Chimist</option>
            <option value="asistent">Asistent</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-label-secondary mb-2">
            Departament
          </label>
          <select
            className="w-full px-4 py-3 bg-background-secondary border border-transparent rounded-ios text-base"
            value={formData.specialization}
            onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
            required
          >
            <option value="ATI">ATI</option>
            <option value="Urgențe">Urgențe</option>
            <option value="Laborator">Laborator</option>
            <option value="Medicină Internă">Medicină Internă</option>
            <option value="Chirurgie">Chirurgie</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={onClose}>
            Anulează
          </Button>
          <Button type="submit">
            {staff ? 'Salvează' : 'Adaugă'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}