'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useHospital } from '@/contexts/HospitalContext'
import { Icon } from '@/components/ui/Icon'

interface Hospital {
  id: string
  name: string
  city: string
  departments?: number
  staff?: number
}

export function HospitalSelector() {
  const { selectedHospitalId, setSelectedHospitalId } = useHospital()
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const selectedHospital = hospitals.find(h => h.id === selectedHospitalId)

  // Fetch hospitals from API
  useEffect(() => {
    fetchHospitals()
  }, [])

  const fetchHospitals = async () => {
    try {
      const response = await fetch('/api/hospitals')
      if (response.ok) {
        const data = await response.json()
        setHospitals(data)
        // If no hospital is selected, select the first one
        if (!selectedHospitalId && data.length > 0) {
          setSelectedHospitalId(data[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch hospitals:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (hospitalId: string) => {
    setSelectedHospitalId(hospitalId)
    setIsOpen(false)
    setFocusedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setIsOpen(true)
        setFocusedIndex(hospitals.findIndex(h => h.id === selectedHospitalId))
      }
    } else {
      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          setFocusedIndex(-1)
          break
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex(prev => (prev + 1) % hospitals.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex(prev => (prev - 1 + hospitals.length) % hospitals.length)
          break
        case 'Enter':
          e.preventDefault()
          if (focusedIndex >= 0) {
            handleSelect(hospitals[focusedIndex].id)
          }
          break
      }
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="
          w-full max-w-[280px] sm:max-w-none
          bg-white
          border border-gray-200
          rounded-xl
          px-4 py-3
          text-left
          hover:border-system-blue/30
          hover:shadow-md
          focus:outline-none
          focus:ring-2
          focus:ring-system-blue
          focus:border-transparent
          transition-all duration-200
          group
          shadow-sm
        "
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl flex-shrink-0">🏥</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-label-primary truncate">
                {isLoading ? 'Se încarcă...' : (selectedHospital?.name || 'Selectează spital')}
              </p>
              {selectedHospital && (
                <p className="text-xs text-label-tertiary">
                  {selectedHospital.city}
                </p>
              )}
            </div>
          </div>
          <Icon 
            name="chevronDown" 
            size="sm" 
            className={`text-label-tertiary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div className="fixed inset-0 bg-black/20 z-40 sm:hidden" onClick={() => setIsOpen(false)} />
          
          {/* Dropdown content */}
          <div className={`
            absolute top-full mt-2 
            w-full sm:w-[320px] 
            bg-white 
            rounded-xl 
            shadow-lg 
            border border-gray-200
            overflow-hidden
            z-50
            animate-dropdown sm:animate-dropdown
            
            ${/* Mobile full screen styles */ ''}
            fixed sm:absolute
            inset-x-0 sm:inset-x-auto
            bottom-0 sm:bottom-auto
            mt-0 sm:mt-2
            rounded-t-2xl sm:rounded-xl
            max-h-[70vh] sm:max-h-[400px]
            animate-mobile-slide-up sm:animate-dropdown
          `}>
            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>
            
            <div className="overflow-y-auto max-h-[60vh] sm:max-h-[350px]">
              {isLoading ? (
                <div className="text-center py-4 text-label-secondary">
                  Se încarcă spitalele...
                </div>
              ) : hospitals.length === 0 ? (
                <div className="text-center py-4 text-label-secondary">
                  Niciun spital disponibil
                </div>
              ) : (
                hospitals.map((hospital, index) => (
                <button
                  key={hospital.id}
                  onClick={() => handleSelect(hospital.id)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  className={`
                    w-full px-4 py-3
                    flex items-center gap-3
                    hover:bg-gray-50
                    transition-colors
                    ${hospital.id === selectedHospitalId ? 'bg-system-blue/5' : ''}
                    ${focusedIndex === index ? 'bg-gray-50' : ''}
                  `}
                >
                  <span className="text-2xl">🏥</span>
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-medium ${
                      hospital.id === selectedHospitalId ? 'text-system-blue' : 'text-label-primary'
                    }`}>
                      {hospital.name}
                    </p>
                    <p className="text-xs text-label-tertiary">
                      {hospital.city} • {hospital.departments} secții • {hospital.staff} personal
                    </p>
                  </div>
                  {hospital.id === selectedHospitalId && (
                    <Icon name="check" size="sm" className="text-system-blue" />
                  )}
                </button>
              ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}