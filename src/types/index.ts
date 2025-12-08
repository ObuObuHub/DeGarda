export type UserRole = 'SUPER_ADMIN' | 'HOSPITAL_ADMIN' | 'DEPARTMENT_MANAGER' | 'STAFF'

export interface Department {
  id: string
  hospital_id: string
  name: string
  color: string
  is_active: boolean
  created_at: string
}

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

export interface PreferenceDeadline {
  id: string
  department_id: string
  hospital_id: string
  target_month: string  // ISO date string (first day of month)
  activated_at: string
  expires_at: string
  activated_by: string | null
  created_at: string
}
