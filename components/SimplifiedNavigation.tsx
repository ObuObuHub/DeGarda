'use client'

import { useRouter, usePathname } from 'next/navigation'
import { AuthUser } from '@/components/withAuth'

interface SimplifiedNavigationProps {
  user: AuthUser
}

interface NavItem {
  id: string
  label: string
  icon: string
  path: string
}

export function SimplifiedNavigation({ user }: SimplifiedNavigationProps) {
  const router = useRouter()
  const pathname = usePathname()

  // Define navigation items based on role
  const getNavItems = (): NavItem[] => {
    const baseItems: NavItem[] = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: '🏠',
        path: '/dashboard'
      }
    ]

    // Add role-specific items
    switch (user?.role) {
      case 'staff':
        // Staff only needs dashboard - everything is integrated there
        return baseItems

      case 'manager':
        return [
          ...baseItems,
          {
            id: 'generate',
            label: 'Generate',
            icon: '⚡',
            path: '/generate-shifts'
          }
        ]

      case 'admin':
        return [
          ...baseItems,
          {
            id: 'admin',
            label: 'Admin',
            icon: '👑',
            path: '/admin'
          },
          {
            id: 'generate',
            label: 'Generate',
            icon: '⚡',
            path: '/generate-shifts'
          }
        ]

      default:
        return baseItems
    }
  }

  const navItems = getNavItems()

  const isActive = (path: string) => {
    return pathname === path || (path !== '/dashboard' && pathname.startsWith(path))
  }

  const handleLogout = () => {
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
    router.push('/login')
  }

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 sm:hidden">
        <div className="flex">
          {navItems.map((item) => (
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
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </div>
            </button>
          ))}
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex-1 py-3 px-2 text-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <div className="flex flex-col items-center space-y-1">
              <span className="text-xl">🚪</span>
              <span className="text-xs font-medium">Exit</span>
            </div>
          </button>
        </div>
      </div>

      {/* Desktop Top Navigation Bar (Optional) */}
      <div className="hidden sm:block fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🏥</span>
                <span className="text-xl font-bold text-gray-900">DeGarda</span>
              </div>
              
              <nav className="flex space-x-4">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => router.push(item.path)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{user?.name}</div>
                <div className="text-xs text-gray-600 capitalize">{user?.role}</div>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                🚪 Exit
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}