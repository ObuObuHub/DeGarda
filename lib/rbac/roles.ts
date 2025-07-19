/**
 * Role Definitions
 * Defines what permissions each role has
 */

import { UserRole, RoleDefinition, Permission } from './types'
import { PERMISSIONS } from './permissions'

// Define base permissions for each role
const STAFF_PERMISSIONS = [
  // Can view their own schedule and shifts
  PERMISSIONS.SCHEDULE_VIEW,
  PERMISSIONS.SHIFT_VIEW,
  
  // Can make reservations
  PERMISSIONS.RESERVATION_VIEW,
  PERMISSIONS.RESERVATION_CREATE,
  PERMISSIONS.RESERVATION_UPDATE,
  PERMISSIONS.RESERVATION_DELETE,
  
  // Can request shift swaps
  PERMISSIONS.SWAP_VIEW,
  PERMISSIONS.SWAP_CREATE,
  
  // Can view notifications
  PERMISSIONS.NOTIFICATION_VIEW,
  
  // Can reserve shifts for themselves
  PERMISSIONS.SHIFT_RESERVE
]

const MANAGER_PERMISSIONS = [
  // All staff permissions
  ...STAFF_PERMISSIONS,
  
  // Additional manager permissions
  PERMISSIONS.STAFF_VIEW,
  PERMISSIONS.STAFF_UPDATE,
  
  // Can manage schedules
  PERMISSIONS.SCHEDULE_CREATE,
  PERMISSIONS.SCHEDULE_UPDATE,
  PERMISSIONS.SCHEDULE_DELETE,
  PERMISSIONS.SCHEDULE_GENERATE,
  
  // Can assign shifts
  PERMISSIONS.SHIFT_ASSIGN,
  PERMISSIONS.SHIFT_CANCEL,
  
  // Can approve/reject swaps
  PERMISSIONS.SWAP_APPROVE,
  PERMISSIONS.SWAP_REJECT,
  
  // Can view reports
  PERMISSIONS.REPORTS_VIEW,
  PERMISSIONS.REPORTS_EXPORT,
  
  // Can send notifications
  PERMISSIONS.NOTIFICATION_SEND
]

const ADMIN_PERMISSIONS = [
  // All manager permissions
  ...MANAGER_PERMISSIONS,
  
  // Additional admin permissions
  PERMISSIONS.STAFF_CREATE,
  PERMISSIONS.STAFF_DELETE,
  
  // Hospital management
  PERMISSIONS.HOSPITAL_VIEW,
  PERMISSIONS.HOSPITAL_CREATE,
  PERMISSIONS.HOSPITAL_UPDATE,
  PERMISSIONS.HOSPITAL_DELETE,
  
  // System administration
  PERMISSIONS.SYSTEM_CONFIG,
  PERMISSIONS.SYSTEM_LOGS,
  PERMISSIONS.SYSTEM_BACKUP,
  
  // Full notification management
  PERMISSIONS.NOTIFICATION_MANAGE
]

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  staff: {
    name: 'staff',
    permissions: STAFF_PERMISSIONS
  },
  
  manager: {
    name: 'manager',
    permissions: MANAGER_PERMISSIONS,
    inherits: ['staff']
  },
  
  admin: {
    name: 'admin',
    permissions: ADMIN_PERMISSIONS,
    inherits: ['manager', 'staff']
  }
}

export function getRolePermissions(role: UserRole): Permission[] {
  const roleDefinition = ROLE_DEFINITIONS[role]
  if (!roleDefinition) {
    throw new Error(`Invalid role: ${role}`)
  }
  
  return roleDefinition.permissions
}

export function getRoleHierarchy(role: UserRole): UserRole[] {
  const roleDefinition = ROLE_DEFINITIONS[role]
  const hierarchy: UserRole[] = [role]
  
  if (roleDefinition.inherits) {
    for (const inheritedRole of roleDefinition.inherits) {
      hierarchy.push(...getRoleHierarchy(inheritedRole))
    }
  }
  
  return [...new Set(hierarchy)] // Remove duplicates
}

export function isRoleHigherThan(role1: UserRole, role2: UserRole): boolean {
  const hierarchy: UserRole[] = ['staff', 'manager', 'admin']
  const role1Index = hierarchy.indexOf(role1)
  const role2Index = hierarchy.indexOf(role2)
  
  return role1Index > role2Index
}