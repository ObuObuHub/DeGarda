'use client'

import { ReactNode } from 'react'
import { MobileNavigation } from '@/components/MobileNavigation'
import { AuthUser } from '@/components/withAuth'

interface MobileLayoutProps {
  user: AuthUser
  children: ReactNode
}

export function MobileLayout({ user, children }: MobileLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="pb-16 sm:pb-16 md:pb-0">
        {children}
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation user={user} />
    </div>
  )
}