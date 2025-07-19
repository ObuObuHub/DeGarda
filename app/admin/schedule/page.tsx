'use client'

import { useReducer, useEffect } from 'react'
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
import { Shift } from '@/types'

interface SwapModalData {
  date: string
  shift: Shift
}

// State shape for useReducer
interface SchedulePageState {
  user: any | null
  userRole: string | null
  activeTab: 'schedule' | 'swaps'
  viewMonth: number
  viewYear: number
  selectedDepartment: string
  selectedDate: string | null
  showOptionsModal: boolean
  showAssignModal: boolean
  swapModalData: SwapModalData | null
  pendingShiftDepartment: string | null
}

// Action types
type SchedulePageAction =
  | { type: 'SET_USER'; payload: { user: any; role: string } }
  | { type: 'SET_TAB'; payload: 'schedule' | 'swaps' }
  | { type: 'SET_CALENDAR'; payload: { month?: number; year?: number } }
  | { type: 'SET_DEPARTMENT'; payload: string }
  | { type: 'OPEN_OPTIONS_MODAL'; payload: { date: string; department: string } }
  | { type: 'CLOSE_OPTIONS_MODAL' }
  | { type: 'OPEN_ASSIGN_MODAL' }
  | { type: 'CLOSE_ASSIGN_MODAL' }
  | { type: 'SET_SWAP_MODAL'; payload: SwapModalData | null }
  | { type: 'RESET_MODALS' }

// Reducer function
function schedulePageReducer(state: SchedulePageState, action: SchedulePageAction): SchedulePageState {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload.user,
        userRole: action.payload.role
      }
    
    case 'SET_TAB':
      return {
        ...state,
        activeTab: action.payload
      }
    
    case 'SET_CALENDAR':
      return {
        ...state,
        viewMonth: action.payload.month ?? state.viewMonth,
        viewYear: action.payload.year ?? state.viewYear
      }
    
    case 'SET_DEPARTMENT':
      return {
        ...state,
        selectedDepartment: action.payload
      }
    
    case 'OPEN_OPTIONS_MODAL':
      return {
        ...state,
        selectedDate: action.payload.date,
        pendingShiftDepartment: action.payload.department,
        showOptionsModal: true
      }
    
    case 'CLOSE_OPTIONS_MODAL':
      return {
        ...state,
        showOptionsModal: false,
        selectedDate: null,
        pendingShiftDepartment: null
      }
    
    case 'OPEN_ASSIGN_MODAL':
      return {
        ...state,
        showOptionsModal: false,
        showAssignModal: true
      }
    
    case 'CLOSE_ASSIGN_MODAL':
      return {
        ...state,
        showAssignModal: false,
        selectedDate: null,
        pendingShiftDepartment: null
      }
    
    case 'SET_SWAP_MODAL':
      return {
        ...state,
        swapModalData: action.payload
      }
    
    case 'RESET_MODALS':
      return {
        ...state,
        showOptionsModal: false,
        showAssignModal: false,
        selectedDate: null,
        pendingShiftDepartment: null,
        swapModalData: null
      }
    
    default:
      return state
  }
}

// Initial state
const currentDate = new Date()
const initialState: SchedulePageState = {
  user: null,
  userRole: null,
  activeTab: 'schedule',
  viewMonth: currentDate.getMonth(),
  viewYear: currentDate.getFullYear(),
  selectedDepartment: 'all',
  selectedDate: null,
  showOptionsModal: false,
  showAssignModal: false,
  swapModalData: null,
  pendingShiftDepartment: null
}

function SchedulePage() {
  const router = useRouter()
  const [state, dispatch] = useReducer(schedulePageReducer, initialState)
  
  const selectedHospitalId = state.user?.hospitalId?.toString() || ''
  
  // Use the new focused contexts
  const { shifts, isLoading: shiftsLoading, loadShifts, updateShift } = useShifts()
  const { staff, isLoading: staffLoading, loadStaff } = useStaff()
  const { addNotification } = useNotifications()
  
  const isLoading = shiftsLoading || staffLoading

  // Real-time sync
  const { syncData, lastSync } = useRealtimeSync({
    hospitalId: selectedHospitalId || undefined,
    year: state.viewYear,
    month: state.viewMonth
  })

  useEffect(() => {
    const initializePage = async () => {
      const role = await getClientUserRole()
      if (!role) {
        router.push('/login')
        return
      }
      
      const user = { hospitalId: '' } // Placeholder - get from auth context
      dispatch({ type: 'SET_USER', payload: { user, role } })
      
      // Check URL params for tab selection
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab')
      if (tabParam === 'swaps' && role === 'manager') {
        dispatch({ type: 'SET_TAB', payload: 'swaps' })
      }
    }
    
    initializePage()
  }, [router])

  useEffect(() => {
    if (selectedHospitalId) {
      loadShifts(state.viewYear, state.viewMonth, selectedHospitalId)
      loadStaff(selectedHospitalId)
    }
  }, [state.viewYear, state.viewMonth, selectedHospitalId, loadShifts, loadStaff])

  // Calendar navigation
  const handlePrevMonth = () => {
    if (state.viewMonth === 0) {
      dispatch({ type: 'SET_CALENDAR', payload: { month: 11, year: state.viewYear - 1 } })
    } else {
      dispatch({ type: 'SET_CALENDAR', payload: { month: state.viewMonth - 1 } })
    }
  }

  const handleNextMonth = () => {
    if (state.viewMonth === 11) {
      dispatch({ type: 'SET_CALENDAR', payload: { month: 0, year: state.viewYear + 1 } })
    } else {
      dispatch({ type: 'SET_CALENDAR', payload: { month: state.viewMonth + 1 } })
    }
  }

  // Shift management
  const handleDateSelect = (date: string) => {
    dispatch({ 
      type: 'OPEN_OPTIONS_MODAL', 
      payload: { date, department: state.selectedDepartment } 
    })
  }

  const handleSwapRequest = (date: string, shift: Shift) => {
    dispatch({ type: 'SET_SWAP_MODAL', payload: { date, shift } })
  }

  const submitSwapRequest = async (toStaffId: string | null, reason: string) => {
    if (!state.swapModalData) return

    try {
      const response = await fetch('/api/swaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fromStaffId: state.swapModalData.shift.doctorId,
          toStaffId,
          shiftId: state.swapModalData.shift.id,
          reason
        })
      })

      const data = await response.json()
      if (data.success) {
        showToast('success', 'Cerere de schimb trimisă cu succes!')
        addNotification?.(`Cerere de schimb pentru ${state.swapModalData.date}`, 'info')
      } else {
        showToast('error', data.error || 'Eroare la trimiterea cererii')
      }
    } catch (error) {
      logger.error('SchedulePage', 'Failed to submit swap request', error)
      showToast('error', 'Eroare la trimiterea cererii')
    }
    
    dispatch({ type: 'SET_SWAP_MODAL', payload: null })
  }

  const handleAssignShift = async (doctorId: string, department: string) => {
    if (!state.selectedDate) return

    try {
      await updateShift(state.selectedDate, doctorId, selectedHospitalId, '24h', department)
      dispatch({ type: 'RESET_MODALS' })
      showToast('success', 'Gardă asignată cu succes!')
    } catch (error) {
      logger.error('SchedulePage', 'Failed to assign shift', error)
      showToast('error', 'Eroare la asignarea gărzii')
    }
  }

  // Filter shifts by department - convert object to array first with safety check
  const shiftsArray = shifts ? Object.values(shifts) : []
  const filteredShifts = state.selectedDepartment === 'all' 
    ? shiftsArray 
    : shiftsArray.filter(shift => shift.department === state.selectedDepartment)

  const handleExport = () => {
    exportScheduleToExcel(shiftsArray, state.viewMonth, state.viewYear, state.selectedDepartment)
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
            onClick={() => dispatch({ type: 'SET_TAB', payload: 'schedule' })}
            className={`px-6 py-3 font-medium text-sm ${
              state.activeTab === 'schedule'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📅 Program
          </button>
          {state.userRole === 'manager' && (
            <button
              onClick={() => dispatch({ type: 'SET_TAB', payload: 'swaps' })}
              className={`px-6 py-3 font-medium text-sm ${
                state.activeTab === 'swaps'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🔄 Schimburi
            </button>
          )}
        </div>

        {/* Tab Content */}
        {state.activeTab === 'schedule' && (
          <ScheduleView
            shifts={filteredShifts}
            viewMonth={state.viewMonth}
            viewYear={state.viewYear}
            selectedDepartment={state.selectedDepartment}
            onDateSelect={handleDateSelect}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onDepartmentChange={(dept) => dispatch({ type: 'SET_DEPARTMENT', payload: dept })}
            onExport={handleExport}
            isLoading={isLoading}
          />
        )}

        {state.activeTab === 'swaps' && state.userRole === 'manager' && (
          <SwapManagement
            hospitalId={selectedHospitalId}
            userRole={state.userRole}
          />
        )}
      </div>

      {/* Modals */}
      <ShiftOptionsModal
        isOpen={state.showOptionsModal}
        onClose={() => dispatch({ type: 'CLOSE_OPTIONS_MODAL' })}
        onAssign={() => dispatch({ type: 'OPEN_ASSIGN_MODAL' })}
        onSwap={() => handleSwapRequest(state.selectedDate || '', {} as Shift)}
        selectedDate={state.selectedDate}
      />

      <AssignShiftModal
        isOpen={state.showAssignModal}
        onClose={() => dispatch({ type: 'CLOSE_ASSIGN_MODAL' })}
        onAssign={handleAssignShift}
        selectedDate={state.selectedDate}
        selectedDepartment={state.pendingShiftDepartment || state.selectedDepartment}
        availableStaff={(staff || []).filter(s => 
          s.role === 'staff' && 
          s.hospitalId?.toString() === selectedHospitalId
        )}
      />

      {state.swapModalData && (
        <SwapRequestModal
          isOpen={!!state.swapModalData}
          onClose={() => dispatch({ type: 'SET_SWAP_MODAL', payload: null })}
          shift={{
            date: state.swapModalData.date,
            doctorId: state.swapModalData.shift.doctorId,
            doctorName: state.swapModalData.shift.doctorName,
            shiftId: state.swapModalData.shift.id
          }}
          onSubmit={submitSwapRequest}
          availableStaff={(staff || []).filter(s => 
            s.role === 'staff' && 
            s.hospitalId?.toString() === selectedHospitalId &&
            s.id !== state.swapModalData.shift.doctorId
          )}
        />
      )}
    </div>
  )
}

// Disable pre-rendering for this page due to dynamic data dependencies
export const dynamic = 'force-dynamic'

export default SchedulePage