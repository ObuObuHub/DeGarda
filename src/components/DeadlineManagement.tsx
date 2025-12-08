'use client'

import { useState, useEffect, useCallback } from 'react'
import { type Department, type PreferenceDeadline } from '@/types'
import ConfirmDialog from './ui/ConfirmDialog'

interface DeadlineManagementProps {
  departments: Department[]
  deadlines: PreferenceDeadline[]
  selectedHospitalId: string | null
  selectedMonth: Date
  onActivateDeadline: (departmentId: string, targetMonth: Date) => Promise<boolean>
}

function getMonthName(date: Date): string {
  const months = [
    'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
  ]
  return `${months[date.getMonth()]} ${date.getFullYear()}`
}

function formatTimeRemaining(deadline: PreferenceDeadline): string {
  const now = new Date()
  const expiresAt = new Date(deadline.expires_at)
  const diff = expiresAt.getTime() - now.getTime()

  if (diff <= 0) return 'Expirat'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  return `${hours}h ${minutes}m rămase`
}

function getDeadlineStatus(deadline: PreferenceDeadline | undefined): 'active' | 'expired' | 'none' {
  if (!deadline) return 'none'

  const now = new Date()
  const expiresAt = new Date(deadline.expires_at)

  return now > expiresAt ? 'expired' : 'active'
}

export default function DeadlineManagement({
  departments,
  deadlines,
  selectedHospitalId,
  selectedMonth,
  onActivateDeadline
}: DeadlineManagementProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [confirmDepartment, setConfirmDepartment] = useState<Department | null>(null)
  const [, setTick] = useState(0)

  // Refresh countdown every 10 seconds for more responsive UI
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 10000)
    return () => clearInterval(interval)
  }, [])

  const filteredDepartments = selectedHospitalId
    ? departments.filter(d => d.hospital_id === selectedHospitalId && d.is_active)
    : []

  const getTargetMonthStr = useCallback(() => {
    const year = selectedMonth.getFullYear()
    const month = String(selectedMonth.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}-01`
  }, [selectedMonth])

  const getDeadlineForDepartment = useCallback((departmentId: string): PreferenceDeadline | undefined => {
    const targetMonthStr = getTargetMonthStr()
    return deadlines.find(d => d.department_id === departmentId && d.target_month === targetMonthStr)
  }, [deadlines, getTargetMonthStr])

  const handleActivate = async () => {
    if (!confirmDepartment) return

    setLoading(confirmDepartment.id)
    try {
      await onActivateDeadline(confirmDepartment.id, selectedMonth)
    } finally {
      setLoading(null)
      setConfirmDepartment(null)
    }
  }

  const statusColors = {
    active: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    expired: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    none: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' }
  }

  const statusLabels = {
    active: 'Activ',
    expired: 'Expirat',
    none: 'Nesetat'
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Termene Limită pentru {getMonthName(selectedMonth)}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Activează un termen limită de 24 de ore pentru ca staff-ul să își seteze preferințele.
        </p>
      </div>

      {!selectedHospitalId ? (
        <p className="text-gray-500 text-center py-8">
          Selectează un spital pentru a gestiona termenele limită.
        </p>
      ) : filteredDepartments.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          Nu există departamente active pentru acest spital.
        </p>
      ) : (
        <div className="space-y-3">
          {filteredDepartments.map(dept => {
            const deadline = getDeadlineForDepartment(dept.id)
            const status = getDeadlineStatus(deadline)
            const colors = statusColors[status]
            const isLoading = loading === dept.id

            return (
              <div
                key={dept.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${colors.border} ${colors.bg}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: dept.color }}
                  />
                  <div>
                    <p className="font-medium text-gray-900">{dept.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                        {statusLabels[status]}
                      </span>
                      {status === 'active' && deadline && (
                        <span className="text-xs text-gray-500">
                          {formatTimeRemaining(deadline)}
                        </span>
                      )}
                      {status === 'expired' && deadline && (
                        <span className="text-xs text-gray-500">
                          Expirat la {new Date(deadline.expires_at).toLocaleString('ro-RO')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setConfirmDepartment(dept)}
                  disabled={isLoading || status === 'active'}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    status === 'active'
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Se activează...
                    </span>
                  ) : status === 'active' ? (
                    'Activ'
                  ) : status === 'expired' ? (
                    'Reactivează'
                  ) : (
                    'Activează termen'
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmDepartment}
        title="Activează Termen Limită"
        message={`Vrei să activezi un termen limită de 24 de ore pentru departamentul "${confirmDepartment?.name}"? Staff-ul va avea 24 de ore să își seteze preferințele pentru ${getMonthName(selectedMonth)}. După expirare, nu vor mai putea modifica preferințele sau rezerva ture.`}
        confirmText="Activează"
        variant="info"
        onConfirm={handleActivate}
        onCancel={() => setConfirmDepartment(null)}
        loading={loading === confirmDepartment?.id}
      />
    </div>
  )
}
