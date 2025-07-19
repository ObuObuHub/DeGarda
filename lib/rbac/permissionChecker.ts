/**
 * Permission Checking Logic
 * Core functions for checking user permissions
 */

import { UserRole, Permission, User } from './types'
import { getRolePermissions } from './roles'

export function hasPermission(
  userRole: UserRole,
  requiredPermission: Permission,
  user?: User,
  resource?: any
): boolean {
  const userPermissions = getRolePermissions(userRole)
  
  const hasBasicPermission = userPermissions.some(
    p => p.resource === requiredPermission.resource && 
         p.action === requiredPermission.action
  )
  
  if (!hasBasicPermission) {
    return false
  }
  
  // Check condition if it exists
  if (requiredPermission.condition && user && resource) {
    return requiredPermission.condition(user, resource)
  }
  
  return true
}

export function hasAnyPermission(
  userRole: UserRole,
  permissions: Permission[]
): boolean {
  return permissions.some(permission => hasPermission(userRole, permission))
}

export function hasAllPermissions(
  userRole: UserRole,
  permissions: Permission[]
): boolean {
  return permissions.every(permission => hasPermission(userRole, permission))
}

export function canManageStaff(
  userRole: UserRole,
  targetStaffRole?: UserRole
): boolean {
  // Only managers and admins can manage staff
  if (userRole === 'staff') {
    return false
  }
  
  // Admins can manage anyone
  if (userRole === 'admin') {
    return true
  }
  
  // Managers can only manage staff (not other managers or admins)
  if (userRole === 'manager') {
    return !targetStaffRole || targetStaffRole === 'staff'
  }
  
  return false
}

export function canGenerateShiftsForDepartment(
  userRole: UserRole,
  userDepartment?: string,
  targetDepartment?: string
): boolean {
  // Admins can generate for any department
  if (userRole === 'admin') {
    return true
  }
  
  // Managers can generate for their hospital
  if (userRole === 'manager') {
    return true
  }
  
  // Staff with special permissions can generate for their department only
  if (userRole === 'staff' && userDepartment && targetDepartment) {
    return userDepartment === targetDepartment
  }
  
  return false
}

export function canAccessHospitalData(
  userRole: UserRole,
  userHospitalId: string,
  targetHospitalId: string
): boolean {
  // Admins can access all hospitals
  if (userRole === 'admin') {
    return true
  }
  
  // Managers and staff can only access their own hospital
  return userHospitalId === targetHospitalId
}

export function canModifyShift(
  userRole: UserRole,
  shiftOwnerId?: string,
  userId?: string
): boolean {
  // Admins and managers can modify any shift
  if (userRole === 'admin' || userRole === 'manager') {
    return true
  }
  
  // Staff can only modify their own shifts
  if (userRole === 'staff' && shiftOwnerId && userId) {
    return shiftOwnerId === userId
  }
  
  return false
}