'use client'

import React, { useState, useEffect } from 'react'

interface PollingIndicatorProps {
  lastUpdate: Date
  interval: number // in milliseconds
}

export const PollingIndicator: React.FC<PollingIndicatorProps> = ({ lastUpdate, interval }) => {
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    setIsRefreshing(true)
    const timeout = setTimeout(() => setIsRefreshing(false), 1000)
    return () => clearTimeout(timeout)
  }, [lastUpdate])

  const nextUpdate = new Date(lastUpdate.getTime() + interval)
  const timeUntilNext = Math.max(0, nextUpdate.getTime() - Date.now())
  const secondsUntilNext = Math.ceil(timeUntilNext / 1000)

  return (
    <div className="flex items-center gap-2 text-xs text-label-tertiary">
      <div className={`w-2 h-2 rounded-full transition-all ${
        isRefreshing ? 'bg-system-green animate-pulse' : 'bg-gray-300'
      }`} />
      <span>
        Actualizare automată în {secondsUntilNext}s
      </span>
    </div>
  )
}