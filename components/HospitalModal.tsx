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
    name: ''
  })

  useEffect(() => {
    if (hospital) {
      setFormData({
        name: hospital.name
      })
    } else {
      setFormData({
        name: ''
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
          placeholder="ex: Spitalul Județean de Urgență Piatra-Neamț"
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