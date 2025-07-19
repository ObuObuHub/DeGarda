'use client'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/LoadingSpinner'

interface GenerationParametersProps {
  selectedMonth: string
  selectedYear: string
  selectedDepartment: string
  onMonthChange: (month: string) => void
  onYearChange: (year: string) => void
  onDepartmentChange: (department: string) => void
  onGenerate: () => void
  isGenerating: boolean
  canGenerate: boolean
  userRole: string
}

export function GenerationParameters({
  selectedMonth,
  selectedYear,
  selectedDepartment,
  onMonthChange,
  onYearChange,
  onDepartmentChange,
  onGenerate,
  isGenerating,
  canGenerate,
  userRole
}: GenerationParametersProps) {
  
  const getMonthName = (month: string) => {
    const monthNames = [
      'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
      'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
    ]
    return monthNames[parseInt(month) - 1] || month
  }

  const isManager = userRole === 'manager'
  const isAdmin = userRole === 'admin'
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
            disabled={isGenerating}
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
            disabled={isGenerating}
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
              disabled={isGenerating}
            >
              <option value="LABORATOR">LABORATOR</option>
              <option value="URGENTA">URGENȚĂ</option>
              <option value="CHIRURGIE">CHIRURGIE</option>
              <option value="INTERNA">INTERNĂ</option>
            </select>
          </div>
        )}
      </div>

      <div className="mt-6">
        <Button
          onClick={onGenerate}
          disabled={isGenerating || !canGenerate || !selectedMonth || !selectedYear}
          className="w-full md:w-auto"
        >
          {isGenerating ? (
            <span className="flex items-center space-x-2">
              <LoadingSpinner size="sm" />
              <span>Se generează...</span>
            </span>
          ) : (
            `Generează Gărzi pentru ${getMonthName(selectedMonth)} ${selectedYear}`
          )}
        </Button>
      </div>
    </Card>
  )
}