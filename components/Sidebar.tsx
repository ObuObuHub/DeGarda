'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { useHospital } from '@/contexts/HospitalContext'
import { useEffect, useState } from 'react'
import { getAllowedNavItems, UserRole } from '@/lib/roleBasedAccess'
import { logger } from '@/lib/logger'

interface NavItem {
  label: string
  href: string
  icon: string
}

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { selectedHospital } = useHospital()
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [navItems, setNavItems] = useState<NavItem[]>([])

  useEffect(() => {
    // Get user role from auth token
    const token = localStorage.getItem('authToken')
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]))
        const role = decoded.role as UserRole
        setUserRole(role)
        
        // Get allowed navigation items for this role
        const allowedItems = getAllowedNavItems(role)
        setNavItems(allowedItems)
      } catch (error) {
        logger.error('Sidebar', 'Failed to decode token', error)
      }
    }
  }, [])

  return (
    <aside className="w-64 bg-white border-r border-separator h-full flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-separator flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-label-primary">DeGarda</h1>
          <p className="text-sm text-label-secondary mt-1">v2.0</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-ios transition-colors"
          >
            <Icon name="close" size="md" />
          </button>
        )}
      </div>

      {/* Current Hospital Display */}
      {selectedHospital && (
        <div className="p-4 border-b border-separator bg-gray-50">
          <label className="text-xs font-medium text-label-secondary mb-2 block uppercase tracking-wider">Spital Activ</label>
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏥</span>
              <div>
                <p className="text-sm font-medium text-label-primary">{selectedHospital.name}</p>
                <p className="text-xs text-label-tertiary">{selectedHospital.city}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <button
                  onClick={() => router.push(item.href)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-ios text-sm font-medium
                    transition-all duration-200
                    ${isActive 
                      ? 'bg-system-blue text-white' 
                      : 'text-label-primary hover:bg-system-gray-6/10'
                    }
                  `}
                >
                  <Icon name={item.icon} size="md" />
                  <span>{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-separator">
        <button
          onClick={() => {
            localStorage.removeItem('selectedHospitalId')
            sessionStorage.removeItem('selectedHospitalId')
            router.push('/')
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-ios text-sm font-medium text-label-primary hover:bg-system-gray-6/10 transition-all duration-200"
        >
          <Icon name="logout" size="md" />
          <span>Deconectare</span>
        </button>
      </div>
    </aside>
  )
}