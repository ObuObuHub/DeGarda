'use client'

import { useRouter, usePathname } from 'next/navigation'
import { AuthUser } from '@/components/withAuth'

interface MobileNavigationProps {
  user: AuthUser
}

interface NavItem {
  id: string
  label: string
  icon: string
  path: string
  roles: string[]
  badge?: number
}

export function MobileNavigation({ user }: MobileNavigationProps) {
  const router = useRouter()
  const pathname = usePathname()

  const isStaff = user?.role === 'staff'
  const isManager = user?.role === 'manager' || user?.role === 'admin'

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '🏠',
      path: '/dashboard',
      roles: ['staff', 'manager', 'admin']
    },
    {
      id: 'reservations',
      label: 'Rezervări',
      icon: '📝',
      path: '/reservations',
      roles: ['staff']
    },
    {
      id: 'schedule',
      label: 'Program',
      icon: '📅',
      path: '/schedule',
      roles: ['staff', 'manager', 'admin']
    },
    {
      id: 'generate',
      label: 'Generează',
      icon: '⚡',
      path: '/generate-shifts',
      roles: ['manager', 'admin']
    },
    {
      id: 'management',
      label: 'Management',
      icon: '⚙️',
      path: '/management',
      roles: ['manager', 'admin']
    }
  ]

  const visibleItems = navItems.filter(item => 
    item.roles.includes(user?.role || '')
  ).slice(0, 5) // Maximum 5 items for mobile

  const isActive = (path: string) => {
    return pathname === path || (path !== '/dashboard' && pathname.startsWith(path))
  }

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 sm:hidden">
        <div className="flex">
          {visibleItems.map((item) => (
            <button
              key={item.id}
              onClick={() => router.push(item.path)}
              className={`flex-1 py-2 px-1 text-center transition-colors ${
                isActive(item.path)
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex flex-col items-center space-y-1">
                <div className="relative">
                  <span className="text-lg">{item.icon}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Spacer */}
      <div className="h-16 sm:hidden"></div>

      {/* Tablet Navigation */}
      <div className="hidden sm:block md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-center">
          <div className="flex max-w-2xl w-full">
            {visibleItems.map((item) => (
              <button
                key={item.id}
                onClick={() => router.push(item.path)}
                className={`flex-1 py-3 px-2 text-center transition-colors ${
                  isActive(item.path)
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex flex-col items-center space-y-1">
                  <div className="relative">
                    <span className="text-xl">{item.icon}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tablet Spacer */}
      <div className="h-16 hidden sm:block md:hidden"></div>
    </>
  )
}