'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Hospital {
  id: string
  name: string
  city: string
  staff?: number
}

interface HospitalContextType {
  selectedHospitalId: string
  selectedHospital: Hospital | null
  setSelectedHospitalId: (id: string) => void
}

const HospitalContext = createContext<HospitalContextType | undefined>(undefined)

export function HospitalProvider({ children }: { children: ReactNode }) {
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('')
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null)
  
  // Load from localStorage on mount (set during login)
  useEffect(() => {
    const saved = localStorage.getItem('selectedHospitalId')
    if (saved) {
      setSelectedHospitalId(saved)
      fetchHospital(saved)
    }
  }, [])

  const fetchHospital = async (hospitalId: string) => {
    try {
      const response = await fetch(`/api/hospitals/${hospitalId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedHospital(data)
      }
    } catch (error) {
      console.error('Failed to fetch hospital:', error)
    }
  }

  // Save to localStorage when changed
  const handleSetHospitalId = (id: string) => {
    setSelectedHospitalId(id)
    localStorage.setItem('selectedHospitalId', id)
    if (id) {
      fetchHospital(id)
    } else {
      setSelectedHospital(null)
    }
  }

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