/**
 * Route Access Control
 * Determines which routes users can access based on their role
 */

import { UserRole } from './types'

// Route access definitions
const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  // Public routes (no authentication required)
  '/': ['staff', 'manager', 'admin'],
  '/login': ['staff', 'manager', 'admin'], // Anyone can access login
  
  // Staff routes
  '/dashboard': ['staff', 'manager', 'admin'],
  '/schedule': ['staff', 'manager', 'admin'],
  '/reservations': ['staff', 'manager', 'admin'],
  '/staff/schedule': ['staff', 'manager', 'admin'],
  '/staff/reservations': ['staff', 'manager', 'admin'],
  
  // Manager routes
  '/management': ['manager', 'admin'],
  '/generate-shifts': ['manager', 'admin'],
  '/staff/generate-shifts': ['staff', 'manager', 'admin'], // Staff with special permissions
  
  // Admin routes
  '/admin': ['admin'],
  '/admin/dashboard': ['admin'],
  '/admin/schedule': ['admin'],
  '/admin/staff': ['admin'],
  '/admin/hospitals': ['admin'],
  '/admin/system': ['admin'],
  
  // API routes
  '/api/auth/*': ['staff', 'manager', 'admin'],
  '/api/staff': ['manager', 'admin'],
  '/api/shifts': ['staff', 'manager', 'admin'],
  '/api/hospitals': ['admin'],
  '/api/swaps': ['staff', 'manager', 'admin'],
  '/api/reservations': ['staff', 'manager', 'admin'],
  '/api/admin/*': ['admin']
}

export function canAccessRoute(userRole: UserRole, route: string): boolean {
  // Check exact route match first
  const allowedRoles = ROUTE_PERMISSIONS[route]
  if (allowedRoles) {
    return allowedRoles.includes(userRole)
  }
  
  // Check wildcard routes
  for (const [routePattern, roles] of Object.entries(ROUTE_PERMISSIONS)) {
    if (routePattern.includes('*')) {
      const baseRoute = routePattern.replace('/*', '')
      if (route.startsWith(baseRoute)) {
        return roles.includes(userRole)
      }
    }
  }
  
  // Default: if route not defined, only admins can access
  return userRole === 'admin'
}

export function getAccessibleRoutes(userRole: UserRole): string[] {
  const accessibleRoutes: string[] = []
  
  for (const [route, allowedRoles] of Object.entries(ROUTE_PERMISSIONS)) {
    if (allowedRoles.includes(userRole)) {
      accessibleRoutes.push(route)
    }
  }
  
  return accessibleRoutes
}

export function isProtectedRoute(route: string): boolean {
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/']
  return !publicRoutes.includes(route)
}

export function getDefaultRouteForRole(userRole: UserRole): string {
  switch (userRole) {
    case 'admin':
      return '/admin/dashboard'
    case 'manager':
      return '/dashboard'
    case 'staff':
      return '/dashboard'
    default:
      return '/login'
  }
}