/**
 * Role-Based Access Control Types
 * Core type definitions for the RBAC system
 */

export type UserRole = 'staff' | 'manager' | 'admin'

export interface Permission {
  resource: string
  action: string
  condition?: (user: User, resource: unknown) => boolean
}

export interface RoleDefinition {
  name: UserRole
  permissions: Permission[]
  inherits?: UserRole[]
}

export interface User {
  id: string
  role: UserRole
  hospitalId: string
  name: string
  email: string
}

export interface NavigationItem {
  path: string
  name: string
  icon?: string
  requiredRole?: UserRole
  requiredPermission?: Permission
}