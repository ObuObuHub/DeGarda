'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { logger } from '@/lib/logger'

interface SwapRequest {
  id: number
  from_staff_id: number
  to_staff_id: number | null
  shift_id: number
  reason: string
  status: string
  created_at: string
  shift_date: string
  shift_type: string
  from_staff_name: string
  to_staff_name: string | null
}

interface PendingSwapApprovalsProps {
  user: any
  onSwapAction?: () => void
}

export function PendingSwapApprovals({ user, onSwapAction }: PendingSwapApprovalsProps) {
  const router = useRouter()
  const [pendingSwaps, setPendingSwaps] = useState<SwapRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user && (user.role === 'manager' || user.role === 'admin')) {
      fetchPendingSwaps()
    }
  }, [user])

  const fetchPendingSwaps = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/swaps?status=pending&hospitalId=${user?.hospitalId}`, {
        credentials: 'include'
      })
      const data = await response.json()
      
      if (data.success && data.swaps) {
        setPendingSwaps(data.swaps)
      }
    } catch (error) {
      logger.error('PendingSwapApprovals', 'Failed to fetch pending swaps', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSwapAction = async (swapId: number, action: 'approved' | 'rejected') => {
    if (!user) return

    try {
      const response = await fetch(`/api/swaps/${swapId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          status: action,
          reviewedBy: user.userId 
        })
      })

      const data = await response.json()

      if (data.success) {
        // Refresh local data
        await fetchPendingSwaps()
        // Notify parent component
        onSwapAction?.()
        logger.info('PendingSwapApprovals', `Swap ${action}`, { swapId, userId: user.userId })
      } else {
        logger.error('PendingSwapApprovals', `Failed to ${action} swap`, { error: data.error, swapId })
      }
    } catch (error) {
      logger.error('PendingSwapApprovals', `Failed to ${action} swap`, error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  // Don't show if user is not manager/admin or no pending swaps
  if (!user || (user.role !== 'manager' && user.role !== 'admin') || pendingSwaps.length === 0) {
    return null
  }

  if (isLoading) {
    return (
      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Cereri Schimb în Așteptare
          </h2>
        </div>
        <div className="text-center py-8 text-gray-500">
          Se încarcă...
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Cereri Schimb în Așteptare ({pendingSwaps.length})
        </h2>
        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
          <span className="text-lg">⏳</span>
        </div>
      </div>
      
      <div className="space-y-4">
        {pendingSwaps.slice(0, 5).map((swap) => (
          <div
            key={swap.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
          >
            <div className="flex-1">
              <div className="flex items-center space-x-4">
                <div>
                  <p className="font-medium text-gray-900">
                    {swap.from_staff_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    Gardă {formatDate(swap.shift_date)} • {swap.shift_type}
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Motiv:</span> {swap.reason}
                  </p>
                  {swap.to_staff_name && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Către:</span> {swap.to_staff_name}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 ml-4">
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleSwapAction(swap.id, 'approved')}
              >
                Aprobă
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleSwapAction(swap.id, 'rejected')}
              >
                Respinge
              </Button>
            </div>
          </div>
        ))}
        
        {pendingSwaps.length > 5 && (
          <div className="text-center pt-4">
            <Button
              variant="secondary"
              onClick={() => router.push('/admin/schedule?tab=swaps')}
            >
              Vezi toate ({pendingSwaps.length - 5} mai multe)
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}