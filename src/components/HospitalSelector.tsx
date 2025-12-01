'use client'

import { type Hospital } from '@/types'

interface HospitalSelectorProps {
  hospitals: Hospital[]
  selectedHospitalId: string | null
  onSelect: (hospitalId: string | null) => void
  showAllOption?: boolean
}

export default function HospitalSelector({
  hospitals,
  selectedHospitalId,
  onSelect,
  showAllOption = true
}: HospitalSelectorProps) {
  return (
    <div className="relative">
      <select
        value={selectedHospitalId || ''}
        onChange={e => onSelect(e.target.value || null)}
        className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
      >
        {showAllOption && (
          <option value="">Toate spitalele</option>
        )}
        {hospitals.map(hospital => (
          <option key={hospital.id} value={hospital.id}>
            {hospital.name}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  )
}
