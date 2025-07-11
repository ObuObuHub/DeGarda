'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useHospital } from '@/contexts/HospitalContext'
import { usePolling } from '@/hooks/usePolling'

export default function SwapsPage() {
  const router = useRouter()
  const { selectedHospitalId } = useHospital()
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [swaps, setSwaps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSwaps = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/swaps?status=${activeTab}&hospitalId=${selectedHospitalId}`)
      const data = await response.json()
      
      if (data.success) {
        setSwaps(data.swaps)
      }
    } catch (error) {
      console.error('Failed to fetch swaps:', error)
    } finally {
      setLoading(false)
    }
  }

  // Use polling hook for auto-refresh
  const { lastUpdate } = usePolling(
    fetchSwaps,
    [activeTab, selectedHospitalId],
    { interval: 30000, enabled: true }
  )

  const handleSwapAction = async (swapId: string, action: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`/api/swaps/${swapId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action })
      })

      if (response.ok) {
        // Refresh swaps
        fetchSwaps()
      }
    } catch (error) {
      console.error('Failed to update swap:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background-secondary p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-label-primary">
              Cereri de Schimb
            </h1>
            <p className="text-label-secondary mt-1">
              Gestionează cererile de schimb de gărzi
            </p>
            <p className="text-xs text-label-tertiary mt-1">
              Actualizat: {lastUpdate.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <Button variant="ghost" onClick={() => router.push('/admin/dashboard')}>
            Înapoi la Panou
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6">
          <button 
            className={`pb-2 border-b-2 ${activeTab === 'pending' ? 'border-system-blue text-system-blue' : 'border-transparent text-label-tertiary'} font-medium`}
            onClick={() => setActiveTab('pending')}
          >
            În Așteptare ({swaps.length})
          </button>
          <button 
            className={`pb-2 border-b-2 ${activeTab === 'approved' ? 'border-system-blue text-system-blue' : 'border-transparent text-label-tertiary'} font-medium`}
            onClick={() => setActiveTab('approved')}
          >
            Aprobate
          </button>
          <button 
            className={`pb-2 border-b-2 ${activeTab === 'rejected' ? 'border-system-blue text-system-blue' : 'border-transparent text-label-tertiary'} font-medium`}
            onClick={() => setActiveTab('rejected')}
          >
            Respinse
          </button>
        </div>

        {/* Swap Requests */}
        <div className="space-y-4">
          {loading ? (
            <Card className="p-8">
              <div className="text-center text-label-tertiary">
                <p>Se încarcă...</p>
              </div>
            </Card>
          ) : swaps.length > 0 ? (
            swaps.map((swap) => (
              <Card key={swap.id}>
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">
                        {swap.from_staff_name} → {swap.to_staff_name || 'Oricine Disponibil'}
                      </h3>
                      <p className="text-sm text-label-secondary mt-1">
                        {new Date(swap.shift_date).toLocaleDateString('ro-RO', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })} • Gardă {swap.shift_type === '24h' ? '24h' : swap.shift_type}
                      </p>
                      <p className="text-sm text-label-tertiary mt-2">
                        Motiv: {swap.reason}
                      </p>
                    </div>
                    <div className="text-sm text-label-tertiary">
                      {new Date(swap.created_at).toLocaleString('ro-RO', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  
                  {activeTab === 'pending' && (
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleSwapAction(swap.id, 'rejected')}
                      >
                        Respinge
                      </Button>
                      <Button 
                        variant="primary" 
                        size="sm"
                        onClick={() => handleSwapAction(swap.id, 'approved')}
                      >
                        Aprobă
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8">
              <div className="text-center text-label-tertiary">
                <p>
                  {activeTab === 'pending' && 'Nu sunt cereri de schimb în așteptare'}
                  {activeTab === 'approved' && 'Nu sunt cereri aprobate'}
                  {activeTab === 'rejected' && 'Nu sunt cereri respinse'}
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}