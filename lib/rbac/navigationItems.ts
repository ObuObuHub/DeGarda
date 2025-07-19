/**
 * Navigation Items Configuration
 * Defines which navigation items are shown for each role
 */

import { UserRole, NavigationItem } from './types'
import { canAccessRoute } from './routeGuard'

// Define navigation items with their access requirements
const NAVIGATION_ITEMS: NavigationItem[] = [
  // Dashboard
  {
    path: '/dashboard',
    name: 'Dashboard',
    icon: '🏠',
    requiredRole: 'staff'
  },
  
  // Schedule Management
  {
    path: '/schedule',
    name: 'Program',
    icon: '📅',
    requiredRole: 'staff'
  },
  
  // Reservations
  {
    path: '/reservations',
    name: 'Rezervări',
    icon: '📝',
    requiredRole: 'staff'
  },
  
  // Shift Generation (Manager+)
  {
    path: '/generate-shifts',
    name: 'Generare Gărzi',
    icon: '⚙️',
    requiredRole: 'manager'
  },
  
  // Management (Manager+)
  {
    path: '/management',
    name: 'Management',
    icon: '👥',
    requiredRole: 'manager'
  },
  
  // Admin Dashboard
  {
    path: '/admin/dashboard',
    name: 'Admin Dashboard',
    icon: '🔧',
    requiredRole: 'admin'
  },
  
  // Admin Schedule
  {
    path: '/admin/schedule',
    name: 'Admin Program',
    icon: '📋',
    requiredRole: 'admin'
  },
  
  // Admin Panel
  {
    path: '/admin',
    name: 'Administrare',
    icon: '⚡',
    requiredRole: 'admin'
  }
]

export function getAllowedNavItems(userRole: UserRole): NavigationItem[] {
  return NAVIGATION_ITEMS.filter(item => {
    // Check role requirement
    const hasRoleAccess = hasRequiredRole(userRole, item.requiredRole)
    
    // Check route access
    const hasRouteAccess = canAccessRoute(userRole, item.path)
    
    return hasRoleAccess && hasRouteAccess
  })
}

function hasRequiredRole(userRole: UserRole, requiredRole?: UserRole): boolean {
  if (!requiredRole) return true
  
  // Role hierarchy: staff < manager < admin
  const roleHierarchy: Record<UserRole, number> = {
    'staff': 1,
    'manager': 2,
    'admin': 3
  }
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

export function getNavItemByPath(path: string): NavigationItem | undefined {
  return NAVIGATION_ITEMS.find(item => item.path === path)
}

export function isValidNavItem(path: string, userRole: UserRole): boolean {
  const navItem = getNavItemByPath(path)
  if (!navItem) return false
  
  return hasRequiredRole(userRole, navItem.requiredRole) && 
         canAccessRoute(userRole, path)
}

// Get navigation items grouped by category
export function getGroupedNavItems(userRole: UserRole) {
  const allowedItems = getAllowedNavItems(userRole)
  
  return {
    main: allowedItems.filter(item => 
      ['/dashboard', '/schedule', '/reservations'].includes(item.path)
    ),
    management: allowedItems.filter(item => 
      ['/generate-shifts', '/management'].includes(item.path)
    ),
    admin: allowedItems.filter(item => 
      item.path.startsWith('/admin')
    )
  }
}