'use client'

import React from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface ShiftOptionsModalProps {
  isOpen: boolean
  onClose: () => void
  date: string
  onAssign: () => void
  onReserve: () => void
  onDelete?: () => void
  hasShift?: boolean
  currentUserId?: string // To show reservation count
}

export const ShiftOptionsModal: React.FC<ShiftOptionsModalProps> = ({
  isOpen,
  onClose,
  date,
  onAssign,
  onReserve,
  onDelete,
  hasShift,
  currentUserId
}) => {
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    const days = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă']
    const months = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${days[date.getDay()]}, ${day} ${months[parseInt(month) - 1]} ${year}`
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Alege Acțiunea" size="sm">
      <div className="space-y-4">
        <div className="text-center p-4 bg-background-secondary rounded-ios">
          <p className="text-lg font-medium text-label-primary">{formatDate(date)}</p>
        </div>

        <div className="space-y-3">
          <Button 
            fullWidth 
            onClick={onAssign}
          >
            Atribuie Gardă
          </Button>
          
          <Button 
            fullWidth 
            variant="secondary"
            onClick={onReserve}
          >
            🔒 Rezervă pentru Mine
          </Button>

          {hasShift && onDelete && (
            <Button 
              fullWidth 
              variant="danger"
              onClick={onDelete}
            >
              Șterge Garda
            </Button>
          )}
          
          <p className="text-xs text-center text-label-tertiary">
            Max. 3 rezervări pe lună
          </p>
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Anulează
          </Button>
        </div>
      </div>
    </Modal>
  )
}