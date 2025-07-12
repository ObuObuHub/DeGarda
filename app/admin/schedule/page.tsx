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
import { useHospital } from '@/contexts/HospitalContext'
import { useData } from '@/contexts/DataContext'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { exportScheduleToExcel } from '@/lib/exportUtils'
import { showToast } from '@/components/Toast'


export default function SchedulePage() {
  const router = useRouter()
  const { selectedHospitalId, selectedHospital } = useHospital()
  const { 
    shifts, 
    staff, 
    isLoading, 
    loadShifts, 
    updateShift,
    addNotification 
  } = useData()
  
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [swapModalData, setSwapModalData] = useState<{ date: string; shift: any } | null>(null)
  const [showOptionsModal, setShowOptionsModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)

  const currentDate = new Date()
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth())
  const [viewYear, setViewYear] = useState(currentDate.getFullYear())

  // Use real-time sync
  const { syncData, lastSync } = useRealtimeSync({
    hospitalId: selectedHospitalId,
    year: viewYear,
    month: viewMonth
  })

  // Convert staff to calendar format - filtered by hospital
  const doctors = staff
    .filter(s => s.role === 'staff' && s.hospitalId === parseInt(selectedHospitalId || '0'))
    .map(s => ({
      id: s.id.toString(),
      name: s.name,
      shiftsThisMonth: 0,
      weekendShifts: 0,
      isAvailable: true,
      unavailableDates: [] as string[]
    }))

  // Load shifts when month/year/hospital changes
  useEffect(() => {
    if (selectedHospitalId) {
      loadShifts(viewYear, viewMonth, selectedHospitalId)
    }
  }, [viewYear, viewMonth, selectedHospitalId, loadShifts])

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
        showToast('success', 'Cerere trimisă', 'Cererea de schimb a fost trimisă cu succes!')
      }
    } catch (error) {
      console.error('Failed to submit swap request:', error)
    }
    
    setSwapModalData(null)
  }

  const handleAssignDoctor = async (doctorId: string) => {
    if (!selectedDate || !selectedHospitalId) return
    
    try {
      await updateShift(selectedDate, doctorId, selectedHospitalId, '24h')
      setShowAssignModal(false)
      setShowOptionsModal(false)
      // Sync data to get latest updates
      syncData()
    } catch (error: any) {
      // Error is already shown by updateShift
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
    // Convert shifts to the format expected by exportScheduleToExcel
    const formattedShifts: Record<string, any> = {}
    Object.entries(shifts).forEach(([date, shift]) => {
      formattedShifts[date] = {
        date: shift.date || date,
        doctorId: shift.doctorId || null,
        doctorName: shift.doctorName || null,
        type: shift.type || '24h',
        status: shift.status || 'open'
      }
    })
    exportScheduleToExcel(formattedShifts, viewMonth, viewYear, selectedHospital?.name || 'Hospital')
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
        syncData()
        showToast('success', 'Gardă rezervată', 'Garda a fost rezervată cu succes!')
      } else {
        const data = await response.json()
        showToast('error', 'Eroare', data.error || 'Eroare la rezervare')
      }
    } catch (error) {
      console.error('Failed to reserve shift:', error)
      showToast('error', 'Eroare', 'Eroare la rezervare')
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
        
        // Sync data to get the latest shifts
        await syncData()
        
        // Show message if there were conflicts
        if (data.conflicts && data.conflicts.length > 0) {
          showToast('info', 'Program generat', data.message)
        } else {
          showToast('success', 'Program generat', 'Programul a fost generat cu succes!')
        }
      }
    } catch (error) {
      console.error('Failed to generate schedule:', error)
    }
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-label-primary">
              Program Gărzi
            </h1>
            <p className="text-label-secondary text-sm mt-1">
              {selectedHospital?.name || 'Gestionează programul gărzilor'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              onClick={handleExportExcel} 
              icon="download"
              size="sm"
              className="text-sm"
            >
              <span className="hidden sm:inline">Export Excel</span>
              <span className="sm:hidden">Export</span>
            </Button>
            <Button 
              onClick={handleGenerateSchedule} 
              icon="sparkles"
              size="sm"
              className="text-sm"
            >
              <span className="hidden sm:inline">Generează Program</span>
              <span className="sm:hidden">Generează</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-3">
            <Card className="p-6">
              {/* Month Navigation */}
              <div className="flex justify-between items-center mb-6">
                <Button variant="ghost" size="sm" onClick={handlePrevMonth} icon="chevronLeft">
                  {/* Empty children for icon-only button */}
                  <span className="sr-only">Luna anterioară</span>
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => {
                    setViewMonth(currentDate.getMonth())
                    setViewYear(currentDate.getFullYear())
                  }}>
                    Azi
                  </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={handleNextMonth} icon="chevronRight">
                  {/* Empty children for icon-only button */}
                  <span className="sr-only">Luna următoare</span>
                </Button>
              </div>

              {isLoading ? (
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
                  Actualizat: {lastSync.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
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