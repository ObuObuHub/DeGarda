'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { useApi } from '@/hooks/useApi'
import { Staff } from '@/types'

interface StaffContextType {
  staff: Staff[]
  isLoading: boolean
  error: string | null
  loadStaff: (hospitalId?: string) => Promise<void>
  refreshStaff: () => Promise<void>
  getStaffByHospital: (hospitalId: string) => Staff[]
  getStaffById: (staffId: string) => Staff | undefined
  getAvailableStaff: (hospitalId: string) => Staff[]
}

const StaffContext = createContext<StaffContextType | undefined>(undefined)

export const useStaff = () => {
  const context = useContext(StaffContext)
  if (!context) {
    throw new Error('useStaff must be used within a StaffProvider')
  }
  return context
}

interface StaffProviderProps {
  children: React.ReactNode
}

export const StaffProvider: React.FC<StaffProviderProps> = ({ children }) => {
  const [staff, setStaff] = useState<Staff[]>([])
  const [currentHospitalId, setCurrentHospitalId] = useState<string | undefined>()
  
  // Use our standardized API hook
  const staffApi = useApi({ 
    logContext: 'StaffContext',
    onSuccess: (data) => {
      if (Array.isArray(data)) {
        setStaff(data)
      }
    }
  })

  const loadStaff = useCallback(async (hospitalId?: string) => {
    try {
      const url = hospitalId ? `/api/staff?hospitalId=${hospitalId}` : '/api/staff'
      await staffApi.get(url)
      setCurrentHospitalId(hospitalId)
    } catch (error) {
      // Error is handled by the API hook
      console.error('Failed to load staff:', error)
    }
  }, [staffApi])

  const refreshStaff = useCallback(async () => {
    await loadStaff(currentHospitalId)
  }, [loadStaff, currentHospitalId])

  const getStaffByHospital = useCallback((hospitalId: string): Staff[] => {
    return staff.filter(member => 
      member.hospitalId?.toString() === hospitalId ||
      member.hospital_id?.toString() === hospitalId
    )
  }, [staff])

  const getStaffById = useCallback((staffId: string): Staff | undefined => {
    return staff.find(member => 
      member.id?.toString() === staffId
    )
  }, [staff])

  const getAvailableStaff = useCallback((hospitalId: string): Staff[] => {
    return staff.filter(member => {
      const matchesHospital = member.hospitalId?.toString() === hospitalId ||
                            member.hospital_id?.toString() === hospitalId
      const isActive = member.is_active !== false // Default to true if not specified
      const isStaff = member.role === 'staff'
      
      return matchesHospital && isActive && isStaff
    })
  }, [staff])

  const value: StaffContextType = {
    staff,
    isLoading: staffApi.isLoading,
    error: staffApi.error,
    loadStaff,
    refreshStaff,
    getStaffByHospital,
    getStaffById,
    getAvailableStaff
  }

  return (
    <StaffContext.Provider value={value}>
      {children}
    </StaffContext.Provider>
  )
}