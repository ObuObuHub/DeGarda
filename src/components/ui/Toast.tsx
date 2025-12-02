'use client'

import { useEffect, useState, useCallback } from 'react'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
  duration?: number
}

interface ToastProps {
  toast: ToastItem
  onDismiss: (id: string) => void
}

const variantStyles: Record<ToastVariant, { bg: string; icon: string; border: string }> = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: '✓'
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: '✕'
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    icon: '!'
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'ℹ'
  }
}

const variantIconColors: Record<ToastVariant, string> = {
  success: 'bg-green-500 text-white',
  error: 'bg-red-500 text-white',
  warning: 'bg-yellow-500 text-white',
  info: 'bg-blue-500 text-white'
}

function Toast({ toast, onDismiss }: ToastProps) {
  const [progress, setProgress] = useState(100)
  const [isExiting, setIsExiting] = useState(false)
  const duration = toast.duration ?? 4000

  const handleDismiss = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => onDismiss(toast.id), 200)
  }, [onDismiss, toast.id])

  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)

      if (remaining <= 0) {
        clearInterval(interval)
        handleDismiss()
      }
    }, 50)

    return () => clearInterval(interval)
  }, [duration, handleDismiss])

  const styles = variantStyles[toast.variant]
  const iconColor = variantIconColors[toast.variant]

  return (
    <div
      className={`
        ${styles.bg} ${styles.border} border rounded-lg shadow-lg
        p-4 pr-10 min-w-[280px] max-w-[400px] relative overflow-hidden
        transform transition-all duration-200 ease-out
        ${isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className={`${iconColor} w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0`}>
          {styles.icon}
        </span>
        <p className="text-sm text-gray-800 leading-snug">{toast.message}</p>
      </div>

      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors p-1"
        aria-label="Închide notificarea"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
        <div
          className={`h-full transition-all duration-50 ${
            toast.variant === 'success' ? 'bg-green-500' :
            toast.variant === 'error' ? 'bg-red-500' :
            toast.variant === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div
      className="fixed z-50 flex flex-col gap-2 pointer-events-none
        bottom-4 right-4 left-4 sm:left-auto sm:right-4 items-center sm:items-end"
      aria-label="Notificări"
    >
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  )
}

export default Toast
