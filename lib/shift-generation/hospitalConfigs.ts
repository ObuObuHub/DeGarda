import { HospitalConfig, ValidDepartment } from './types'

// Hospital-specific configurations
export const HOSPITAL_CONFIGS: Record<string, Partial<HospitalConfig>> = {
  'Spitalul Clinic de Urgență': {
    shiftRules: {
      departments: {
        'ATI': { enabled: true, shiftType: '24h', minDoctors: 2 },
        'Urgențe': { enabled: true, shiftType: '24h', minDoctors: 3 },
        'Laborator': { enabled: false },
        'Medicină Internă': { enabled: true, shiftType: '24h', minDoctors: 1 },
        'Chirurgie': { enabled: true, shiftType: '24h', minDoctors: 1 }
      }
    }
  },
  'Spitalul County': {
    shiftRules: {
      departments: {
        'ATI': { enabled: true, shiftType: '24h', minDoctors: 1 },
        'Urgențe': { enabled: true, shiftType: '24h', minDoctors: 2 },
        'Laborator': { enabled: true, shiftType: 'day', minDoctors: 1 },
        'Medicină Internă': { enabled: true, shiftType: '24h', minDoctors: 2 },
        'Chirurgie': { enabled: true, shiftType: '24h', minDoctors: 1 }
      }
    }
  }
}

// Department name normalization mapping
export const DEPARTMENT_NORMALIZATION_MAP: Record<string, ValidDepartment | undefined> = {
  // ATI variations
  'ATI': 'ATI',
  'ati': 'ATI',
  'A.T.I.': 'ATI',
  'Anestezie Terapie Intensivă': 'ATI',
  'Anestezie și Terapie Intensivă': 'ATI',
  'Anestezologie și Terapie Intensivă': 'ATI',
  'ANESTEZIE ȘI TERAPIE INTENSIVĂ': 'ATI',
  'Anesthesia and Intensive Care': 'ATI',
  'ICU': 'ATI',
  'Intensive Care': 'ATI',
  'Terapie Intensivă': 'ATI',
  
  // Urgențe variations
  'Urgențe': 'Urgențe',
  'urgente': 'Urgențe',
  'URGENTE': 'Urgențe',
  'Urgenta': 'Urgențe',
  'Emergency': 'Urgențe',
  'Medicina de Urgenta': 'Urgențe',
  'Medicina de Urgență': 'Urgențe',
  'Unitatea de Primiri Urgențe': 'Urgențe',
  'UPU': 'Urgențe',
  'ER': 'Urgențe',
  'Emergency Room': 'Urgențe',
  
  // Laborator variations
  'Laborator': 'Laborator',
  'laborator': 'Laborator',
  'LABORATOR': 'Laborator',
  'Lab': 'Laborator',
  'Laboratory': 'Laborator',
  'Laborator Analize Medicale': 'Laborator',
  'Laborator de Analize': 'Laborator',
  'Analize Medicale': 'Laborator',
  'Clinical Laboratory': 'Laborator',
  
  // Medicină Internă variations  
  'Medicină Internă': 'Medicină Internă',
  'medicina interna': 'Medicină Internă',
  'MEDICINA INTERNA': 'Medicină Internă',
  'Medicina Internă': 'Medicină Internă',
  'Internal Medicine': 'Medicină Internă',
  'Internă': 'Medicină Internă',
  'Interna': 'Medicină Internă',
  'Med. Internă': 'Medicină Internă',
  
  // Chirurgie variations
  'Chirurgie': 'Chirurgie',
  'chirurgie': 'Chirurgie',
  'CHIRURGIE': 'Chirurgie',
  'Surgery': 'Chirurgie',
  'Chirurgie Generală': 'Chirurgie',
  'General Surgery': 'Chirurgie',
  'Chir.': 'Chirurgie'
}

export function getHospitalConfig(hospitalName: string): HospitalConfig['shiftRules'] {
  return HOSPITAL_CONFIGS[hospitalName]?.shiftRules
}

export function isDepartmentEnabledForHospital(
  hospitalName: string, 
  department: ValidDepartment
): boolean {
  const config = getHospitalConfig(hospitalName)
  if (!config?.departments) return true
  
  const deptConfig = config.departments[department]
  return deptConfig?.enabled ?? true
}

export function getShiftTypeForDepartment(
  hospitalName: string, 
  department: ValidDepartment
): string {
  const config = getHospitalConfig(hospitalName)
  if (!config?.departments) return '24h'
  
  const deptConfig = config.departments[department]
  return deptConfig?.shiftType ?? '24h'
}