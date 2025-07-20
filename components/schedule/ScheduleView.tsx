'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Calendar } from '@/components/Calendar'

interface Shift {
  id: string | number
  date: string
  doctorId?: string | number | null
  doctorName?: string | null
  department?: string
  status?: 'open' | 'assigned' | 'reserved'
  type?: string
  reservedBy?: string
  reservedByName?: string
}

interface ScheduleViewProps {
  shifts: Shift[]
  viewMonth: number
  viewYear: number
  selectedDepartment: string
  onDateSelect: (date: string) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  onDepartmentChange: (dept: string) => void
  onExport?: () => void
  isLoading: boolean
}

export function ScheduleView({
  shifts,
  viewMonth,
  viewYear,
  selectedDepartment,
  onDateSelect,
  onPrevMonth,
  onNextMonth,
  onDepartmentChange,
  onExport,
  isLoading
}: ScheduleViewProps) {
  const currentDate = new Date()

  // Convert shifts array to Record format that Calendar expects
  const shiftsRecord = useMemo(() => {
    const record: Record<string, Shift> = {}
    shifts.forEach(shift => {
      if (shift.date) {
        record[shift.date] = shift
      }
    })
    return record
  }, [shifts])

  const handleDayClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    onDateSelect(dateStr)
  }

  const getDepartmentStats = () => {
    const stats = {
      total: shifts.length,
      assigned: shifts.filter(s => s.status === 'assigned').length,
      open: shifts.filter(s => s.status === 'open').length,
      reserved: shifts.filter(s => s.status === 'reserved').length
    }
    return stats
  }

  const stats = getDepartmentStats()

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Program Gărzi</h2>
          <p className="text-sm text-gray-600">
            {new Date(viewYear, viewMonth).toLocaleDateString('ro-RO', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              📊 Export Excel
            </Button>
          )}
        </div>
      </div>

      {/* Department Filter & Stats */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Departament
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => onDepartmentChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">Toate Departamentele</option>
              <option value="Laborator">Laborator</option>
              <option value="Urgențe">Urgențe</option>
              <option value="Chirurgie">Chirurgie</option>
              <option value="Medicină Internă">Medicină Internă</option>
              <option value="ATI">ATI</option>
            </select>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="text-center">
            <div className="font-semibold text-blue-600">{stats.assigned}</div>
            <div className="text-gray-600">Asignate</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-orange-600">{stats.reserved}</div>
            <div className="text-gray-600">Rezervate</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-red-600">{stats.open}</div>
            <div className="text-gray-600">Libere</div>
          </div>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onPrevMonth}>
            ← Luna anterioară
          </Button>
          <Button variant="ghost" size="sm" onClick={() => {
            // Reset to current month - parent should handle this
          }}>
            Azi
          </Button>
          <Button variant="ghost" size="sm" onClick={onNextMonth}>
            Luna următoare →
          </Button>
        </div>
      </div>

      {/* Calendar */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">
          Se încarcă programul...
        </div>
      ) : (
        <Calendar
          year={viewYear}
          month={viewMonth}
          shifts={shiftsRecord}
          onDayClick={handleDayClick}
        />
      )}
    </Card>
  )
}