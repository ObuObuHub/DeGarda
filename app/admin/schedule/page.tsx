'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Calendar } from '@/components/Calendar'
import { AssignShiftModal } from '@/components/AssignShiftModal'
import { SwapRequestModal } from '@/components/SwapRequestModal'
import { ShiftOptionsModal } from '@/components/ShiftOptionsModal'
import { getClientUserRole } from '@/lib/clientAuth'
import { 
  generateDepartmentSchedule, 
  VALID_DEPARTMENTS, 
  normalizeDepartment,
  ValidDepartment 
} from '@/lib/shiftGenerator'
import { logger } from '@/lib/logger'
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
  
  // Swap management state
  const [activeTab, setActiveTab] = useState<'schedule' | 'swaps'>('schedule')
  const [swapTab, setSwapTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [swaps, setSwaps] = useState<any[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)

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
      // Check the shift's department field directly
      if (shift.department === selectedDepartment) {
        filtered[date] = shift
      }
    })
    return filtered
  }, [shifts, selectedDepartment])

  // Load shifts when month/year/hospital changes
  useEffect(() => {
    if (selectedHospitalId) {
      logger.debug('Schedule', 'Loading shifts', { viewYear, viewMonth, hospitalId: selectedHospitalId })
      loadShifts(viewYear, viewMonth, selectedHospitalId).then(() => {
        logger.debug('Schedule', 'Shifts loaded', { 
          shiftsCount: Object.keys(shifts).length,
          filteredCount: Object.keys(filteredShifts).length,
          department: selectedDepartment
        })
      })
    }
  }, [viewYear, viewMonth, selectedHospitalId, loadShifts])

  // Load user role and handle URL tab parameter
  useEffect(() => {
    const role = getClientUserRole()
    setUserRole(role)
    
    // Check for tab parameter in URL
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get('tab')
    if (tabParam === 'swaps' && role === 'manager') {
      setActiveTab('swaps')
    }
  }, [])

  // Load swaps when needed
  useEffect(() => {
    if (selectedHospitalId && activeTab === 'swaps' && userRole === 'manager') {
      loadSwaps()
    }
  }, [selectedHospitalId, activeTab, swapTab, userRole])

  const loadSwaps = async () => {
    if (!selectedHospitalId) return
    
    try {
      const response = await fetch(`/api/swaps?status=${swapTab}&hospitalId=${selectedHospitalId}`)
      const data = await response.json()
      
      if (data.success) {
        setSwaps(data.swaps || [])
      }
    } catch (error) {
      logger.error('Schedule', 'Failed to load swaps', error)
    }
  }

  const handleSwapAction = async (swapId: string, action: 'approved' | 'rejected') => {
    // Verify manager role
    if (userRole !== 'manager') {
      showToast('error', 'Acces refuzat', 'Doar managerii pot aproba schimburile')
      return
    }

    try {
      // Get current user ID from token for audit trail
      const token = localStorage.getItem('authToken')
      let reviewedBy = null
      if (token) {
        try {
          const decoded = JSON.parse(atob(token.split('.')[1]))
          reviewedBy = decoded.userId
        } catch (e) {
          console.warn('Could not decode token for reviewer ID')
        }
      }

      const response = await fetch(`/api/swaps/${swapId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: action,
          reviewedBy: reviewedBy
        })
      })

      if (response.ok) {
        const actionText = action === 'approved' ? 'aprobată' : 'respinsă'
        showToast('success', 'Succes', `Cererea de schimb a fost ${actionText}`)
        loadSwaps()
        
        // Log the action
        logger.info('Schedule', 'Swap request processed', {
          swapId,
          action,
          reviewedBy,
          hospitalId: selectedHospitalId
        })
      } else {
        const data = await response.json()
        showToast('error', 'Eroare', data.error || `Nu s-a putut ${action === 'approved' ? 'aproba' : 'respinge'} cererea`)
      }
    } catch (error) {
      logger.error('Schedule', 'Failed to update swap', error, { 
        swapId, 
        action, 
        hospitalId: selectedHospitalId 
      })
      showToast('error', 'Eroare', 'Nu s-a putut procesa cererea de schimb')
    }
  }

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
      logger.error('Schedule', 'Failed to submit swap request', error, { hospitalId: selectedHospitalId })
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
      logger.error('Schedule', 'Failed to delete shift', error, { hospitalId: selectedHospitalId })
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
      logger.error('Schedule', 'Failed to reserve shift', error, { hospitalId: selectedHospitalId })
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
      logger.error('Schedule', 'Failed to clear schedule', error, { hospitalId: selectedHospitalId })
      showToast('error', 'Eroare', 'Eroare la ștergere')
    }
  }

  const handleGenerateSchedule = async () => {
    console.log('🚀 GENERATE BUTTON CLICKED!', {
      selectedHospitalId,
      selectedDepartment, 
      selectedHospital: selectedHospital?.name,
      staffCount: staff.length
    })
    
    logger.debug('Schedule', 'Generate button clicked', {
      selectedHospitalId,
      selectedDepartment,
      selectedHospital: selectedHospital?.name,
      staffCount: staff.length
    })
    
    if (!selectedHospitalId) {
      logger.warn('Schedule', 'Hospital not selected', { selectedHospitalId })
      showToast('error', 'Eroare', 'Selectați un spital')
      return
    }
    
    if (selectedDepartment === 'all') {
      logger.warn('Schedule', 'Department not selected', { selectedDepartment })
      showToast('error', 'Eroare', 'Selectați un departament specific pentru generare')
      return
    }

    // Filter only available doctors for the selected department
    const departmentDoctors = doctors
      .filter(d => d.isAvailable && d.department === selectedDepartment)
    
    logger.debug('Schedule', 'Doctor filtering results', {
      totalDoctors: doctors.length,
      selectedDepartment,
      departmentDoctors: departmentDoctors.length,
      doctorDepartments: doctors.map(d => ({ name: d.name, dept: d.department, available: d.isAvailable })),
      availableDoctorsInDept: departmentDoctors.map(d => ({ name: d.name, dept: d.department }))
    })
    
    logger.shiftGeneration('Starting generation', { 
      department: selectedDepartment,
      availableDoctors: departmentDoctors.length
    }, { hospitalId: selectedHospitalId })
    
    if (departmentDoctors.length === 0) {
      logger.error('Schedule', 'No doctors available for department', {
        selectedDepartment,
        totalDoctors: doctors.length,
        availableDoctors: doctors.filter(d => d.isAvailable).length,
        doctorDepartments: doctors.map(d => d.department)
      })
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
    
    logger.shiftGeneration('Existing shifts found', {
      department: selectedDepartment,
      existingShiftsCount: Object.keys(departmentShifts).length
    }, { hospitalId: selectedHospitalId })
    
    // Generate schedule for the selected department only with hospital config
    let generatedShifts, stats
    try {
      logger.debug('Schedule', 'Calling generateDepartmentSchedule', {
        viewYear,
        viewMonth,
        departmentDoctors: departmentDoctors.length,
        selectedDepartment,
        hospitalName: selectedHospital?.name || '',
        departmentShifts: Object.keys(departmentShifts).length
      })
      
      const result = generateDepartmentSchedule(
        viewYear,
        viewMonth,
        departmentDoctors,
        selectedDepartment as ValidDepartment,
        selectedHospital?.name || '',
        departmentShifts
      )
      
      generatedShifts = result.shifts
      stats = result.stats
      
      logger.debug('Schedule', 'Generation completed', {
        generatedCount: generatedShifts.length,
        unassignedDates: stats.unassignedDates.length
      })
    } catch (error) {
      logger.error('Schedule', 'Shift generation failed', error, { hospitalId: selectedHospitalId })
      showToast('error', 'Eroare', `Eroare la generarea programului: ${error instanceof Error ? error.message : 'Eroare necunoscută'}`)
      return
    }
    
    if (generatedShifts.length === 0) {
      showToast('info', 'Info', `Nu s-au generat gărzi noi pentru ${selectedDepartment} - luna este deja completă`)
      return
    }
    
    try {
      logger.debug('Schedule', 'Sending shifts to API', {
        shiftsCount: generatedShifts.length,
        hospitalId: selectedHospitalId,
        sampleShift: generatedShifts[0]
      })
      
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
        logger.shiftGeneration('Generation completed', data, { hospitalId: selectedHospitalId })
        
        // Sync data to get the latest shifts
        await syncData()
        
        // Show detailed generation statistics
        let message = `Generat ${generatedShifts.length} gărzi pentru ${selectedDepartment}`
        if (stats.unassignedDates.length > 0) {
          message += `. ${stats.unassignedDates.length} zile fără personal disponibil`
        }
        
        // Show message if there were conflicts
        if (data.conflicts && data.conflicts.length > 0) {
          logger.warn('Schedule', 'Generation conflicts found', data.conflicts, { hospitalId: selectedHospitalId })
          showToast('warning', 'Program generat cu conflicte', `${data.message}. Verificați log-urile pentru detalii.`)
        } else {
          showToast('success', 'Program generat', `Salvat ${data.shifts?.length || 0} din ${generatedShifts.length} gărzi`)
        }
        
        // Log detailed stats
        logger.shiftGeneration('Generation statistics', {
          department: selectedDepartment,
          totalGenerated: stats.totalShiftsGenerated,
          unassignedDates: stats.unassignedDates
        }, { hospitalId: selectedHospitalId })
      } else {
        const errorData = await response.json()
        logger.error('Schedule', 'API returned error', {
          status: response.status,
          statusText: response.statusText,
          errorData
        }, { hospitalId: selectedHospitalId })
        showToast('error', 'Eroare', errorData.error || 'Eroare la generarea programului')
      }
    } catch (error) {
      logger.error('Schedule', 'Failed to generate schedule', error, { hospitalId: selectedHospitalId })
      showToast('error', 'Eroare', 'Eroare la generarea programului')
    }
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-label-primary">
              Program Gărzi & Schimburi
            </h1>
            <p className="text-label-secondary text-sm mt-1">
              {selectedHospital?.name || 'Gestionează programul gărzilor și schimburile'}
            </p>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex border-b border-separator">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'schedule'
                  ? 'text-system-blue border-b-2 border-system-blue'
                  : 'text-label-secondary hover:text-label-primary'
              }`}
            >
              Calendar
            </button>
            {userRole === 'manager' && (
              <button
                onClick={() => setActiveTab('swaps')}
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === 'swaps'
                    ? 'text-system-blue border-b-2 border-system-blue'
                    : 'text-label-secondary hover:text-label-primary'
                }`}
              >
                Schimburi
              </button>
            )}
          </div>
        </div>
        {/* Schedule Tab Content */}
        {activeTab === 'schedule' && (
          <>
            <div className="flex gap-2 mb-4">
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
          </>
        )}

        {/* Swap Management Tab (Manager Only) */}
        {activeTab === 'swaps' && userRole === 'manager' && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-label-primary">
                Cereri de Schimb
              </h2>
              
              {/* Swap Status Tabs */}
              <div className="flex border-b border-separator">
                <button
                  onClick={() => setSwapTab('pending')}
                  className={`px-4 py-2 font-medium text-sm ${
                    swapTab === 'pending'
                      ? 'text-system-blue border-b-2 border-system-blue'
                      : 'text-label-secondary hover:text-label-primary'
                  }`}
                >
                  În Așteptare
                </button>
                <button
                  onClick={() => setSwapTab('approved')}
                  className={`px-4 py-2 font-medium text-sm ${
                    swapTab === 'approved'
                      ? 'text-system-blue border-b-2 border-system-blue'
                      : 'text-label-secondary hover:text-label-primary'
                  }`}
                >
                  Aprobate
                </button>
                <button
                  onClick={() => setSwapTab('rejected')}
                  className={`px-4 py-2 font-medium text-sm ${
                    swapTab === 'rejected'
                      ? 'text-system-blue border-b-2 border-system-blue'
                      : 'text-label-secondary hover:text-label-primary'
                  }`}
                >
                  Respinse
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-label-tertiary">
                Se încarcă schimburile...
              </div>
            ) : swaps.length === 0 ? (
              <div className="text-center py-8 text-label-tertiary">
                Nu există cereri de schimb {swapTab === 'pending' ? 'în așteptare' : swapTab === 'approved' ? 'aprobate' : 'respinse'}
              </div>
            ) : (
              <div className="space-y-4">
                {swaps.map((swap) => (
                  <div key={swap.id} className="border border-separator rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-label-primary">
                            {swap.fromStaffName} → {swap.toStaffName || 'Disponibil'}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded ${
                            swap.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            swap.status === 'approved' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {swap.status === 'pending' ? 'În așteptare' : 
                             swap.status === 'approved' ? 'Aprobat' : 'Respins'}
                          </span>
                        </div>
                        
                        <div className="text-sm text-label-secondary mb-2">
                          <strong>Data:</strong> {new Date(swap.shiftDate).toLocaleDateString('ro-RO')}
                        </div>
                        
                        {swap.reason && (
                          <div className="text-sm text-label-secondary mb-2">
                            <strong>Motiv:</strong> {swap.reason}
                          </div>
                        )}
                        
                        <div className="text-xs text-label-tertiary">
                          Creat: {new Date(swap.createdAt).toLocaleDateString('ro-RO')}
                        </div>
                      </div>
                      
                      {swap.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleSwapAction(swap.id, 'approved')}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Aprobare
                          </Button>
                          <Button
                            onClick={() => handleSwapAction(swap.id, 'rejected')}
                            size="sm"
                            variant="danger"
                          >
                            Respinge
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

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
    </div>
  )
}