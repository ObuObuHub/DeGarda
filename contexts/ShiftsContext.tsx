'use client'

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { useApi } from '@/hooks/useApi'
import { Shift, ShiftType } from '@/types'

interface ShiftsContextType {
  shifts: Record<string, Shift>
  isLoading: boolean
  error: string | null
  loadShifts: (year: number, month: number, hospitalId?: string) => Promise<void>
  updateShift: (date: string, staffId: string | null, hospitalId: string, type?: ShiftType, department?: string) => Promise<void>
  refreshShifts: () => Promise<void>
  getShiftsForDate: (date: string) => Shift[]
  getShiftsForMonth: (year: number, month: number) => Shift[]
}

const ShiftsContext = createContext<ShiftsContextType | undefined>(undefined)

export const useShifts = () => {
  const context = useContext(ShiftsContext)
  if (!context) {
    throw new Error('useShifts must be used within a ShiftsProvider')
  }
  return context
}

interface ShiftsProviderProps {
  children: React.ReactNode
}

export const ShiftsProvider: React.FC<ShiftsProviderProps> = ({ children }) => {
  const [shifts, setShifts] = useState<Record<string, Shift>>({})
  const [currentParams, setCurrentParams] = useState<{year: number, month: number, hospitalId?: string} | null>(null)
  
  // Use our standardized API hook
  const shiftsApi = useApi({ 
    logContext: 'ShiftsContext',
    onSuccess: (data) => {
      if (data && typeof data === 'object') {
        setShifts(data)
      }
    }
  })

  // Request deduplication
  const pendingRequests = useRef<Map<string, Promise<any>>>(new Map())

  const loadShifts = useCallback(async (year: number, month: number, hospitalId?: string) => {
    const requestKey = `shifts-${year}-${month}-${hospitalId || 'all'}`
    
    // Check if we already have a pending request for this data
    if (pendingRequests.current.has(requestKey)) {
      return pendingRequests.current.get(requestKey)
    }

    const requestPromise = (async () => {
      try {
        const url = `/api/shifts?year=${year}&month=${month}${hospitalId ? `&hospitalId=${hospitalId}` : ''}`
        await shiftsApi.get(url)
        setCurrentParams({ year, month, hospitalId })
      } finally {
        pendingRequests.current.delete(requestKey)
      }
    })()

    pendingRequests.current.set(requestKey, requestPromise)
    return requestPromise
  }, [shiftsApi])

  const updateShift = useCallback(async (
    date: string, 
    staffId: string | null, 
    hospitalId: string, 
    type: ShiftType = '24h', 
    department?: string
  ) => {
    try {
      const shiftData = {
        date,
        staffId,
        hospitalId,
        type,
        department
      }

      const result = await shiftsApi.post('/api/shifts', shiftData)
      
      if (result.success) {
        // Update local state optimistically
        const shiftKey = `${date}-${hospitalId}`
        setShifts(prev => ({
          ...prev,
          [shiftKey]: {
            id: shiftKey,
            date,
            doctorId: staffId,
            hospital_id: parseInt(hospitalId),
            type,
            department,
            status: staffId ? 'assigned' : 'open'
          }
        }))
      }
    } catch (error) {
      // Error is handled by the API hook
      throw error
    }
  }, [shiftsApi])

  const refreshShifts = useCallback(async () => {
    if (currentParams) {
      await loadShifts(currentParams.year, currentParams.month, currentParams.hospitalId)
    }
  }, [loadShifts, currentParams])

  const getShiftsForDate = useCallback((date: string): Shift[] => {
    return Object.values(shifts).filter(shift => shift.date === date)
  }, [shifts])

  const getShiftsForMonth = useCallback((year: number, month: number): Shift[] => {
    const monthStr = month.toString().padStart(2, '0')
    const yearStr = year.toString()
    
    return Object.values(shifts).filter(shift => {
      const shiftDate = new Date(shift.date)
      return shiftDate.getFullYear() === year && shiftDate.getMonth() === month
    })
  }, [shifts])

  const value: ShiftsContextType = {
    shifts,
    isLoading: shiftsApi.isLoading,
    error: shiftsApi.error,
    loadShifts,
    updateShift,
    refreshShifts,
    getShiftsForDate,
    getShiftsForMonth
  }

  return (
    <ShiftsContext.Provider value={value}>
      {children}
    </ShiftsContext.Provider>
  )
}