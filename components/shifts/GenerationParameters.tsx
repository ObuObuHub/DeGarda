'use client'

import { Card } from '@/components/ui/Card'

interface GenerationParametersProps {
  user: any
  selectedHospitalId: string
  selectedMonth: string
  selectedYear: string
  selectedDepartment: string
  onHospitalChange: (id: string) => void
  onMonthChange: (month: string) => void
  onYearChange: (year: string) => void
  onDepartmentChange: (department: string) => void
}

export function GenerationParameters({
  user,
  selectedHospitalId,
  selectedMonth,
  selectedYear,
  selectedDepartment,
  onHospitalChange,
  onMonthChange,
  onYearChange,
  onDepartmentChange
}: GenerationParametersProps) {
  
  const getMonthName = (month: string) => {
    const monthNames = [
      'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
      'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
    ]
    return monthNames[parseInt(month) - 1] || month
  }

  const isManager = user?.role === 'manager'
  const isAdmin = user?.role === 'admin'
  const canSelectDepartment = isManager || isAdmin

  return (
    <Card className="p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Parametri Generare
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Month Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Luna
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={false}
          >
            {Array.from({ length: 12 }, (_, i) => {
              const month = (i + 1).toString().padStart(2, '0')
              const monthName = getMonthName(month)
              return (
                <option key={month} value={month}>
                  {monthName}
                </option>
              )
            })}
          </select>
        </div>

        {/* Year Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Anul
          </label>
          <select
            value={selectedYear}
            onChange={(e) => onYearChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={false}
          >
            {Array.from({ length: 3 }, (_, i) => {
              const year = (new Date().getFullYear() + i).toString()
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              )
            })}
          </select>
        </div>

        {/* Department Selection - Only for Managers/Admin */}
        {canSelectDepartment && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Departament
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => onDepartmentChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={false}
            >
              <option value="Laborator">Laborator</option>
              <option value="Urgențe">Urgențe</option>
              <option value="Chirurgie">Chirurgie</option>
              <option value="Medicină Internă">Medicină Internă</option>
              <option value="ATI">ATI</option>
            </select>
          </div>
        )}
      </div>
    </Card>
  )
}