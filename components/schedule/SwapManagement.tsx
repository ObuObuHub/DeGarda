'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { logger } from '@/lib/logger'
import { showToast } from '@/components/Toast'
import { SwapRequest } from '@/types'

interface SwapManagementProps {
  hospitalId: string
  userRole: string
}

export function SwapManagement({ hospitalId, userRole }: SwapManagementProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [swaps, setSwaps] = useState<SwapRequest[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (hospitalId && userRole === 'manager') {
      loadSwaps()
    }
  }, [hospitalId, activeTab, userRole])

  const loadSwaps = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/swaps?status=${activeTab}&hospitalId=${hospitalId}`)
      const data = await response.json()
      if (data.success) {
        setSwaps(data.swaps || [])
      } else {
        showToast('error', data.error || 'Failed to load swap requests')
      }
    } catch (error) {
      logger.error('SwapManagement', 'Failed to load swaps', error)
      showToast('error', 'Failed to load swap requests')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSwapAction = async (swapId: number, action: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`/api/swaps/${swapId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: action })
      })

      const data = await response.json()
      if (data.success) {
        showToast('success', `Cerere ${action === 'approved' ? 'aprobată' : 'respinsă'} cu succes!`)
        loadSwaps() // Reload to update the list
      } else {
        showToast('error', data.error || 'Failed to update swap request')
      }
    } catch (error) {
      logger.error('SwapManagement', `Failed to ${action} swap`, error)
      showToast('error', 'Failed to update swap request')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  if (userRole !== 'manager') {
    return null
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Management Schimburi</h2>
      </div>
      
      {/* Status Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'pending'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          În Așteptare ({swaps.filter(s => s.status === 'pending').length})
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'approved'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Aprobate
        </button>
        <button
          onClick={() => setActiveTab('rejected')}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'rejected'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Respinse
        </button>
      </div>

      {/* Swaps List */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">
          Se încarcă cererile...
        </div>
      ) : swaps.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Nu există cereri de schimb {
            activeTab === 'pending' ? 'în așteptare' : 
            activeTab === 'approved' ? 'aprobate' : 
            'respinse'
          }
        </div>
      ) : (
        <div className="space-y-4">
          {swaps.map((swap) => (
            <div key={swap.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h4 className="font-medium text-gray-900">{swap.from_staff_name}</h4>
                    {swap.to_staff_name && (
                      <>
                        <span className="text-gray-400">→</span>
                        <span className="text-gray-700">{swap.to_staff_name}</span>
                      </>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>Data:</strong> {formatDate(swap.shift_date)}
                  </div>
                  
                  {swap.reason && (
                    <div className="text-sm text-gray-600 mb-2">
                      <strong>Motiv:</strong> {swap.reason}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500">
                    Cerere creată: {formatDate(swap.created_at)}
                  </div>
                </div>

                {/* Action Buttons for Pending Swaps */}
                {activeTab === 'pending' && (
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSwapAction(swap.id, 'approved')}
                    >
                      ✅ Aprobă
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleSwapAction(swap.id, 'rejected')}
                    >
                      ❌ Respinge
                    </Button>
                  </div>
                )}

                {/* Status Badge for Non-Pending */}
                {activeTab !== 'pending' && (
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    swap.status === 'approved' 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {swap.status === 'approved' ? 'Aprobat' : 'Respins'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}