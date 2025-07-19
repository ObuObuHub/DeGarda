/**
 * Client-side authentication utilities
 * Separated from server-side middleware to avoid import conflicts
 */

import { UserRole } from './rbac'

/**
 * Client-side role validation helper
 */
export function validateClientRole(requiredRole: UserRole): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const token = localStorage.getItem('authToken')
    if (!token) return false
    
    const decoded = JSON.parse(atob(token.split('.')[1]))
    const userRole = decoded.role as UserRole
    
    const roleHierarchy: Record<UserRole, number> = {
      'staff': 1,
      'manager': 2,
      'admin': 3
    }
    
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
  } catch (error) {
    console.error('Client role validation failed:', error)
    return false
  }
}

/**
 * Get user role from client-side token
 */
export function getClientUserRole(): UserRole | null {
  if (typeof window === 'undefined') return null
  
  try {
    const token = localStorage.getItem('authToken')
    if (!token) return null
    
    const decoded = JSON.parse(atob(token.split('.')[1]))
    return decoded.role as UserRole
  } catch (error) {
    console.error('Failed to get client user role:', error)
    return null
  }
}

/**
 * Check if user has access to a specific page route
 */
export function checkPageAccess(userRole: UserRole, route: string): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    'staff': 1,
    'manager': 2,
    'admin': 3
  }
  
  const routeRequirements: Record<string, { role: UserRole, level: number }> = {
    '/admin/dashboard': { role: 'staff', level: 1 },
    '/admin/schedule': { role: 'staff', level: 1 },
    '/admin/staff': { role: 'manager', level: 2 },
    '/admin/hospitals': { role: 'admin', level: 3 },
    '/admin/access-codes': { role: 'manager', level: 2 },
    '/admin/swaps': { role: 'staff', level: 1 },
    '/admin/settings': { role: 'manager', level: 2 },
    '/staff': { role: 'staff', level: 1 },
    '/staff/schedule': { role: 'staff', level: 1 }
  }
  
  const requirement = routeRequirements[route]
  if (!requirement) {
    return true // No specific requirement
  }
  
  return roleHierarchy[userRole] >= requirement.level
}