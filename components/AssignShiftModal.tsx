'use client'

import React from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface Doctor {
  id: string
  name: string
  department?: string
  shiftsThisMonth: number
  weekendShifts: number
  isAvailable: boolean
}

interface AssignShiftModalProps {
  isOpen: boolean
  onClose: () => void
  date: string
  doctors: Doctor[]
  onAssign: (doctorId: string) => void
  selectedDepartment?: string
  shiftDepartment?: string
}

export const AssignShiftModal: React.FC<AssignShiftModalProps> = ({
  isOpen,
  onClose,
  date,
  doctors,
  onAssign,
  selectedDepartment,
  shiftDepartment
}) => {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    const days = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă']
    return `${days[date.getDay()]}, ${day}.${month}.${year}`
  }

  const isWeekend = (dateStr: string) => {
    if (!dateStr) return false
    const [year, month, day] = dateStr.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    return date.getDay() === 0 || date.getDay() === 6
  }

  const weekend = isWeekend(date)
  
  // Filter doctors by department
  const departmentToShow = shiftDepartment || selectedDepartment
  const filteredDoctors = departmentToShow 
    ? (doctors || []).filter(d => d.department === departmentToShow)
    : (doctors || [])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Atribuie Gardă" size="md">
      <div className="space-y-4">
        <div className="text-center p-4 bg-background-secondary rounded-ios">
          <p className="text-lg font-medium text-label-primary">{formatDate(date)}</p>
          {weekend && (
            <p className="text-sm text-system-blue mt-1">Gardă de Weekend</p>
          )}
          {departmentToShow && (
            <p className="text-sm text-label-secondary mt-1">Departament: {departmentToShow}</p>
          )}
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredDoctors.length === 0 ? (
            <p className="text-center text-label-secondary py-8">
              Nu există personal disponibil pentru acest departament
            </p>
          ) : (
            filteredDoctors.map(doctor => (
            <div
              key={doctor.id}
              className={`
                p-4 rounded-ios border transition-all
                ${doctor.isAvailable 
                  ? 'bg-white border-gray-200 hover:border-system-blue cursor-pointer' 
                  : 'bg-gray-50 border-gray-100 opacity-50'
                }
              `}
              onClick={() => doctor.isAvailable && onAssign(doctor.id)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-label-primary">
                    {doctor.name}
                  </h3>
                  <div className="flex gap-4 text-sm text-label-secondary mt-1">
                    <span>Gărzi luna aceasta: {doctor.shiftsThisMonth}</span>
                    {weekend && (
                      <span className={doctor.weekendShifts === 0 ? 'text-system-orange' : ''}>
                        Weekend: {doctor.weekendShifts}
                      </span>
                    )}
                  </div>
                </div>
                {!doctor.isAvailable && (
                  <span className="text-sm text-system-red">Indisponibil</span>
                )}
              </div>
              
              {/* Visual indicator for fairness */}
              {doctor.isAvailable && (
                <div className="mt-2">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        doctor.shiftsThisMonth < 5 ? 'bg-system-green' :
                        doctor.shiftsThisMonth < 8 ? 'bg-system-orange' :
                        'bg-system-red'
                      }`}
                      style={{ width: `${Math.min(doctor.shiftsThisMonth * 10, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))
          )}
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