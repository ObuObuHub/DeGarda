'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { hospitals } from '@/lib/data'

interface HospitalContextType {
  selectedHospitalId: string
  selectedHospital: typeof hospitals[0] | null
  setSelectedHospitalId: (id: string) => void
}

const HospitalContext = createContext<HospitalContextType | undefined>(undefined)

export function HospitalProvider({ children }: { children: ReactNode }) {
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('1')
  
  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('selectedHospitalId')
    if (saved && hospitals.find(h => h.id === saved)) {
      setSelectedHospitalId(saved)
    }
  }, [])

  // Save to localStorage when changed
  const handleSetHospitalId = (id: string) => {
    setSelectedHospitalId(id)
    localStorage.setItem('selectedHospitalId', id)
  }

  const selectedHospital = hospitals.find(h => h.id === selectedHospitalId) || null

  return (
    <HospitalContext.Provider 
      value={{ 
        selectedHospitalId, 
        selectedHospital,
        setSelectedHospitalId: handleSetHospitalId 
      }}
    >
      {children}
    </HospitalContext.Provider>
  )
}

export function useHospital() {
  const context = useContext(HospitalContext)
  if (context === undefined) {
    throw new Error('useHospital must be used within a HospitalProvider')
  }
  return context
}