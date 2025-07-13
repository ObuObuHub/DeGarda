'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Calendar } from '@/components/Calendar'
import { AssignShiftModal } from '@/components/AssignShiftModal'
import { SwapRequestModal } from '@/components/SwapRequestModal'
import { ShiftOptionsModal } from '@/components/ShiftOptionsModal'
import { generateDepartmentSchedule, VALID_DEPARTMENTS, normalizeDepartment } from '@/lib/shiftGeneratorV2'
import { assignDepartmentsToDoctors } from '@/lib/assignDepartments'
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
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [pendingShiftDepartment, setPendingShiftDepartment] = useState<string | null>(null)

  const currentDate = new Date()
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth())
  const [viewYear, setViewYear] = useState(currentDate.getFullYear())

  // Use real-time sync
  const { syncData, lastSync } = useRealtimeSync({
    hospitalId: selectedHospitalId || undefined,
    year: viewYear,
    month: viewMonth
  })

  // Convert staff to calendar format - filtered by hospital
  const doctors = staff
    .filter(s => s.role === 'staff' && s.hospitalId?.toString() === selectedHospitalId)
    .map(s => ({
      id: s.id.toString(),
      name: s.name,
      department: s.specialization, // specialization now holds department
      shiftsThisMonth: 0,
      weekendShifts: 0,
      isAvailable: true,
      unavailableDates: [] as string[]
    }))

  // Filter shifts by department
  const filteredShifts = useMemo(() => {
    if (selectedDepartment === 'all') return shifts
    
    const filtered: Record<string, any> = {}
    Object.entries(shifts).forEach(([date, shift]) => {
      // Find the doctor's department
      const doctor = doctors.find(d => d.id === shift.doctorId?.toString())
      if (doctor && doctor.department === selectedDepartment) {
        filtered[date] = shift
      }
    })
    return filtered
  }, [shifts, selectedDepartment, doctors])

  // Load shifts when month/year/hospital changes
  useEffect(() => {
    if (selectedHospitalId) {
      loadShifts(viewYear, viewMonth, selectedHospitalId)
    }
  }, [viewYear, viewMonth, selectedHospitalId, loadShifts])

  const handleDayClick = (date: string) => {
    setSelectedDate(date)
    const shift = shifts[date]
    
    // Don't allow shift creation when viewing all departments
    if (selectedDepartment === 'all') {
      return
    }
    
    if (!shift || shift.status === 'open') {
      // We have a specific department selected, use it
      setPendingShiftDepartment(selectedDepartment)
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
      // Get the doctor's department
      const doctor = doctors.find(d => d.id === doctorId)
      const department = doctor?.department || pendingShiftDepartment || 
                        (selectedDepartment !== 'all' ? selectedDepartment : undefined)
      
      await updateShift(selectedDate, doctorId, selectedHospitalId, '24h', department)
      setShowAssignModal(false)
      setShowOptionsModal(false)
      setPendingShiftDepartment(null)
      // Sync data to get latest updates
      syncData()
    } catch (error) {
      // Error is already shown by updateShift
    }
    setShowAssignModal(false)
    setSelectedDate(null)
  }

  const handleDeleteShift = async () => {
    if (!selectedDate || !shifts[selectedDate]?.id) return
    
    try {
      const response = await fetch(`/api/shifts?id=${shifts[selectedDate].id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Refresh shifts
        await syncData()
        showToast('success', 'Succes', 'Garda a fost ștearsă!')
      } else {
        const data = await response.json()
        showToast('error', 'Eroare', data.error || 'Eroare la ștergere')
      }
    } catch (error) {
      console.error('Failed to delete shift:', error)
      showToast('error', 'Eroare', 'Eroare la ștergere')
    }
    
    setShowOptionsModal(false)
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
      // TODO: Get current staff ID from auth context
      const currentStaffId = '1'
      
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

  const handleClearSchedule = async () => {
    if (!selectedHospitalId) {
      showToast('error', 'Eroare', 'Selectați un spital')
      return
    }

    // Confirm action
    if (!confirm('Sigur doriți să ștergeți toate gărzile pentru luna aceasta?')) {
      return
    }

    try {
      const response = await fetch(`/api/shifts/clear?year=${viewYear}&month=${viewMonth}&hospitalId=${selectedHospitalId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Refresh shifts
        await syncData()
        showToast('success', 'Succes', 'Toate gărzile au fost șterse!')
      } else {
        const data = await response.json()
        showToast('error', 'Eroare', data.error || 'Eroare la ștergere')
      }
    } catch (error) {
      console.error('Failed to clear schedule:', error)
      showToast('error', 'Eroare', 'Eroare la ștergere')
    }
  }

  const handleGenerateSchedule = async () => {
    if (!selectedHospitalId) {
      showToast('error', 'Eroare', 'Selectați un spital')
      return
    }
    
    if (selectedDepartment === 'all') {
      showToast('error', 'Eroare', 'Selectați un departament specific pentru generare')
      return
    }

    // Filter only available doctors for the selected department
    const departmentDoctors = doctors
      .filter(d => d.isAvailable && d.department === selectedDepartment)
    
    console.log(`Generating for department: ${selectedDepartment}`)
    console.log(`Available doctors in ${selectedDepartment}:`, departmentDoctors.length)
    
    if (departmentDoctors.length === 0) {
      showToast('error', 'Eroare', `Nu există personal disponibil în departamentul ${selectedDepartment}`)
      return
    }
    
    // Filter existing shifts for this department only
    const departmentShifts: Record<string, any> = {}
    Object.entries(shifts).forEach(([date, shift]) => {
      if (shift.department === selectedDepartment) {
        departmentShifts[date] = shift
      }
    })
    
    console.log(`Existing shifts for ${selectedDepartment}:`, Object.keys(departmentShifts).length)
    
    // Generate schedule for the selected department only
    const { shifts: generatedShifts, stats } = generateDepartmentSchedule(
      viewYear,
      viewMonth,
      departmentDoctors,
      selectedDepartment,
      departmentShifts
    )
    
    if (generatedShifts.length === 0) {
      showToast('info', 'Info', `Nu s-au generat gărzi noi pentru ${selectedDepartment} - luna este deja completă`)
      return
    }
    
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
        console.log('Generation response:', data)
        
        // Sync data to get the latest shifts
        await syncData()
        
        // Show detailed generation statistics
        let message = `Generat ${generatedShifts.length} gărzi pentru ${selectedDepartment}`
        if (stats.unassignedDates.length > 0) {
          message += `. ${stats.unassignedDates.length} zile fără personal disponibil`
        }
        
        // Show message if there were conflicts
        if (data.conflicts && data.conflicts.length > 0) {
          console.log('Conflicts found:', data.conflicts)
          showToast('warning', 'Program generat cu conflicte', `${data.message}. Verificați consolă pentru detalii.`)
        } else {
          showToast('success', 'Program generat', `Salvat ${data.shifts?.length || 0} din ${generatedShifts.length} gărzi`)
        }
        
        // Log detailed stats for debugging
        console.log(`Generation statistics for ${selectedDepartment}:`, {
          totalGenerated: stats.totalShiftsGenerated,
          unassignedDates: stats.unassignedDates
        })
      } else {
        const errorData = await response.json()
        showToast('error', 'Eroare', errorData.error || 'Eroare la generarea programului')
      }
    } catch (error) {
      console.error('Failed to generate schedule:', error)
      showToast('error', 'Eroare', 'Eroare la generarea programului')
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
            <select
              className="px-3 py-2 bg-background-secondary border border-transparent rounded-ios text-sm"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
            >
              <option value="all">Toate departamentele</option>
              <option value="ATI">ATI</option>
              <option value="Urgențe">Urgențe</option>
              <option value="Laborator">Laborator</option>
              <option value="Medicină Internă">Medicină Internă</option>
              <option value="Chirurgie">Chirurgie</option>
            </select>
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
            {selectedDepartment !== 'all' && (
              <Button 
                onClick={handleGenerateSchedule} 
                icon="sparkles"
                size="sm"
                className="text-sm"
              >
                <span className="hidden sm:inline">Generează Program</span>
                <span className="sm:hidden">Generează</span>
              </Button>
            )}
            <Button 
              onClick={handleClearSchedule} 
              variant="danger"
              icon="trash"
              size="sm"
              className="text-sm"
            >
              <span className="hidden sm:inline">Șterge</span>
              <span className="sm:hidden">Șterge</span>
            </Button>
          </div>
        </div>

        {/* Calendar */}
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
                  shifts={filteredShifts}
                  onDayClick={handleDayClick}
                  onSwapRequest={handleSwapRequest}
                  doctors={doctors}
                />
              )}
        </Card>
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
        onDelete={handleDeleteShift}
        hasShift={selectedDate ? !!shifts[selectedDate]?.doctorId : false}
      />


      <AssignShiftModal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false)
          setSelectedDate(null)
          setPendingShiftDepartment(null)
        }}
        date={selectedDate || ''}
        doctors={doctors.map(d => ({
          ...d,
          isAvailable: d.isAvailable && !d.unavailableDates.includes(selectedDate || '')
        }))}
        onAssign={handleAssignDoctor}
        selectedDepartment={pendingShiftDepartment || (selectedDepartment === 'all' ? undefined : selectedDepartment)}
        shiftDepartment={selectedDate && shifts[selectedDate]?.department}
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