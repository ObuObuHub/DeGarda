import { useEffect, useState, useRef } from 'react'

interface UsePollingOptions {
  interval?: number // milliseconds
  enabled?: boolean
}

export function usePolling(
  callback: () => void | Promise<void>,
  deps: React.DependencyList,
  options: UsePollingOptions = {}
) {
  const { interval = 30000, enabled = true } = options
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const callbackRef = useRef(callback)

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Initial call
  useEffect(() => {
    if (enabled) {
      callbackRef.current()
    }
  }, [...deps, enabled])

  // Polling interval
  useEffect(() => {
    if (!enabled) return

    const intervalId = setInterval(() => {
      callbackRef.current()
      setLastUpdate(new Date())
    }, interval)

    return () => clearInterval(intervalId)
  }, [...deps, interval, enabled])

  return { lastUpdate }
}