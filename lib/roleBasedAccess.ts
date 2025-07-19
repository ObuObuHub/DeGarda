/**
 * Role-Based Access Control System for DeGarda
 * Defines permissions and access levels for different user roles
 */

export type UserRole = 'staff' | 'manager' | 'admin'

export interface Permission {
  resource: string
  action: string
  condition?: (user: any, resource: any) => boolean
}

export interface RoleDefinition {
  name: UserRole
  permissions: Permission[]
  inherits?: UserRole[]
}

// Define all available permissions
export const PERMISSIONS = {
  // Staff management
  STAFF_VIEW: { resource: 'staff', action: 'view' },
  STAFF_CREATE: { resource: 'staff', action: 'create' },
  STAFF_UPDATE: { resource: 'staff', action: 'update' },
  STAFF_DELETE: { resource: 'staff', action: 'delete' },
  
  // Schedule management
  SCHEDULE_VIEW: { resource: 'schedule', action: 'view' },
  SCHEDULE_CREATE: { resource: 'schedule', action: 'create' },
  SCHEDULE_UPDATE: { resource: 'schedule', action: 'update' },
  SCHEDULE_DELETE: { resource: 'schedule', action: 'delete' },
  SCHEDULE_GENERATE: { resource: 'schedule', action: 'generate' },
  
  // Shift management
  SHIFT_VIEW: { resource: 'shift', action: 'view' },
  SHIFT_RESERVE: { resource: 'shift', action: 'reserve' },
  SHIFT_ASSIGN: { resource: 'shift', action: 'assign' },
  SHIFT_CANCEL: { resource: 'shift', action: 'cancel' },
  
  // Removed access codes - wrong auth model
  
  // Hospital management
  HOSPITAL_VIEW: { resource: 'hospital', action: 'view' },
  HOSPITAL_CREATE: { resource: 'hospital', action: 'create' },
  HOSPITAL_UPDATE: { resource: 'hospital', action: 'update' },
  HOSPITAL_DELETE: { resource: 'hospital', action: 'delete' },
  
  // Swap requests
  SWAP_VIEW: { resource: 'swap', action: 'view' },
  SWAP_CREATE: { resource: 'swap', action: 'create' },
  SWAP_APPROVE: { resource: 'swap', action: 'approve' },
  SWAP_REJECT: { resource: 'swap', action: 'reject' },
  
  // Removed settings - over-engineering
  
  // Database management
  DATABASE_MANAGE: { resource: 'database', action: 'manage' },
  DATABASE_MIGRATE: { resource: 'database', action: 'migrate' },
  
  // Removed notifications - unused system
} as const

// Define role hierarchies and permissions
export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  staff: {
    name: 'staff',
    permissions: [
      PERMISSIONS.SCHEDULE_VIEW,
      PERMISSIONS.SHIFT_VIEW,
      PERMISSIONS.SHIFT_RESERVE,
      PERMISSIONS.SWAP_VIEW,
      PERMISSIONS.SWAP_CREATE
    ]
  },
  
  manager: {
    name: 'manager',
    inherits: ['staff'],
    permissions: [
      // Staff management
      PERMISSIONS.STAFF_VIEW,
      PERMISSIONS.STAFF_CREATE,
      PERMISSIONS.STAFF_UPDATE,
      
      // Schedule management
      PERMISSIONS.SCHEDULE_CREATE,
      PERMISSIONS.SCHEDULE_UPDATE,
      PERMISSIONS.SCHEDULE_GENERATE,
      
      // Shift management
      PERMISSIONS.SHIFT_ASSIGN,
      PERMISSIONS.SHIFT_CANCEL,
      
      // Swap management
      PERMISSIONS.SWAP_APPROVE,
      PERMISSIONS.SWAP_REJECT
    ]
  },
  
  admin: {
    name: 'admin',
    inherits: ['manager'],
    permissions: [
      // Hospital management
      PERMISSIONS.HOSPITAL_VIEW,
      PERMISSIONS.HOSPITAL_CREATE,
      PERMISSIONS.HOSPITAL_UPDATE,
      PERMISSIONS.HOSPITAL_DELETE,
      
      // Staff management (full)
      PERMISSIONS.STAFF_DELETE,
      
      // Schedule management (full)
      PERMISSIONS.SCHEDULE_DELETE,
      
      // Removed settings - over-engineering
      
      // Database management
      PERMISSIONS.DATABASE_MANAGE,
      PERMISSIONS.DATABASE_MIGRATE
    ]
  }
}

/**
 * Get all permissions for a role (including inherited permissions)
 */
export function getRolePermissions(role: UserRole): Permission[] {
  const roleDefinition = ROLE_DEFINITIONS[role]
  if (!roleDefinition) {
    throw new Error(`Unknown role: ${role}`)
  }
  
  const permissions = [...roleDefinition.permissions]
  
  // Add inherited permissions
  if (roleDefinition.inherits) {
    for (const inheritedRole of roleDefinition.inherits) {
      permissions.push(...getRolePermissions(inheritedRole))
    }
  }
  
  return permissions
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
  userRole: UserRole,
  resource: string,
  action: string,
  user?: any,
  resourceData?: any
): boolean {
  const permissions = getRolePermissions(userRole)
  
  const permission = permissions.find(p => 
    p.resource === resource && p.action === action
  )
  
  if (!permission) {
    return false
  }
  
  // Check condition if provided
  if (permission.condition && user && resourceData) {
    return permission.condition(user, resourceData)
  }
  
  return true
}

/**
 * Check if a manager has permission to manage a specific staff member
 * Managers can only manage staff in their own department
 */
export function canManageStaff(
  managerUser: any,
  targetStaff: any
): boolean {
  // Admin can manage all staff
  if (managerUser.role === 'admin') {
    return true
  }
  
  // Manager can only manage staff in their department
  if (managerUser.role === 'manager') {
    // Must be in same hospital
    if (managerUser.hospitalId !== targetStaff.hospital_id) {
      return false
    }
    
    // Must be in same department (specialization)
    if (managerUser.specialization !== targetStaff.specialization) {
      return false
    }
    
    return true
  }
  
  return false
}

/**
 * Check if a manager can generate shifts for a specific department
 * Managers can only generate shifts for their own department
 */
export function canGenerateShiftsForDepartment(
  managerUser: any,
  targetDepartment: string,
  targetHospitalId: number
): boolean {
  // Admin can generate shifts for any department
  if (managerUser.role === 'admin') {
    return true
  }
  
  // Manager can only generate shifts for their own department
  if (managerUser.role === 'manager') {
    // Must be in same hospital
    if (managerUser.hospitalId !== targetHospitalId) {
      return false
    }
    
    // Must be for their own department
    if (managerUser.specialization !== targetDepartment) {
      return false
    }
    
    return true
  }
  
  return false
}

/**
 * Check if a user can access a specific route
 */
export function canAccessRoute(userRole: UserRole, route: string): boolean {
  const routePermissions: Record<string, Permission[]> = {
    // Unified app routes
    '/dashboard': [PERMISSIONS.SCHEDULE_VIEW],
    '/schedule': [PERMISSIONS.SCHEDULE_VIEW],
    '/management': [PERMISSIONS.STAFF_VIEW],
    '/reservations': [PERMISSIONS.SHIFT_RESERVE],
    '/generate-shifts': [PERMISSIONS.SCHEDULE_GENERATE],
    
    // Legacy routes (deprecated)
    '/admin/dashboard': [PERMISSIONS.SCHEDULE_VIEW],
    '/admin/schedule': [PERMISSIONS.SCHEDULE_VIEW],
    '/admin/management': [PERMISSIONS.STAFF_VIEW],
    '/staff/schedule': [PERMISSIONS.SCHEDULE_VIEW],
    '/staff/reservations': [PERMISSIONS.SHIFT_RESERVE],
    '/staff/generate-shifts': [PERMISSIONS.SCHEDULE_GENERATE]
  }
  
  const requiredPermissions = routePermissions[route]
  if (!requiredPermissions) {
    return true // No specific permissions required
  }
  
  const userPermissions = getRolePermissions(userRole)
  
  return requiredPermissions.every(required =>
    userPermissions.some(userPerm =>
      userPerm.resource === required.resource && userPerm.action === required.action
    )
  )
}

/**
 * Get allowed navigation items for a user role
 */
export function getAllowedNavItems(userRole: UserRole) {
  // Simplified 3-section navigation aligned with objectives
  const allNavItems = [
    { 
      label: 'Dashboard', 
      href: '/dashboard', 
      icon: 'dashboard', 
      permission: PERMISSIONS.SCHEDULE_VIEW,
      description: 'Overview, calendar, and key metrics'
    },
    { 
      label: 'Program Gărzi', 
      href: '/schedule', 
      icon: 'calendar', 
      permission: PERMISSIONS.SCHEDULE_VIEW,
      description: 'Schedule management and shift swaps'
    },
    { 
      label: 'Management', 
      href: '/management', 
      icon: 'users', 
      permission: PERMISSIONS.STAFF_VIEW,
      description: 'Staff and system management'
    },
    { 
      label: 'Hospitals', 
      href: '/admin/hospitals', 
      icon: 'hospital', 
      permission: PERMISSIONS.HOSPITAL_VIEW,
      description: 'Hospital management for admins'
    }
  ]
  
  const userPermissions = getRolePermissions(userRole)
  
  return allNavItems.filter(item =>
    userPermissions.some(userPerm =>
      userPerm.resource === item.permission.resource && userPerm.action === item.permission.action
    )
  )
}

/**
 * Middleware helper to check API route permissions
 */
export function checkAPIPermission(
  userRole: UserRole,
  method: string,
  route: string
): boolean {
  const apiPermissions: Record<string, Record<string, Permission[]>> = {
    '/api/staff': {
      GET: [PERMISSIONS.STAFF_VIEW],
      POST: [PERMISSIONS.STAFF_CREATE],
      PUT: [PERMISSIONS.STAFF_UPDATE],
      DELETE: [PERMISSIONS.STAFF_DELETE]
    },
    '/api/admin/shift-permissions': {
      GET: [PERMISSIONS.STAFF_VIEW],
      POST: [PERMISSIONS.STAFF_UPDATE]
    },
    '/api/hospitals': {
      GET: [PERMISSIONS.HOSPITAL_VIEW],
      POST: [PERMISSIONS.HOSPITAL_CREATE],
      PUT: [PERMISSIONS.HOSPITAL_UPDATE],
      DELETE: [PERMISSIONS.HOSPITAL_DELETE]
    },
    '/api/shifts': {
      GET: [PERMISSIONS.SHIFT_VIEW],
      POST: [PERMISSIONS.SHIFT_ASSIGN],
      PUT: [PERMISSIONS.SHIFT_ASSIGN],
      DELETE: [PERMISSIONS.SHIFT_CANCEL]
    },
    '/api/shifts/generate': {
      POST: [PERMISSIONS.SCHEDULE_GENERATE]
    },
    '/api/reservations': {
      GET: [PERMISSIONS.SHIFT_VIEW],
      POST: [PERMISSIONS.SHIFT_RESERVE],
      DELETE: [PERMISSIONS.SHIFT_RESERVE]
    }
  }
  
  const routePermissions = apiPermissions[route]
  if (!routePermissions) {
    return true // No specific permissions required
  }
  
  const methodPermissions = routePermissions[method]
  if (!methodPermissions) {
    return true // No specific permissions required for this method
  }
  
  const userPermissions = getRolePermissions(userRole)
  
  return methodPermissions.every(required =>
    userPermissions.some(userPerm =>
      userPerm.resource === required.resource && userPerm.action === required.action
    )
  )
}