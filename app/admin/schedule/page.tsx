'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Calendar } from '@/components/Calendar'
import { AssignShiftModal } from '@/components/AssignShiftModal'
import { generateMonthlySchedule } from '@/lib/shiftGenerator'
import { staff } from '@/lib/data'

// Convert staff to calendar format
const doctors = staff
  .filter(s => s.role === 'staff') // Only show actual staff, not admin/manager
  .map(s => ({
    id: s.id,
    name: s.name,
    shiftsThisMonth: 0,
    weekendShifts: 0,
    isAvailable: true,
    unavailableDates: [] as string[]
  }))

export default function SchedulePage() {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [shifts, setShifts] = useState<Record<string, any>>({
    '2025-01-06': { id: '1', doctorId: '1', doctorName: 'Dr. Albu Cristina', type: '24h', status: 'assigned' },
    '2025-01-13': { id: '2', doctorId: '2', doctorName: 'Dr. Radu Mihaela', type: '24h', status: 'assigned' },
  })

  const currentDate = new Date()
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth())
  const [viewYear, setViewYear] = useState(currentDate.getFullYear())

  const handleDayClick = (date: string) => {
    setSelectedDate(date)
  }

  const handleAssignDoctor = (doctorId: string) => {
    if (!selectedDate) return
    
    const doctor = doctors.find(d => d.id === doctorId)
    if (doctor) {
      setShifts({
        ...shifts,
        [selectedDate]: {
          id: Date.now().toString(),
          doctorId,
          doctorName: doctor.name,
          type: '24h',
          status: 'assigned'
        }
      })
    }
    setSelectedDate(null)
  }

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  const handleGenerateSchedule = () => {
    // Filter only available doctors
    const availableDoctors = doctors.filter(d => d.isAvailable)
    
    // Generate schedule for current month
    const generatedShifts = generateMonthlySchedule(
      viewYear,
      viewMonth,
      availableDoctors,
      shifts
    )
    
    // Convert to shift records
    const newShifts = { ...shifts }
    generatedShifts.forEach(shift => {
      newShifts[shift.date] = {
        id: Date.now().toString() + Math.random(),
        doctorId: shift.doctorId,
        doctorName: shift.doctorName,
        type: shift.type,
        status: 'assigned'
      }
    })
    
    setShifts(newShifts)
  }

  return (
    <div className="min-h-screen bg-background-secondary p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-label-primary">
              Program Gărzi
            </h1>
            <p className="text-label-secondary mt-1">
              Gestionează programul gărzilor
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => router.push('/admin/dashboard')}>
              Înapoi
            </Button>
            <Button onClick={handleGenerateSchedule}>
              Generează Program
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-3">
            <Card className="p-6">
              {/* Month Navigation */}
              <div className="flex justify-between items-center mb-6">
                <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
                  ◀
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => {
                    setViewMonth(currentDate.getMonth())
                    setViewYear(currentDate.getFullYear())
                  }}>
                    Azi
                  </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={handleNextMonth}>
                  ▶
                </Button>
              </div>

              <Calendar
                year={viewYear}
                month={viewMonth}
                shifts={shifts}
                onDayClick={handleDayClick}
              />
            </Card>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Statistici Lunare</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-label-secondary">Total gărzi:</span>
                  <span className="font-medium">{new Date(viewYear, viewMonth + 1, 0).getDate()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-label-secondary">Atribuite:</span>
                  <span className="font-medium text-system-green">{Object.keys(shifts).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-label-secondary">Libere:</span>
                  <span className="font-medium text-system-orange">
                    {new Date(viewYear, viewMonth + 1, 0).getDate() - Object.keys(shifts).length}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Top Doctori</h3>
              <div className="space-y-2">
                {doctors.slice(0, 3).map(doctor => (
                  <div key={doctor.id} className="flex justify-between text-sm">
                    <span className="text-label-secondary truncate">{doctor.name}</span>
                    <span className="font-medium">{doctor.shiftsThisMonth}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      <AssignShiftModal
        isOpen={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        date={selectedDate || ''}
        doctors={doctors.map(d => ({
          ...d,
          isAvailable: d.isAvailable && !d.unavailableDates.includes(selectedDate || '')
        }))}
        onAssign={handleAssignDoctor}
      />
    </div>
  )
}