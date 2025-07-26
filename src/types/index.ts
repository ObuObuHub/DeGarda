// Simple types for our app
export type Department = 'ATI' | 'Urgente' | 'Chirurgie' | 'Medicina Interna'
export type ShiftTime = 'morning' | 'afternoon' | 'night'
export type UserRole = 'STAFF' | 'MANAGER'

export const DEPARTMENTS: Department[] = ['ATI', 'Urgente', 'Chirurgie', 'Medicina Interna']

export const SHIFT_TIMES: ShiftTime[] = ['morning', 'afternoon', 'night']

export const SHIFT_TIME_LABELS: Record<ShiftTime, string> = {
  morning: 'Dimineață (06:00-14:00)',
  afternoon: 'Amiază (14:00-22:00)', 
  night: 'Noapte (22:00-06:00)'
}

export const DEPARTMENT_COLORS: Record<Department, string> = {
  'ATI': '#ef4444',           // red-500
  'Urgente': '#3b82f6',       // blue-500  
  'Chirurgie': '#10b981',     // emerald-500
  'Medicina Interna': '#f59e0b' // amber-500
}