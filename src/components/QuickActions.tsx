'use client'

import { useState } from 'react'
import { type User, type SwapRequest } from '@/lib/supabase'

interface QuickActionsProps {
  currentUser: User
  pendingSwapCount: number
  swapRequests: SwapRequest[]
  onOpenHelp: () => void
}

export default function QuickActions({ currentUser, pendingSwapCount, onOpenHelp }: QuickActionsProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <span className="text-lg">Acțiuni Rapide</span>
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Help / How it works */}
        <button
          onClick={onOpenHelp}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors text-purple-700 border border-purple-100"
        >
          <span className="text-2xl">❓</span>
          <span className="text-sm font-medium">Cum funcționează</span>
        </button>

        {/* Pending swaps indicator */}
        {pendingSwapCount > 0 && (
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700">
            <div className="relative">
              <span className="text-2xl">🔔</span>
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {pendingSwapCount}
              </span>
            </div>
            <span className="text-sm font-medium">Cereri de schimb</span>
          </div>
        )}

        {/* My department indicator */}
        {currentUser.department && (
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-700">
            <span className="text-2xl">🏥</span>
            <span className="text-sm font-medium text-center truncate w-full">{currentUser.department}</span>
          </div>
        )}

        {/* Max shifts info */}
        <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-50 border border-green-100 text-green-700">
          <span className="text-2xl">📊</span>
          <span className="text-sm font-medium">Max {currentUser.max_shifts_per_month || 8} ture/lună</span>
        </div>
      </div>
    </div>
  )
}

// Mobile Floating Action Button
interface MobileFABProps {
  onShowMyShifts: () => void
  hasNotifications: boolean
}

export function MobileFAB({ onShowMyShifts, hasNotifications }: MobileFABProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="fixed bottom-6 right-6 z-30 md:hidden">
      {/* Expanded menu */}
      {isExpanded && (
        <>
          <div
            className="fixed inset-0 bg-black/20"
            onClick={() => setIsExpanded(false)}
          />
          <div className="absolute bottom-16 right-0 flex flex-col gap-3 items-end animate-in">
            <button
              onClick={() => {
                onShowMyShifts()
                setIsExpanded(false)
              }}
              className="flex items-center gap-2 bg-white px-4 py-3 rounded-full shadow-lg border"
            >
              <span>📅</span>
              <span className="text-sm font-medium">Turele mele</span>
            </button>
          </div>
        </>
      )}

      {/* Main FAB button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
          isExpanded ? 'bg-gray-800 rotate-45' : 'bg-blue-600'
        }`}
      >
        <span className="text-white text-2xl">{isExpanded ? '+' : '☰'}</span>
        {hasNotifications && !isExpanded && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full" />
        )}
      </button>
    </div>
  )
}

// Help Modal Component
interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null

  const steps = [
    {
      icon: '📅',
      title: 'Calendarul',
      description: 'Calendarul arată turele pentru luna selectată. Turele tale sunt evidențiate cu galben.'
    },
    {
      icon: '💚',
      title: 'Preferințe',
      description: 'Apasă pe o zi goală și alege "Prefer să lucrez" sau "Indisponibil" pentru a-ți seta preferințele.'
    },
    {
      icon: '⭐',
      title: 'Rezervări',
      description: 'Poți rezerva maxim 2 ture pe lună. Rezervările vor fi confirmate de manager.'
    },
    {
      icon: '↔️',
      title: 'Schimb de ture',
      description: 'Dacă ai o tură și vrei să o schimbi, apasă pe ea și alege "Solicită schimb".'
    },
    {
      icon: '🔔',
      title: 'Notificări',
      description: 'Vei primi notificări pentru cereri de schimb și ture disponibile.'
    },
    {
      icon: '⏰',
      title: 'Termene limită',
      description: 'Uneori managerul setează un termen limită pentru preferințe. Verifică banner-ul portocaliu.'
    }
  ]

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-white rounded-2xl shadow-xl z-50 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <h2 className="text-lg font-bold">Cum folosești aplicația</h2>
          <p className="text-blue-100 text-sm mt-1">Ghid rapid pentru personal medical</p>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={index} className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">{step.icon}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{step.title}</h3>
                  <p className="text-sm text-gray-600 mt-0.5">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Am înțeles!
          </button>
        </div>
      </div>
    </>
  )
}
