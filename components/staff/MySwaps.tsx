'use client'

import { Card } from '@/components/ui/Card'
import { SwapRequest } from '@/types'

interface MySwapsProps {
  swaps: SwapRequest[]
}

export function MySwaps({ swaps }: MySwapsProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'În așteptare'
      case 'approved':
        return 'Aprobat'
      case 'rejected':
        return 'Respins'
      default:
        return status
    }
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Schimburile Mele</h3>
      
      {swaps.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          Nu ai cereri de schimb
        </p>
      ) : (
        <div className="space-y-2">
          {swaps.slice(0, 3).map((swap) => (
            <div key={swap.id} className="p-2 bg-gray-50 rounded">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium">{formatDate(swap.shift_date)}</p>
                <span className={`text-xs px-2 py-1 rounded ${getStatusColor(swap.status)}`}>
                  {getStatusText(swap.status)}
                </span>
              </div>
              <p className="text-xs text-gray-600">{swap.reason}</p>
              {swap.to_staff_name && (
                <p className="text-xs text-gray-500">
                  Către: {swap.to_staff_name}
                </p>
              )}
            </div>
          ))}
          
          {swaps.length > 3 && (
            <p className="text-xs text-gray-500 text-center mt-2">
              +{swaps.length - 3} mai multe
            </p>
          )}
        </div>
      )}
    </Card>
  )
}