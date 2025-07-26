'use client'

import { useState } from 'react'
import { supabase, type User, type Shift, type UnavailableDate } from '@/lib/supabase'
import { DEPARTMENTS, SHIFT_TIMES, Department, ShiftTime } from '@/types'

interface ShiftGeneratorProps {
  isOpen: boolean
  onClose: () => void
  onGenerated: () => void
  existingShifts: Shift[]
  unavailableDates: UnavailableDate[]
  users: User[]
}

export default function ShiftGenerator({
  isOpen,
  onClose,
  onGenerated,
  existingShifts,
  unavailableDates,
  users
}: ShiftGeneratorProps) {
  const [generating, setGenerating] = useState(false)
  const [department, setDepartment] = useState<Department | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [shiftsPerDay, setShiftsPerDay] = useState(2)

  if (!isOpen) return null

  const generateFairShifts = async () => {
    if (!department || !startDate || !endDate) {
      alert('Completează toate câmpurile!')
      return
    }

    setGenerating(true)

    try {
      // Get staff for this department
      const departmentStaff = users.filter(
        u => u.department === department && u.role === 'STAFF'
      )

      if (departmentStaff.length === 0) {
        alert('Nu există personal în acest departament!')
        setGenerating(false)
        return
      }

      // Create date range
      const start = new Date(startDate)
      const end = new Date(endDate)
      const shifts: Array<{
        shift_date: string
        shift_time: string
        department: string
        assigned_to?: string
        status: 'available' | 'reserved'
      }> = []

      // Count existing shifts per user for fair distribution
      const userShiftCounts: Record<string, number> = {}
      departmentStaff.forEach(staff => {
        userShiftCounts[staff.id] = existingShifts.filter(
          s => s.assigned_to === staff.id
        ).length
      })

      // Generate shifts for each day
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0]
        
        // Check if shifts already exist for this day
        const existingDayShifts = existingShifts.filter(
          s => s.shift_date === dateStr && s.department === department
        )

        // For each shift time
        for (const shiftTime of SHIFT_TIMES) {
          // Skip if shift already exists
          if (existingDayShifts.some(s => s.shift_time === shiftTime)) {
            continue
          }

          // Find available staff for this shift
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
              shift_time: shiftTime,
              department: department,
              assigned_to: assignedStaff.id,
              status: 'reserved'
            })

            // Update count
            userShiftCounts[assignedStaff.id] = (userShiftCounts[assignedStaff.id] || 0) + 1
          } else {
            // Create unassigned shift
            shifts.push({
              shift_date: dateStr,
              shift_time: shiftTime,
              department: department,
              status: 'available'
            })
          }
        }
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
          setStartDate('')
          setEndDate('')
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="card max-w-lg w-full">
        <h2 className="text-xl font-semibold mb-4">📅 Generator Ture Echitabil</h2>
        
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data început
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data sfârșit
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input"
                required
                min={startDate || new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg text-sm">
            <h4 className="font-medium text-blue-900 mb-2">Cum funcționează:</h4>
            <ul className="text-blue-800 space-y-1">
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
              disabled={generating || !department || !startDate || !endDate}
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