'use client'

import { createContext, useContext, useCallback, useState, ReactNode, createElement } from 'react'
import { ToastContainer, ToastItem, ToastVariant } from '@/components/ui/Toast'

interface ToastContextValue {
  toast: {
    success: (message: string, duration?: number) => void
    error: (message: string, duration?: number) => void
    warning: (message: string, duration?: number) => void
    info: (message: string, duration?: number) => void
  }
}

const ToastContext = createContext<ToastContextValue | null>(null)

let toastId = 0
const generateId = () => `toast-${++toastId}`

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((message: string, variant: ToastVariant, duration?: number) => {
    const id = generateId()
    setToasts(prev => [...prev, { id, message, variant, duration }])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = {
    success: (message: string, duration?: number) => addToast(message, 'success', duration),
    error: (message: string, duration?: number) => addToast(message, 'error', duration),
    warning: (message: string, duration?: number) => addToast(message, 'warning', duration),
    info: (message: string, duration?: number) => addToast(message, 'info', duration)
  }

  return createElement(
    ToastContext.Provider,
    { value: { toast } },
    children,
    createElement(ToastContainer, { toasts, onDismiss: dismissToast })
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export default useToast
