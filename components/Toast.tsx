'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@/components/ui/Icon'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info'
  title: string
  message?: string
}

interface ToastProps {
  toast: ToastMessage
  onClose: (id: string) => void
}

function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id)
    }, 4000)

    return () => clearTimeout(timer)
  }, [toast.id, onClose])

  const bgColors = {
    success: 'bg-system-green',
    error: 'bg-system-red',
    info: 'bg-system-blue'
  }

  const icons = {
    success: 'check',
    error: 'x',
    info: 'info'
  }

  return (
    <div
      className={`${bgColors[toast.type]} text-white rounded-ios-lg shadow-ios-lg p-3 sm:p-4 w-full animate-slide-up`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
          <Icon name={icons[toast.type]} size="sm" />
        </div>
        <div className="flex-1">
          <p className="font-medium">{toast.title}</p>
          {toast.message && (
            <p className="text-sm opacity-90 mt-1">{toast.message}</p>
          )}
        </div>
        <button
          onClick={() => onClose(toast.id)}
          className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        >
          <Icon name="x" size="sm" />
        </button>
      </div>
    </div>
  )
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    const handleToast = (event: CustomEvent<ToastMessage>) => {
      setToasts(prev => [...prev, event.detail])
    }

    window.addEventListener('show-toast' as any, handleToast)
    return () => window.removeEventListener('show-toast' as any, handleToast)
  }, [])

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 space-y-2 max-w-sm mx-auto sm:mx-0">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  )
}

// Helper function to show toast
export function showToast(type: ToastMessage['type'], title: string, message?: string) {
  const toast: ToastMessage = {
    id: Date.now().toString(),
    type,
    title,
    message
  }

  window.dispatchEvent(new CustomEvent('show-toast', { detail: toast }))
}