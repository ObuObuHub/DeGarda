// Simple types for our app
export type Department = 'ATI' | 'Urgente' | 'Chirurgie' | 'Medicina Interna'
export type ShiftTime = '24h'
export type UserRole = 'STAFF' | 'MANAGER'

export const DEPARTMENTS: Department[] = ['ATI', 'Urgente', 'Chirurgie', 'Medicina Interna']

export const SHIFT_TIMES: ShiftTime[] = ['24h']

export const SHIFT_TIME_LABELS: Record<ShiftTime, string> = {
  '24h': '24 ore (00:00-00:00)'
}

export const DEPARTMENT_COLORS: Record<Department, string> = {
  'ATI': '#9ca3af',           // gray-400 (light grey)
  'Urgente': '#3b82f6',       // blue-500  
  'Chirurgie': '#10b981',     // emerald-500
  'Medicina Interna': '#f59e0b' // amber-500
}