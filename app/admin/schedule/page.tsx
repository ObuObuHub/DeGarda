'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Calendar } from '@/components/Calendar'
import { AssignShiftModal } from '@/components/AssignShiftModal'
import { SwapRequestModal } from '@/components/SwapRequestModal'
import { ShiftOptionsModal } from '@/components/ShiftOptionsModal'
import { generateMonthlySchedule } from '@/lib/shiftGenerator'
import { staff } from '@/lib/data'
import { HospitalSelector } from '@/components/HospitalSelector'
import { useHospital } from '@/contexts/HospitalContext'
import { exportScheduleToExcel } from '@/lib/exportUtils'
import { usePolling } from '@/hooks/usePolling'


export default function SchedulePage() {
  const router = useRouter()
  const { selectedHospitalId, selectedHospital } = useHospital()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [shifts, setShifts] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [swapModalData, setSwapModalData] = useState<{ date: string; shift: any } | null>(null)
  const [showOptionsModal, setShowOptionsModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)

  const currentDate = new Date()
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth())
  const [viewYear, setViewYear] = useState(currentDate.getFullYear())

  // Convert staff to calendar format - filtered by hospital
  const doctors = staff
    .filter(s => s.role === 'staff' && s.hospitalId === selectedHospitalId)
    .map(s => ({
      id: s.id,
      name: s.name,
      shiftsThisMonth: 0,
      weekendShifts: 0,
      isAvailable: true,
      unavailableDates: [] as string[]
    }))

  const fetchShifts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/shifts?year=${viewYear}&month=${viewMonth}&hospitalId=${selectedHospitalId}`)
      const data = await response.json()
      
      if (data.success) {
        setShifts(data.shifts)
      }
    } catch (error) {
      console.error('Failed to fetch shifts:', error)
    } finally {
      setLoading(false)
    }
  }

  // Use polling hook for auto-refresh
  const { lastUpdate } = usePolling(
    fetchShifts,
    [viewMonth, viewYear, selectedHospitalId],
    { interval: 30000, enabled: true }
  )

  const handleDayClick = (date: string) => {
    setSelectedDate(date)
    const shift = shifts[date]
    if (!shift || shift.status === 'open') {
      setShowOptionsModal(true)
    }
  }

  const handleSwapRequest = (date: string, shift: any) => {
    setSwapModalData({ date, shift: { ...shift, shiftId: shift.id } })
  }

  const submitSwapRequest = async (toStaffId: string | null, reason: string) => {
    if (!swapModalData) return

    try {
      const response = await fetch('/api/swaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromStaffId: swapModalData.shift.doctorId,
          toStaffId,
          shiftId: swapModalData.shift.id,
          reason
        })
      })

      if (response.ok) {
        // Show success message or refresh
        alert('Cerere de schimb trimisă cu succes!')
      }
    } catch (error) {
      console.error('Failed to submit swap request:', error)
    }
    
    setSwapModalData(null)
  }

  const handleAssignDoctor = async (doctorId: string) => {
    if (!selectedDate) return
    
    const doctor = doctors.find(d => d.id === doctorId)
    if (doctor) {
      try {
        const response = await fetch('/api/shifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: selectedDate,
            staffId: doctorId,
            hospitalId: selectedHospitalId,
            type: '24h'
          })
        })

        if (response.ok) {
          // Update local state
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
        } else {
          const data = await response.json()
          alert(data.error || 'Eroare la atribuire')
        }
      } catch (error) {
        console.error('Failed to assign shift:', error)
      }
    }
    setShowAssignModal(false)
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

  const handleExportExcel = () => {
    exportScheduleToExcel(shifts, viewMonth, viewYear, selectedHospital?.name || 'Hospital')
  }

  const handleReserveShift = async () => {
    if (!selectedDate) return
    
    try {
      // For now, using a hardcoded staff ID - in real app, get from auth context
      const currentStaffId = '1' // This should come from auth
      
      const response = await fetch(`/api/shifts/${shifts[selectedDate]?.id || 'new'}/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: currentStaffId,
          date: selectedDate,
          hospitalId: selectedHospitalId,
          type: '24h'
        })
      })

      if (response.ok) {
        // Refresh shifts
        fetchShifts()
        alert('Gardă rezervată cu succes!')
      } else {
        const data = await response.json()
        alert(data.error || 'Eroare la rezervare')
      }
    } catch (error) {
      console.error('Failed to reserve shift:', error)
      alert('Eroare la rezervare')
    }
    
    setShowOptionsModal(false)
    setSelectedDate(null)
  }

  const handleGenerateSchedule = async () => {
    // Filter only available doctors
    const availableDoctors = doctors.filter(d => d.isAvailable)
    
    // Generate schedule for current month
    const generatedShifts = generateMonthlySchedule(
      viewYear,
      viewMonth,
      availableDoctors,
      shifts
    )
    
    try {
      // Save all generated shifts to database
      const response = await fetch('/api/shifts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shifts: generatedShifts,
          hospitalId: selectedHospitalId
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Convert to shift records for local state
        const newShifts = { ...shifts }
        generatedShifts.forEach(shift => {
          // Only add if no conflict
          const hasConflict = data.conflicts?.some((c: any) => c.date === shift.date)
          if (!hasConflict) {
            newShifts[shift.date] = {
              id: Date.now().toString() + Math.random(),
              doctorId: shift.doctorId,
              doctorName: shift.doctorName,
              type: shift.type,
              status: 'assigned'
            }
          }
        })
        
        setShifts(newShifts)
        
        // Show message if there were conflicts
        if (data.conflicts && data.conflicts.length > 0) {
          alert(data.message)
        }
      }
    } catch (error) {
      console.error('Failed to generate schedule:', error)
    }
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
              {selectedHospital?.name || 'Gestionează programul gărzilor'}
            </p>
          </div>
          <div className="flex gap-2">
            <HospitalSelector />
            <Button variant="ghost" onClick={() => router.push('/admin/dashboard')}>
              Înapoi
            </Button>
            <Button variant="secondary" onClick={handleExportExcel}>
              📊 Export Excel
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

              {loading ? (
                <div className="text-center py-8 text-label-tertiary">
                  Se încarcă programul...
                </div>
              ) : (
                <Calendar
                  year={viewYear}
                  month={viewMonth}
                  shifts={shifts}
                  onDayClick={handleDayClick}
                  onSwapRequest={handleSwapRequest}
                />
              )}
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
              <div className="mt-3 pt-3 border-t border-separator">
                <p className="text-xs text-label-tertiary">
                  Actualizat: {lastUpdate.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                </p>
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

      <ShiftOptionsModal
        isOpen={showOptionsModal}
        onClose={() => {
          setShowOptionsModal(false)
          setSelectedDate(null)
        }}
        date={selectedDate || ''}
        onAssign={() => {
          setShowOptionsModal(false)
          setShowAssignModal(true)
        }}
        onReserve={handleReserveShift}
      />

      <AssignShiftModal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false)
          setSelectedDate(null)
        }}
        date={selectedDate || ''}
        doctors={doctors.map(d => ({
          ...d,
          isAvailable: d.isAvailable && !d.unavailableDates.includes(selectedDate || '')
        }))}
        onAssign={handleAssignDoctor}
      />

      {swapModalData && (
        <SwapRequestModal
          isOpen={!!swapModalData}
          onClose={() => setSwapModalData(null)}
          shift={{
            date: swapModalData.date,
            doctorId: swapModalData.shift.doctorId,
            doctorName: swapModalData.shift.doctorName,
            shiftId: swapModalData.shift.id
          }}
          onSubmit={submitSwapRequest}
        />
      )}
    </div>
  )
}