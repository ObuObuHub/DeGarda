'use client'

import { ReactNode } from 'react'
import { SimplifiedNavigation } from '@/components/SimplifiedNavigation'
import { AuthUser } from '@/components/withAuth'

interface SimplifiedLayoutProps {
  user: AuthUser
  children: ReactNode
}

export function SimplifiedLayout({ user, children }: SimplifiedLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop top padding for fixed nav */}
      <div className="hidden sm:block h-16"></div>
      
      {/* Main Content */}
      <div className="pb-20 sm:pb-4">
        {children}
      </div>

      {/* Simplified Navigation */}
      <SimplifiedNavigation user={user} />
    </div>
  )
}