'use client'

import { useState } from 'react'
import { supabase, type User, type Shift, type UnavailableDate } from '@/lib/supabase'
import { DEPARTMENTS, Department } from '@/types'

interface ShiftGeneratorProps {
  isOpen: boolean
  onClose: () => void
  onGenerated: () => void
  existingShifts: Shift[]
  unavailableDates: UnavailableDate[]
  users: User[]
  selectedDate: Date
}

export default function ShiftGenerator({
  isOpen,
  onClose,
  onGenerated,
  existingShifts,
  unavailableDates,
  users,
  selectedDate
}: ShiftGeneratorProps) {
  const [generating, setGenerating] = useState(false)
  const [department, setDepartment] = useState<Department | ''>('')

  if (!isOpen) return null

  const generateFairShifts = async () => {
    if (!department) {
      alert('Selectează un departament!')
      return
    }

    setGenerating(true)

    try {
      // Calculate month range from selectedDate
      const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
      const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
      // Get staff for this department
      const departmentStaff = users.filter(
        u => u.department === department && u.role === 'STAFF'
      )

      if (departmentStaff.length === 0) {
        alert('Nu există personal în acest departament!')
        setGenerating(false)
        return
      }

      const shifts: Array<{
        shift_date: string
        shift_time: string
        department: string
        assigned_to?: string
        status: 'available' | 'reserved' | 'assigned'
      }> = []

      // Count existing shifts per user for fair distribution
      const userShiftCounts: Record<string, number> = {}
      departmentStaff.forEach(staff => {
        userShiftCounts[staff.id] = existingShifts.filter(
          s => s.assigned_to === staff.id
        ).length
      })

      // Generate shifts for each day
      let currentDate = new Date(start)
      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0]
        
        // Check if a 24h shift already exists for this day and department
        const existingDayShift = existingShifts.find(
          s => s.shift_date === dateStr && s.department === department
        )

        // If shift exists and is reserved, we should update it to assigned
        if (existingDayShift) {
          if (existingDayShift.status === 'reserved' && existingDayShift.assigned_to) {
            // Update existing reserved shift to assigned
            await supabase
              .from('shifts')
              .update({ status: 'assigned' })
              .eq('id', existingDayShift.id)
          }
          continue
        }

        // Find available staff for this 24h shift
        const availableStaff = departmentStaff.filter(staff => {
          // Check if user is unavailable on this date
          const isUnavailable = unavailableDates.some(
            ud => ud.user_id === staff.id && ud.unavailable_date === dateStr
          )
          
          // Check if user already has a shift on this day
          const hasShiftToday = existingShifts.some(
            s => s.assigned_to === staff.id && s.shift_date === dateStr
          )

          return !isUnavailable && !hasShiftToday
        })

        if (availableStaff.length > 0) {
          // Sort by who has the least shifts (fair distribution)
          availableStaff.sort((a, b) => 
            (userShiftCounts[a.id] || 0) - (userShiftCounts[b.id] || 0)
          )

          // Assign shift to staff with least shifts
          const assignedStaff = availableStaff[0]
          
          shifts.push({
            shift_date: dateStr,
            shift_time: '24h',
            department: department,
            assigned_to: assignedStaff.id,
            status: 'assigned'
          })

          // Update count
          userShiftCounts[assignedStaff.id] = (userShiftCounts[assignedStaff.id] || 0) + 1
        } else {
          // Create unassigned shift
          shifts.push({
            shift_date: dateStr,
            shift_time: '24h',
            department: department,
            status: 'available'
          })
        }
        
        // Move to next day
        currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)
      }

      // Insert all shifts
      if (shifts.length > 0) {
        const { error } = await supabase
          .from('shifts')
          .insert(shifts)

        if (!error) {
          alert(`Generat ${shifts.length} ture cu succes!`)
          onGenerated()
          onClose()
          // Reset form
          setDepartment('')
        } else {
          alert('Eroare la generare: ' + error.message)
        }
      } else {
        alert('Nu sunt ture noi de generat pentru această perioadă.')
      }
    } catch (error) {
      alert('Eroare la generare')
    } finally {
      setGenerating(false)
    }
  }

  const monthNames = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 
                      'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie']
  const currentMonth = monthNames[selectedDate.getMonth()]
  const currentYear = selectedDate.getFullYear()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card max-w-lg w-full">
        <h2 className="text-xl font-semibold mb-4">
          📅 Generează Ture pentru {currentMonth} {currentYear}
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Departament
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value as Department)}
              className="input"
              required
            >
              <option value="">Selectează departamentul</option>
              {DEPARTMENTS.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg text-sm">
            <h4 className="font-medium text-blue-900 mb-2">Cum funcționează:</h4>
            <ul className="text-blue-800 space-y-1">
              <li>• Generează ture de 24 ore pentru fiecare zi</li>
              <li>• Distribuie turele echitabil între personal</li>
              <li>• Respectă zilele de indisponibilitate</li>
              <li>• Nu suprascrie turele existente</li>
              <li>• Asignează automat personalul disponibil</li>
              <li>• Creează ture libere când nu e nimeni disponibil</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={generateFairShifts}
              disabled={generating || !department}
              className="btn btn-primary flex-1"
            >
              {generating ? '🔄 Se generează...' : '✨ Generează Ture'}
            </button>
            <button
              onClick={onClose}
              disabled={generating}
              className="btn btn-secondary"
            >
              Anulează
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}