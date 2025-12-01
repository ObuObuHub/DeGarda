export type Department = 'ATI' | 'Urgente' | 'Chirurgie' | 'Medicina Interna'
export type UserRole = 'SUPER_ADMIN' | 'HOSPITAL_ADMIN' | 'DEPARTMENT_MANAGER' | 'STAFF'

export const DEPARTMENTS: Department[] = ['ATI', 'Urgente', 'Chirurgie', 'Medicina Interna']

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

export const DEPARTMENT_COLORS: Record<Department, string> = {
  'ATI': '#9ca3af',
  'Urgente': '#3b82f6',
  'Chirurgie': '#10b981',
  'Medicina Interna': '#f59e0b'
}