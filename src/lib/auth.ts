import { supabase } from './supabase'
import type { User } from './supabase'

const AUTH_STORAGE_KEY = 'degarda_user'

// Check if running in browser (not during SSR)
const isBrowser = typeof window !== 'undefined'

export const auth = {
  // Login with personal code and optional hospital selection
  async loginWithCode(
    personalCode: string,
    hospitalId?: string
  ): Promise<{ user: User | null; error: string | null }> {
    try {
      let query = supabase
        .from('users')
        .select('*, hospital:hospitals(id, name, code)')
        .eq('personal_code', personalCode.toUpperCase())

      // Filter by hospital if provided (required for non-SUPER_ADMIN users)
      if (hospitalId) {
        query = query.eq('hospital_id', hospitalId)
      }

      const { data, error } = await query.single()

      if (error || !data) {
        // Provide more specific error messages
        if (error?.code === 'PGRST116') {
          // No rows or multiple rows returned
          return {
            user: null,
            error: hospitalId
              ? 'Cod personal invalid pentru acest spital'
              : 'Cod personal invalid sau selectează spitalul'
          }
        }
        return { user: null, error: 'Cod personal invalid' }
      }

      // Store user in localStorage for session management
      if (isBrowser) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data))
      }

      return { user: data, error: null }
    } catch {
      return { user: null, error: 'Eroare la conectare' }
    }
  },

  // Get current user from localStorage
  getCurrentUser(): User | null {
    if (!isBrowser) return null
    try {
      const userData = localStorage.getItem(AUTH_STORAGE_KEY)
      return userData ? JSON.parse(userData) : null
    } catch {
      return null
    }
  },

  // Logout - clear session
  logout(): void {
    if (!isBrowser) return
    localStorage.removeItem(AUTH_STORAGE_KEY)
  },

  // Check if user is logged in
  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null
  }
}