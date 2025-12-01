// Legacy type for backward compatibility during migration
export type DepartmentName = 'ATI' | 'Urgente' | 'Chirurgie' | 'Medicina Interna'
export type UserRole = 'SUPER_ADMIN' | 'HOSPITAL_ADMIN' | 'DEPARTMENT_MANAGER' | 'STAFF'

// Dynamic department from database
export interface Department {
  id: string
  hospital_id: string
  name: string
  color: string
  is_active: boolean
  created_at: string
}

// Legacy constant - kept for backward compatibility
export const DEPARTMENTS: DepartmentName[] = ['ATI', 'Urgente', 'Chirurgie', 'Medicina Interna']

export interface Hospital {
  id: string
  name: string
  code: string
  location?: string
  created_at: string
}

export interface ShiftType {
  id: string
  hospital_id: string
  name: string
  start_time: string
  end_time: string
  duration_hours: number
  is_default: boolean
  is_active: boolean
  created_at: string
}

// Legacy colors - now stored in department.color in database
export const DEPARTMENT_COLORS: Record<string, string> = {
  'ATI': '#DC2626',
  'Urgente': '#2563EB',
  'Chirurgie': '#16A34A',
  'Medicina Interna': '#9333EA'
}