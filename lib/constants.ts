/**
 * Application constants for DeGarda
 */

// Medical departments available in hospitals
export const DEPARTMENTS = [
  'Laborator',
  'Urgențe', 
  'Chirurgie',
  'Medicină Internă',
  'ATI'
] as const

export type Department = typeof DEPARTMENTS[number]

// Validate if a department is valid
export function isValidDepartment(department: string): department is Department {
  return DEPARTMENTS.includes(department as Department)
}

// Get department display name (same as value for now)
export function getDepartmentDisplayName(department: Department): string {
  return department
}