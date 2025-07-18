import { useEffect, useCallback, useRef } from 'react'
import { useData } from '@/contexts/DataContext'

interface UseRealtimeSyncOptions {
  userId?: string
  hospitalId?: string
  year?: number
  month?: number
  interval?: number
}

export const useRealtimeSync = ({
  userId,
  hospitalId,
  year,
  month,
  interval = 30000 // 30 seconds default
}: UseRealtimeSyncOptions) => {
  const { 
    loadShifts, 
    loadNotifications, 
    autoRefresh,
    addNotification 
  } = useData()
  
  const lastSyncRef = useRef<Date>(new Date())
  
  // Sync function
  const syncData = useCallback(async (silent = true) => {
    try {
      const promises: Promise<void>[] = []
      
      // Sync shifts if we have the required params
      if (year !== undefined && month !== undefined) {
        promises.push(loadShifts(year, month, hospitalId))
      }
      
      // Sync notifications if we have a user ID
      if (userId) {
        promises.push(loadNotifications(userId))
      }
      
      await Promise.all(promises)
      lastSyncRef.current = new Date()
    } catch (error) {
      console.error('Sync error:', error)
      if (!silent) {
        addNotification('Failed to sync data', 'error')
      }
    }
  }, [year, month, hospitalId, userId, loadShifts, loadNotifications, addNotification])

  // Set up periodic sync
  useEffect(() => {
    if (!autoRefresh) return

    // Initial sync
    syncData(false)

    // Set up interval
    const syncInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncData(true)
      }
    }, interval)

    return () => clearInterval(syncInterval)
  }, [autoRefresh, interval, syncData])

  // Sync when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && autoRefresh) {
        // Only sync if it's been more than 5 seconds since last sync
        const timeSinceLastSync = Date.now() - lastSyncRef.current.getTime()
        if (timeSinceLastSync > 5000) {
          syncData(true)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [autoRefresh, syncData])

  // Return manual sync function and last sync time
  return {
    syncData: () => syncData(false),
    lastSync: lastSyncRef.current
  }
}