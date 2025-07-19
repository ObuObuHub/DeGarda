'use client'

import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/LoadingSpinner'

interface Reservation {
  id: number
  staff_id: number
  staff_name: string
  shift_date: string
  department: string
  status: string
  created_at: string
}

interface ReservationsPreviewProps {
  reservations: Reservation[]
  isLoading: boolean
  selectedMonth: string
  selectedYear: string
  selectedDepartment: string
}

export function ReservationsPreview({
  reservations,
  isLoading,
  selectedMonth,
  selectedYear,
  selectedDepartment
}: ReservationsPreviewProps) {
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  }

  const getMonthName = (month: string) => {
    const monthNames = [
      'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
      'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
    ]
    return monthNames[parseInt(month) - 1] || month
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Rezervări Existente ({reservations.length})
        </h2>
        {isLoading && <LoadingSpinner size="sm" />}
      </div>

      {selectedMonth && selectedYear && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">
            Informații Generare pentru {getMonthName(selectedMonth)} {selectedYear}
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Departament:</strong> {selectedDepartment}</li>
            <li>• <strong>Rezervări găsite:</strong> {reservations.length}</li>
            <li>• <strong>Algoritm:</strong> Optimizat cu considere pentru rezervări</li>
            <li>• <strong>Echitatea:</strong> Distribuție echitabilă între tot personalul</li>
          </ul>
        </div>
      )}

      {reservations.length === 0 ? (
        <div className="text-center py-8">
          <span className="text-4xl mb-4 block">📝</span>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nu există rezervări
          </h3>
          <p className="text-gray-600">
            {selectedMonth && selectedYear 
              ? `Nu s-au găsit rezervări pentru ${getMonthName(selectedMonth)} ${selectedYear} în departamentul ${selectedDepartment}.`
              : 'Selectează luna și anul pentru a vedea rezervările.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reservations.map((reservation) => (
            <div
              key={reservation.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-lg">📅</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {reservation.staff_name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {formatDate(reservation.shift_date)} • {reservation.department}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  reservation.status === 'active' 
                    ? 'bg-blue-100 text-blue-800'
                    : reservation.status === 'fulfilled'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {reservation.status === 'active' ? 'Activă' 
                   : reservation.status === 'fulfilled' ? 'Îndeplinită'
                   : reservation.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}