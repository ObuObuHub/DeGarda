'use client'

import React from 'react'
import { useHospital } from '@/contexts/HospitalContext'
import { hospitals } from '@/lib/data'

export function HospitalSelector() {
  const { selectedHospitalId, setSelectedHospitalId } = useHospital()

  return (
    <div className="relative">
      <select
        value={selectedHospitalId}
        onChange={(e) => setSelectedHospitalId(e.target.value)}
        className="
          appearance-none
          bg-system-gray-6
          text-label-primary
          rounded-lg
          px-3 py-2 pr-8
          text-xs sm:text-sm font-medium
          focus:outline-none
          focus:ring-2
          focus:ring-system-blue
          cursor-pointer
          border border-separator-opaque
          max-w-[180px] sm:max-w-none
          truncate
        "
      >
        {hospitals.map(hospital => (
          <option key={hospital.id} value={hospital.id}>
            {hospital.name}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg className="h-5 w-5 text-label-tertiary" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>
    </div>
  )
}