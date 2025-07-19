/**
 * Permission Definitions
 * Central registry of all available permissions in the system
 */

import { Permission } from './types'

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
  
  // Reports and analytics
  REPORTS_VIEW: { resource: 'reports', action: 'view' },
  REPORTS_EXPORT: { resource: 'reports', action: 'export' },
  
  // System administration
  SYSTEM_CONFIG: { resource: 'system', action: 'config' },
  SYSTEM_LOGS: { resource: 'system', action: 'logs' },
  SYSTEM_BACKUP: { resource: 'system', action: 'backup' },
  
  // Reservations
  RESERVATION_VIEW: { resource: 'reservation', action: 'view' },
  RESERVATION_CREATE: { resource: 'reservation', action: 'create' },
  RESERVATION_UPDATE: { resource: 'reservation', action: 'update' },
  RESERVATION_DELETE: { resource: 'reservation', action: 'delete' },
  
  // Notifications
  NOTIFICATION_VIEW: { resource: 'notification', action: 'view' },
  NOTIFICATION_SEND: { resource: 'notification', action: 'send' },
  NOTIFICATION_MANAGE: { resource: 'notification', action: 'manage' }
} as const

export type PermissionKey = keyof typeof PERMISSIONS

// Helper to get permission by key
export function getPermission(key: PermissionKey): Permission {
  return PERMISSIONS[key]
}

// Helper to check if a permission exists
export function isValidPermission(resource: string, action: string): boolean {
  return Object.values(PERMISSIONS).some(
    p => p.resource === resource && p.action === action
  )
}