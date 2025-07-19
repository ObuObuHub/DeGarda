import { ValidDepartment, VALID_DEPARTMENTS } from './types'
import { DEPARTMENT_NORMALIZATION_MAP } from './hospitalConfigs'

export function normalizeDepartment(dept: string | undefined): ValidDepartment | undefined {
  if (!dept) return undefined
  
  // Clean the input
  const cleanDept = dept.trim()
  
  // Direct lookup in normalization map
  const normalized = DEPARTMENT_NORMALIZATION_MAP[cleanDept]
  if (normalized) return normalized
  
  // Fallback: check if it's already a valid department
  if (VALID_DEPARTMENTS.includes(cleanDept as ValidDepartment)) {
    return cleanDept as ValidDepartment
  }
  
  // Case-insensitive fallback
  const lowerDept = cleanDept.toLowerCase()
  for (const [key, value] of Object.entries(DEPARTMENT_NORMALIZATION_MAP)) {
    if (key.toLowerCase() === lowerDept) {
      return value
    }
  }
  
  return undefined
}

export function isValidDepartment(dept: string): dept is ValidDepartment {
  return VALID_DEPARTMENTS.includes(dept as ValidDepartment)
}

export function getDepartmentDisplayName(dept: ValidDepartment): string {
  // Return human-readable department names
  const displayNames: Record<ValidDepartment, string> = {
    'ATI': 'Anestezie și Terapie Intensivă',
    'Urgențe': 'Medicina de Urgență',
    'Laborator': 'Laborator Analize Medicale',
    'Medicină Internă': 'Medicină Internă',
    'Chirurgie': 'Chirurgie Generală'
  }
  
  return displayNames[dept] || dept
}