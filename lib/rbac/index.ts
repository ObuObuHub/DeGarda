/**
 * Role-Based Access Control (RBAC) System
 * 
 * A modular, focused approach to managing permissions and access control.
 * Replaces the monolithic roleBasedAccess.ts with clean, testable modules.
 */

// Export all types
export * from './types'

// Export permissions
export * from './permissions'

// Export roles
export * from './roles'

// Export permission checking functions
export * from './permissionChecker'

// Export route guards
export * from './routeGuard'

// Export navigation items
export * from './navigationItems'

// Re-export commonly used functions for backward compatibility
export {
  hasPermission,
  canManageStaff,
  canGenerateShiftsForDepartment,
  canAccessHospitalData,
  canModifyShift
} from './permissionChecker'

export {
  canAccessRoute,
  getDefaultRouteForRole,
  isProtectedRoute
} from './routeGuard'

export {
  getAllowedNavItems,
  getGroupedNavItems
} from './navigationItems'

export {
  getRolePermissions,
  getRoleHierarchy,
  isRoleHigherThan
} from './roles'

export {
  PERMISSIONS,
  getPermission,
  isValidPermission
} from './permissions'