'use client'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Reservation } from '@/types'

interface MyReservationsProps {
  reservations: Reservation[]
  onViewAll: () => void
}

export function MyReservations({ reservations, onViewAll }: MyReservationsProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Rezervările Mele</h3>
      
      {reservations.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          Nu ai rezervări active
        </p>
      ) : (
        <div className="space-y-2">
          {reservations.slice(0, 3).map((reservation) => (
            <div key={reservation.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div>
                <p className="text-sm font-medium">{formatDate(reservation.shift_date)}</p>
                <p className="text-xs text-gray-600">{reservation.department}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
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
          ))}
          
          {reservations.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewAll}
              className="w-full mt-2"
            >
              Vezi toate ({reservations.length})
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}