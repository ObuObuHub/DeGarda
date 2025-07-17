'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

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

interface TouchFriendlyApprovalProps {
  swaps: SwapRequest[]
  onApprove: (swapId: number) => void
  onReject: (swapId: number) => void
  formatDate: (dateString: string) => string
}

export function TouchFriendlyApproval({ swaps, onApprove, onReject, formatDate }: TouchFriendlyApprovalProps) {
  const [dragState, setDragState] = useState<{
    swapId: number | null
    direction: 'left' | 'right' | null
    startX: number
    currentX: number
  }>({
    swapId: null,
    direction: null,
    startX: 0,
    currentX: 0
  })

  const handleTouchStart = (e: React.TouchEvent, swapId: number) => {
    const touch = e.touches[0]
    setDragState({
      swapId,
      direction: null,
      startX: touch.clientX,
      currentX: touch.clientX
    })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragState.swapId) return
    
    const touch = e.touches[0]
    const deltaX = touch.clientX - dragState.startX
    const threshold = 50
    
    let direction: 'left' | 'right' | null = null
    if (Math.abs(deltaX) > threshold) {
      direction = deltaX > 0 ? 'right' : 'left'
    }
    
    setDragState(prev => ({
      ...prev,
      currentX: touch.clientX,
      direction
    }))
  }

  const handleTouchEnd = () => {
    if (!dragState.swapId || !dragState.direction) {
      setDragState({ swapId: null, direction: null, startX: 0, currentX: 0 })
      return
    }
    
    const deltaX = dragState.currentX - dragState.startX
    const threshold = 100
    
    if (Math.abs(deltaX) > threshold) {
      if (dragState.direction === 'right') {
        onApprove(dragState.swapId)
      } else {
        onReject(dragState.swapId)
      }
    }
    
    setDragState({ swapId: null, direction: null, startX: 0, currentX: 0 })
  }

  const getSwipeStyle = (swapId: number) => {
    if (dragState.swapId !== swapId) return {}
    
    const deltaX = dragState.currentX - dragState.startX
    const opacity = Math.max(0.3, 1 - Math.abs(deltaX) / 200)
    
    return {
      transform: `translateX(${deltaX}px)`,
      opacity,
      transition: dragState.direction ? 'none' : 'transform 0.2s ease-out'
    }
  }

  const getBackgroundColor = (swapId: number) => {
    if (dragState.swapId !== swapId || !dragState.direction) return 'bg-white'
    
    const deltaX = dragState.currentX - dragState.startX
    const intensity = Math.min(0.3, Math.abs(deltaX) / 300)
    
    if (dragState.direction === 'right') {
      return `bg-green-${Math.round(intensity * 100) + 50}`
    } else {
      return `bg-red-${Math.round(intensity * 100) + 50}`
    }
  }

  if (swaps.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="text-6xl mb-4 block">✅</span>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Nu există cereri în așteptare
        </h3>
        <p className="text-gray-600">
          Toate cererile de schimb au fost procesate.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Instructions for mobile */}
      <div className="bg-blue-50 p-4 rounded-lg sm:hidden">
        <h4 className="font-medium text-blue-900 mb-2">Cum să aprobi/respingi:</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• 👆 Atinge și trage dreapta pentru a aproba</p>
          <p>• 👆 Atinge și trage stânga pentru a respinge</p>
          <p>• 👆 Sau folosește butoanele de mai jos</p>
        </div>
      </div>

      {swaps.map((swap) => (
        <div
          key={swap.id}
          className={`relative overflow-hidden rounded-lg border transition-all ${getBackgroundColor(swap.id)}`}
          onTouchStart={(e) => handleTouchStart(e, swap.id)}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Swipe indicators */}
          <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none">
            <div className={`text-2xl transition-opacity ${
              dragState.swapId === swap.id && dragState.direction === 'right' ? 'opacity-100' : 'opacity-0'
            }`}>
              ✅ Aprobă
            </div>
            <div className={`text-2xl transition-opacity ${
              dragState.swapId === swap.id && dragState.direction === 'left' ? 'opacity-100' : 'opacity-0'
            }`}>
              ❌ Respinge
            </div>
          </div>

          {/* Card content */}
          <Card
            className={`p-4 border-0 ${getBackgroundColor(swap.id)}`}
            style={getSwipeStyle(swap.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">👤</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {swap.from_staff_name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Gardă {formatDate(swap.shift_date)} • {swap.shift_type}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                      <span className="font-medium">Motiv:</span> {swap.reason}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Desktop/Tablet buttons */}
              <div className="flex items-center space-x-2 ml-4">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => onApprove(swap.id)}
                  className="touch-manipulation"
                >
                  ✓ Aprobă
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => onReject(swap.id)}
                  className="touch-manipulation"
                >
                  ✗ Respinge
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ))}
    </div>
  )
}