'use client'

import { useReducer, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import withAuth, { AuthUser, WithAuthProps } from '@/components/withAuth'
import { GenerationParameters } from '@/components/shifts/GenerationParameters'
import { ReservationsPreview } from '@/components/shifts/ReservationsPreview'
import { GenerationInstructions } from '@/components/shifts/GenerationInstructions'
import { AccessDenied } from '@/components/shifts/AccessDenied'
import { logger } from '@/lib/logger'
import { apiClient } from '@/lib/apiClient'

interface Reservation {
  id: number
  staff_id: number
  staff_name: string
  shift_date: string
  department: string
  status: string
  created_at: string
}

interface GenerateShiftsPageProps extends WithAuthProps {
  // Additional props if needed
}

// State shape for useReducer
interface GenerateShiftsState {
  selectedHospitalId: string
  selectedDepartment: string
  selectedMonth: string
  selectedYear: string
  reservations: Reservation[]
  isLoadingReservations: boolean
  isGenerating: boolean
  error: string
  success: string
  canGenerate: boolean
}

// Action types
type GenerateShiftsAction =
  | { type: 'SET_SELECTION'; payload: { hospitalId?: string; department?: string; month?: string; year?: string } }
  | { type: 'SET_RESERVATIONS'; payload: Reservation[] }
  | { type: 'SET_LOADING'; payload: { reservations?: boolean; generating?: boolean } }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SET_SUCCESS'; payload: string }
  | { type: 'SET_CAN_GENERATE'; payload: boolean }
  | { type: 'RESET_MESSAGES' }

// Reducer function
function generateShiftsReducer(state: GenerateShiftsState, action: GenerateShiftsAction): GenerateShiftsState {
  switch (action.type) {
    case 'SET_SELECTION':
      return {
        ...state,
        selectedHospitalId: action.payload.hospitalId ?? state.selectedHospitalId,
        selectedDepartment: action.payload.department ?? state.selectedDepartment,
        selectedMonth: action.payload.month ?? state.selectedMonth,
        selectedYear: action.payload.year ?? state.selectedYear
      }
    
    case 'SET_RESERVATIONS':
      return {
        ...state,
        reservations: action.payload
      }
    
    case 'SET_LOADING':
      return {
        ...state,
        isLoadingReservations: action.payload.reservations ?? state.isLoadingReservations,
        isGenerating: action.payload.generating ?? state.isGenerating
      }
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        success: ''
      }
    
    case 'SET_SUCCESS':
      return {
        ...state,
        success: action.payload,
        error: ''
      }
    
    case 'SET_CAN_GENERATE':
      return {
        ...state,
        canGenerate: action.payload
      }
    
    case 'RESET_MESSAGES':
      return {
        ...state,
        error: '',
        success: ''
      }
    
    default:
      return state
  }
}

// Initial state
const initialState: GenerateShiftsState = {
  selectedHospitalId: '',
  selectedDepartment: 'Laborator',
  selectedMonth: '',
  selectedYear: '',
  reservations: [],
  isLoadingReservations: false,
  isGenerating: false,
  error: '',
  success: '',
  canGenerate: false
}

function GenerateShiftsPage({ user, isLoading: authLoading, error: authError }: GenerateShiftsPageProps) {
  const router = useRouter()
  const [state, dispatch] = useReducer(generateShiftsReducer, initialState)

  const isAdmin = user?.role === 'admin'
  const isManager = user?.role === 'manager'
  const isStaff = user?.role === 'staff'

  useEffect(() => {
    if (user) {
      // All users see only their assigned hospital
      dispatch({ type: 'SET_SELECTION', payload: { hospitalId: user.hospitalId?.toString() || '' } })
      
      if (isAdmin || isManager) {
        dispatch({ type: 'SET_CAN_GENERATE', payload: true })
      } else if (isStaff) {
        checkStaffPermissions()
      }
      
      // Set default to next month
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      dispatch({ 
        type: 'SET_SELECTION', 
        payload: {
          month: (nextMonth.getMonth() + 1).toString().padStart(2, '0'),
          year: nextMonth.getFullYear().toString()
        }
      })
    }
  }, [user])

  useEffect(() => {
    if (state.selectedHospitalId && state.selectedMonth && state.selectedYear) {
      loadReservations()
    }
  }, [state.selectedHospitalId, state.selectedMonth, state.selectedYear, state.selectedDepartment])

  const checkStaffPermissions = async () => {
    try {
      const response = await fetch('/api/staff/shift-permissions', {
        credentials: 'include'
      })
      const data = await response.json()
      
      if (response.ok) {
        dispatch({ type: 'SET_CAN_GENERATE', payload: data.canGenerateShifts || false })
        if (data.department) {
          dispatch({ type: 'SET_SELECTION', payload: { department: data.department } })
        }
      }
    } catch (error) {
      logger.error('GenerateShiftsPage', 'Failed to check permissions', error)
      dispatch({ type: 'SET_CAN_GENERATE', payload: false })
    }
  }

  const loadReservations = async () => {
    dispatch({ type: 'SET_LOADING', payload: { reservations: true } })
    try {
      const data = await apiClient.get<{ success: boolean, reservations?: Reservation[], error?: string }>(
        `/api/reservations?hospitalId=${state.selectedHospitalId}&month=${state.selectedMonth}&year=${state.selectedYear}&department=${state.selectedDepartment}`
      )

      if (data.success) {
        dispatch({ type: 'SET_RESERVATIONS', payload: data.reservations || [] })
      } else {
        dispatch({ type: 'SET_ERROR', payload: data.error || 'Failed to load reservations' })
      }
    } catch (error) {
      logger.error('GenerateShiftsPage', 'Failed to load reservations', error)
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load reservations' })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { reservations: false } })
    }
  }

  const handleGenerateShifts = async () => {
    dispatch({ type: 'SET_LOADING', payload: { generating: true } })
    dispatch({ type: 'RESET_MESSAGES' })

    try {
      const response = await fetch('/api/shifts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          hospitalId: state.selectedHospitalId,
          month: parseInt(state.selectedMonth),
          year: parseInt(state.selectedYear),
          department: state.selectedDepartment
        })
      })

      const data = await response.json()

      if (data.success) {
        dispatch({ type: 'SET_SUCCESS', payload: data.message || 'Shifts generated successfully!' })
        // Reload reservations to show updated status
        loadReservations()
      } else {
        dispatch({ type: 'SET_ERROR', payload: data.error || 'Failed to generate shifts' })
      }
    } catch (error) {
      logger.error('GenerateShiftsPage', 'Failed to generate shifts', error)
      dispatch({ type: 'SET_ERROR', payload: 'Failed to generate shifts. Please try again.' })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { generating: false } })
    }
  }

  // Access check
  if (!state.canGenerate) {
    return <AccessDenied isAdmin={isAdmin} />
  }

  return (
    <div className="min-h-screen bg-background-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-label-primary">Generate Shifts</h1>
          <p className="mt-2 text-label-secondary">
            {isAdmin ? 'Generate shifts for any hospital and department' : 
             isManager ? 'Generate shifts for your hospital' : 
             'Generate shifts for your department'}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <GenerationParameters
              user={user}
              selectedHospitalId={state.selectedHospitalId}
              selectedDepartment={state.selectedDepartment}
              selectedMonth={state.selectedMonth}
              selectedYear={state.selectedYear}
              onHospitalChange={(id) => dispatch({ type: 'SET_SELECTION', payload: { hospitalId: id } })}
              onDepartmentChange={(dept) => dispatch({ type: 'SET_SELECTION', payload: { department: dept } })}
              onMonthChange={(month) => dispatch({ type: 'SET_SELECTION', payload: { month } })}
              onYearChange={(year) => dispatch({ type: 'SET_SELECTION', payload: { year } })}
            />

            <GenerationInstructions />
          </div>

          <div className="space-y-6">
            <ReservationsPreview
              reservations={state.reservations}
              isLoading={state.isLoadingReservations}
              month={state.selectedMonth}
              year={state.selectedYear}
              department={state.selectedDepartment}
            />

            <Card>
              <div className="space-y-4">
                {state.error && (
                  <div className="p-3 bg-system-red/10 border border-system-red/30 rounded-ios text-sm text-system-red">
                    {state.error}
                  </div>
                )}

                {state.success && (
                  <div className="p-3 bg-system-green/10 border border-system-green/30 rounded-ios text-sm text-system-green">
                    {state.success}
                  </div>
                )}

                <Button
                  fullWidth
                  size="lg"
                  onClick={handleGenerateShifts}
                  disabled={
                    state.isGenerating || 
                    !state.selectedHospitalId || 
                    !state.selectedMonth || 
                    !state.selectedYear ||
                    state.reservations.length === 0
                  }
                >
                  {state.isGenerating ? 'Generating...' : 'Generate Shifts'}
                </Button>

                <p className="text-xs text-center text-label-tertiary">
                  This will generate shifts for {state.reservations.length} reservations
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default withAuth(GenerateShiftsPage)