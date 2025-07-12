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
  fromStaffId: number
  toStaffId?: number
  shiftId: number
  reason?: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  reviewedBy?: number
  reviewedAt?: string
  createdAt: string
}