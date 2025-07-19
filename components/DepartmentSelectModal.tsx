'use client'

import React from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface DepartmentSelectModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (department: string) => void
  date: string
}

const DEPARTMENTS = [
  { id: 'ATI', name: 'ATI', icon: '🏥' },
  { id: 'Urgențe', name: 'Urgențe', icon: '🚑' },
  { id: 'Laborator', name: 'Laborator', icon: '🔬' },
  { id: 'Medicină Internă', name: 'Medicină Internă', icon: '🩺' },
  { id: 'Chirurgie', name: 'Chirurgie', icon: '⚕️' }
]

export const DepartmentSelectModal: React.FC<DepartmentSelectModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  date
}) => {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-')
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    const days = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă']
    const months = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${days[dateObj.getDay()]}, ${day} ${months[parseInt(month) - 1]} ${year}`
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Selectează Departamentul" size="md">
      <div className="space-y-4">
        <div className="text-center p-4 bg-background-secondary rounded-ios">
          <p className="text-lg font-medium text-label-primary">{formatDate(date)}</p>
          <p className="text-sm text-label-secondary mt-1">
            Pentru care departament doriți să creați o gardă?
          </p>
        </div>

        <div className="space-y-2">
          {DEPARTMENTS.map(dept => (
            <Button
              key={dept.id}
              fullWidth
              variant="secondary"
              onClick={() => {
                onSelect(dept.id)
                onClose()
              }}
              className="justify-start text-left"
            >
              <span className="text-2xl mr-3">{dept.icon}</span>
              <span className="font-medium">{dept.name}</span>
            </Button>
          ))}
        </div>

        <div className="flex justify-end pt-2 border-t border-separator">
          <Button variant="ghost" onClick={onClose}>
            Anulează
          </Button>
        </div>
      </div>
    </Modal>
  )
}