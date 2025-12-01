export type Department = 'ATI' | 'Urgente' | 'Chirurgie' | 'Medicina Interna'
export type UserRole = 'STAFF' | 'MANAGER' | 'ADMIN'

export const DEPARTMENTS: Department[] = ['ATI', 'Urgente', 'Chirurgie', 'Medicina Interna']

export const DEPARTMENT_COLORS: Record<Department, string> = {
  'ATI': '#9ca3af',
  'Urgente': '#3b82f6',
  'Chirurgie': '#10b981',
  'Medicina Interna': '#f59e0b'
}