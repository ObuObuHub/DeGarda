export type ShiftType = 'day' | 'night' | '24h'

export interface Staff {
  id: number
  name: string
  email: string
  type: 'medic' | 'biolog' | 'chimist' | 'asistent'
  specialization: string
  hospitalId?: number
  role: 'admin' | 'manager' | 'staff'
  isActive?: boolean
}

export interface Shift {
  id?: string
  date?: string
  type?: ShiftType
  staffId?: string | null
  doctorId?: string | null
  doctorName?: string | null
  hospitalId?: string
  status?: 'open' | 'assigned' | 'reserved'
  reservedBy?: string | null
  reservedByName?: string | null
}

export interface Hospital {
  id: number
  name: string
  city: string
  departments?: number
  staff?: number
}

export interface Notification {
  id: number
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message: string
  read: boolean
  created_at: string
  expires_at?: string
}

export interface SwapRequest {
  id: number
  from_staff_id: number
  to_staff_id?: number | null
  shift_id: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  created_at: string
  shift_date: string
  shift_type: string
  from_staff_name: string
  to_staff_name?: string | null
  reviewed_by?: number
  reviewed_at?: string
}

export interface Reservation {
  id: number
  staff_id: number
  hospital_id: number
  shift_date: string
  department: string
  status: 'active' | 'cancelled' | 'fulfilled'
  created_at: string
  staff_name?: string
}