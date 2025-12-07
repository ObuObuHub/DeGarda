/**
 * Role helper functions for DeGarda
 *
 * DEPARTMENT_MANAGER = STAFF + management privileges
 * They participate in shifts like staff but can also manage the department.
 */

export type UserRole = 'SUPER_ADMIN' | 'HOSPITAL_ADMIN' | 'DEPARTMENT_MANAGER' | 'STAFF'

/**
 * Check if user should be treated as working staff (participates in shifts)
 * Both STAFF and DEPARTMENT_MANAGER work shifts in their department
 */
export const isWorkingStaff = (role: string): boolean =>
  role === 'STAFF' || role === 'DEPARTMENT_MANAGER'

/**
 * Check if user has management privileges (can manage shifts/users)
 * DEPARTMENT_MANAGER, HOSPITAL_ADMIN, and SUPER_ADMIN can manage
 */
export const isManager = (role: string): boolean =>
  role === 'DEPARTMENT_MANAGER' || role === 'HOSPITAL_ADMIN' || role === 'SUPER_ADMIN'

/**
 * Check if user is an admin (hospital or super level)
 */
export const isAdmin = (role: string): boolean =>
  role === 'HOSPITAL_ADMIN' || role === 'SUPER_ADMIN'
