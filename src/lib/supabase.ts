import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Check if environment variables are properly configured
if (!supabaseUrl || supabaseUrl === 'your_supabase_url_here' || 
    !supabaseAnonKey || supabaseAnonKey === 'your_supabase_anon_key_here') {
  console.warn('Supabase environment variables not configured. Please check your .env.local file.')
}

export const supabase = createClient(
  supabaseUrl === 'your_supabase_url_here' ? 'https://placeholder.supabase.co' : supabaseUrl,
  supabaseAnonKey === 'your_supabase_anon_key_here' ? 'placeholder-key' : supabaseAnonKey
)

// Types for our database
export type User = {
  id: string
  email: string
  name: string
  role: 'STAFF' | 'MANAGER' | 'ADMIN'
  department: 'ATI' | 'Urgente' | 'Chirurgie' | 'Medicina Interna'
  max_shifts_per_month?: number
  created_at: string
}

export type Shift = {
  id: string
  shift_date: string
  shift_time: '24h'
  department: 'ATI' | 'Urgente' | 'Chirurgie' | 'Medicina Interna'
  assigned_to?: string
  status: 'available' | 'reserved' | 'assigned' | 'pending_swap'
  created_at: string
  user?: User
}

export type SwapRequest = {
  id: string
  requester_id: string
  from_shift_id: string
  to_shift_id: string
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: string
  created_at: string
  requester?: User
  from_shift?: Shift
  to_shift?: Shift
}

export type UnavailableDate = {
  id: string
  user_id: string
  unavailable_date: string
  reason?: string
  created_at: string
}