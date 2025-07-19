'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ScheduleView } from '@/components/schedule/ScheduleView'
import { SwapManagement } from '@/components/schedule/SwapManagement'
import { AssignShiftModal } from '@/components/AssignShiftModal'
import { SwapRequestModal } from '@/components/SwapRequestModal'
import { ShiftOptionsModal } from '@/components/ShiftOptionsModal'
import { getClientUserRole } from '@/lib/clientAuth'
import { useShifts } from '@/contexts/ShiftsContext'
import { useStaff } from '@/contexts/StaffContext'
import { useNotifications } from '@/contexts/NotificationsContext'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { exportScheduleToExcel } from '@/lib/exportUtils'
import { showToast } from '@/components/Toast'
import { logger } from '@/lib/logger'

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

interface SwapModalData {
  date: string
  shift: Shift
}

function SchedulePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'schedule' | 'swaps'>('schedule')
  
  // Calendar state
  const currentDate = new Date()
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth())
  const [viewYear, setViewYear] = useState(currentDate.getFullYear())
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  
  // Modal state
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showOptionsModal, setShowOptionsModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [swapModalData, setSwapModalData] = useState<SwapModalData | null>(null)
  const [pendingShiftDepartment, setPendingShiftDepartment] = useState<string | null>(null)

  const selectedHospitalId = user?.hospitalId?.toString() || ''
  
  // Use the new focused contexts
  const { shifts, isLoading: shiftsLoading, loadShifts, updateShift } = useShifts()
  const { staff, isLoading: staffLoading, loadStaff } = useStaff()
  const { addNotification } = useNotifications()
  
  const isLoading = shiftsLoading || staffLoading

  // Real-time sync
  const { syncData, lastSync } = useRealtimeSync({
    hospitalId: selectedHospitalId || undefined,
    year: viewYear,
    month: viewMonth
  })

  useEffect(() => {
    const initializePage = async () => {
      const role = await getClientUserRole()
      if (!role) {
        router.push('/login')
        return
      }
      setUserRole(role)
      
      // Check URL params for tab selection
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab')
      if (tabParam === 'swaps' && role === 'manager') {
        setActiveTab('swaps')
      }
    }
    
    initializePage()
  }, [router])

  useEffect(() => {
    if (selectedHospitalId) {
      loadShifts(viewYear, viewMonth, selectedHospitalId)
      loadStaff(selectedHospitalId)
    }
  }, [viewYear, viewMonth, selectedHospitalId, loadShifts, loadStaff])

  // Calendar navigation
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

  // Shift management
  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    setPendingShiftDepartment(selectedDepartment)
    setShowOptionsModal(true)
  }

  const handleSwapRequest = (date: string, shift: Shift) => {
    setSwapModalData({ date, shift })
  }

  const submitSwapRequest = async (toStaffId: string | null, reason: string) => {
    if (!swapModalData) return

    try {
      const response = await fetch('/api/swaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fromStaffId: swapModalData.shift.doctorId,
          toStaffId,
          shiftId: swapModalData.shift.id,
          reason
        })
      })

      const data = await response.json()
      if (data.success) {
        showToast('success', 'Cerere de schimb trimisă cu succes!')
        addNotification?.(`Cerere de schimb pentru ${swapModalData.date}`, 'info')
      } else {
        showToast('error', data.error || 'Eroare la trimiterea cererii')
      }
    } catch (error) {
      logger.error('SchedulePage', 'Failed to submit swap request', error)
      showToast('error', 'Eroare la trimiterea cererii')
    }
    
    setSwapModalData(null)
  }

  const handleAssignShift = async (doctorId: string, department: string) => {
    if (!selectedDate) return

    try {
      await updateShift(selectedDate, doctorId, selectedHospitalId, '24h', department)
      setShowAssignModal(false)
      setShowOptionsModal(false)
      setPendingShiftDepartment(null)
      setSelectedDate(null)
      showToast('success', 'Gardă asignată cu succes!')
    } catch (error) {
      logger.error('SchedulePage', 'Failed to assign shift', error)
      showToast('error', 'Eroare la asignarea gărzii')
    }
  }

  // Filter shifts by department - convert object to array first with safety check
  const shiftsArray = shifts ? Object.values(shifts) : []
  const filteredShifts = selectedDepartment === 'all' 
    ? shiftsArray 
    : shiftsArray.filter(shift => shift.department === selectedDepartment)

  const handleExport = () => {
    exportScheduleToExcel(shiftsArray, viewMonth, viewYear, selectedDepartment)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Program Spital</h1>
            <p className="text-gray-600">Gestionare program și schimburi</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              ← Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-8">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'schedule'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📅 Program
          </button>
          {userRole === 'manager' && (
            <button
              onClick={() => setActiveTab('swaps')}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === 'swaps'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🔄 Schimburi
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'schedule' && (
          <ScheduleView
            shifts={filteredShifts}
            viewMonth={viewMonth}
            viewYear={viewYear}
            selectedDepartment={selectedDepartment}
            onDateSelect={handleDateSelect}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onDepartmentChange={setSelectedDepartment}
            onExport={handleExport}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'swaps' && userRole === 'manager' && (
          <SwapManagement
            hospitalId={selectedHospitalId}
            userRole={userRole}
          />
        )}
      </div>

      {/* Modals */}
      <ShiftOptionsModal
        isOpen={showOptionsModal}
        onClose={() => {
          setShowOptionsModal(false)
          setSelectedDate(null)
          setPendingShiftDepartment(null)
        }}
        onAssign={() => {
          setShowOptionsModal(false)
          setShowAssignModal(true)
        }}
        onSwap={() => handleSwapRequest(selectedDate || '', {} as Shift)}
        selectedDate={selectedDate}
      />

      <AssignShiftModal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false)
          setSelectedDate(null)
          setPendingShiftDepartment(null)
        }}
        onAssign={handleAssignShift}
        selectedDate={selectedDate}
        selectedDepartment={pendingShiftDepartment || selectedDepartment}
        availableStaff={(staff || []).filter(s => 
          s.role === 'staff' && 
          s.hospitalId?.toString() === selectedHospitalId
        )}
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
          availableStaff={(staff || []).filter(s => 
            s.role === 'staff' && 
            s.hospitalId?.toString() === selectedHospitalId &&
            s.id !== swapModalData.shift.doctorId
          )}
        />
      )}
    </div>
  )
}

// Disable pre-rendering for this page due to dynamic data dependencies
export const dynamic = 'force-dynamic'

export default SchedulePage