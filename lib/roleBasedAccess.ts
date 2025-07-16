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
  
  // Access codes
  ACCESS_CODES_VIEW: { resource: 'access_codes', action: 'view' },
  ACCESS_CODES_CREATE: { resource: 'access_codes', action: 'create' },
  ACCESS_CODES_REVOKE: { resource: 'access_codes', action: 'revoke' },
  ACCESS_CODES_BULK_GENERATE: { resource: 'access_codes', action: 'bulk_generate' },
  
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
  
  // Settings
  SETTINGS_VIEW: { resource: 'settings', action: 'view' },
  SETTINGS_UPDATE: { resource: 'settings', action: 'update' },
  
  // Database management
  DATABASE_MANAGE: { resource: 'database', action: 'manage' },
  DATABASE_MIGRATE: { resource: 'database', action: 'migrate' },
  
  // Notifications
  NOTIFICATIONS_VIEW: { resource: 'notifications', action: 'view' },
  NOTIFICATIONS_CREATE: { resource: 'notifications', action: 'create' },
  NOTIFICATIONS_DELETE: { resource: 'notifications', action: 'delete' }
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
      PERMISSIONS.SWAP_CREATE,
      PERMISSIONS.NOTIFICATIONS_VIEW
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
      
      // Access codes (manager-only feature)
      PERMISSIONS.ACCESS_CODES_VIEW,
      PERMISSIONS.ACCESS_CODES_CREATE,
      PERMISSIONS.ACCESS_CODES_REVOKE,
      PERMISSIONS.ACCESS_CODES_BULK_GENERATE,
      
      // Swap management
      PERMISSIONS.SWAP_APPROVE,
      PERMISSIONS.SWAP_REJECT,
      
      // Notifications
      PERMISSIONS.NOTIFICATIONS_CREATE,
      PERMISSIONS.NOTIFICATIONS_DELETE,
      
      // Settings (limited)
      PERMISSIONS.SETTINGS_VIEW
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
      
      // Settings (full)
      PERMISSIONS.SETTINGS_UPDATE,
      
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
 * Check if a user can access a specific route
 */
export function canAccessRoute(userRole: UserRole, route: string): boolean {
  const routePermissions: Record<string, Permission[]> = {
    '/admin/dashboard': [PERMISSIONS.SCHEDULE_VIEW],
    '/admin/staff': [PERMISSIONS.STAFF_VIEW],
    '/admin/schedule': [PERMISSIONS.SCHEDULE_VIEW],
    '/admin/hospitals': [PERMISSIONS.HOSPITAL_VIEW],
    '/admin/access-codes': [PERMISSIONS.ACCESS_CODES_VIEW],
    '/admin/swaps': [PERMISSIONS.SWAP_VIEW],
    '/admin/settings': [PERMISSIONS.SETTINGS_VIEW],
    '/staff': [PERMISSIONS.SCHEDULE_VIEW],
    '/staff/schedule': [PERMISSIONS.SCHEDULE_VIEW]
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
      href: '/admin/dashboard', 
      icon: 'dashboard', 
      permission: PERMISSIONS.SCHEDULE_VIEW,
      description: 'Overview, calendar, and key metrics'
    },
    { 
      label: 'Program Gărzi', 
      href: '/admin/schedule', 
      icon: 'calendar', 
      permission: PERMISSIONS.SCHEDULE_VIEW,
      description: 'Schedule management and shift swaps'
    },
    { 
      label: 'Management', 
      href: '/admin/management', 
      icon: 'users', 
      permission: PERMISSIONS.STAFF_VIEW,
      description: 'Staff and system management'
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
    '/api/admin/access-codes': {
      GET: [PERMISSIONS.ACCESS_CODES_VIEW],
      POST: [PERMISSIONS.ACCESS_CODES_CREATE]
    },
    '/api/admin/staff-access-codes': {
      GET: [PERMISSIONS.ACCESS_CODES_VIEW]
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