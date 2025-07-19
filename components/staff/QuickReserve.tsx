'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { showToast } from '@/components/Toast'
import { logger } from '@/lib/logger'

interface QuickReserveProps {
  onReservationComplete: () => void
}

export function QuickReserve({ onReservationComplete }: QuickReserveProps) {
  const [quickReserveDate, setQuickReserveDate] = useState('')
  const [quickReserveDept, setQuickReserveDept] = useState('Laborator')
  const [isQuickReserving, setIsQuickReserving] = useState(false)
  const [showQuickReserve, setShowQuickReserve] = useState(false)

  const handleQuickReserve = async () => {
    if (!quickReserveDate || !quickReserveDept) {
      showToast('error', 'Te rog completează toate câmpurile')
      return
    }

    setIsQuickReserving(true)
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          shiftDate: quickReserveDate,
          department: quickReserveDept
        })
      })

      const data = await response.json()
      if (data.success) {
        showToast('success', 'Rezervare creată cu succes!')
        setQuickReserveDate('')
        setShowQuickReserve(false)
        onReservationComplete()
      } else {
        showToast('error', data.error || 'Eroare la crearea rezervării')
      }
    } catch (error) {
      logger.error('QuickReserve', 'Failed to create reservation', error)
      showToast('error', 'Eroare la crearea rezervării')
    } finally {
      setIsQuickReserving(false)
    }
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Rezervare Rapidă</h3>
      
      {!showQuickReserve ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowQuickReserve(true)}
          className="w-full"
        >
          + Rezervă Gardă
        </Button>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Data
            </label>
            <Input
              type="date"
              value={quickReserveDate}
              onChange={(e) => setQuickReserveDate(e.target.value)}
              size="sm"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Departament
            </label>
            <select
              value={quickReserveDept}
              onChange={(e) => setQuickReserveDept(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Laborator">Laborator</option>
              <option value="Urgență">Urgență</option>
              <option value="Chirurgie">Chirurgie</option>
              <option value="Internă">Internă</option>
            </select>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleQuickReserve}
              disabled={isQuickReserving}
              className="flex-1"
            >
              {isQuickReserving ? 'Se rezervă...' : 'Rezervă'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowQuickReserve(false)}
            >
              Anulează
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}