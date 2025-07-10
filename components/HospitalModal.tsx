'use client'

import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Hospital } from '@/lib/data'

interface HospitalModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (hospital: Omit<Hospital, 'id'>) => void
  hospital?: Hospital
}

export const HospitalModal: React.FC<HospitalModalProps> = ({
  isOpen,
  onClose,
  onSave,
  hospital
}) => {
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    departments: 5,
    staff: 20
  })

  useEffect(() => {
    if (hospital) {
      setFormData({
        name: hospital.name,
        city: hospital.city,
        departments: hospital.departments || 5,
        staff: hospital.staff || 20
      })
    } else {
      setFormData({
        name: '',
        city: '',
        departments: 5,
        staff: 20
      })
    }
  }, [hospital])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={hospital ? 'Editează Spital' : 'Adaugă Spital'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nume Spital"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="ex: Spitalul Județean"
          required
        />

        <Input
          label="Oraș"
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          placeholder="ex: Piatra-Neamț"
          required
        />

        <Input
          label="Număr Secții"
          type="number"
          value={formData.departments}
          onChange={(e) => setFormData({ ...formData, departments: parseInt(e.target.value) })}
          min="1"
          required
        />

        <Input
          label="Număr Personal"
          type="number"
          value={formData.staff}
          onChange={(e) => setFormData({ ...formData, staff: parseInt(e.target.value) })}
          min="1"
          required
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={onClose}>
            Anulează
          </Button>
          <Button type="submit">
            {hospital ? 'Salvează' : 'Adaugă'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}