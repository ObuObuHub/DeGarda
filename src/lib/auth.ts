import { supabase } from './supabase'
import type { User } from './supabase'

const AUTH_STORAGE_KEY = 'degarda_user'

// Check if running in browser (not during SSR)
const isBrowser = typeof window !== 'undefined'

export const auth = {
  // Login with personal code
  async loginWithCode(personalCode: string): Promise<{ user: User | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*, hospital:hospitals(id, name, code)')
        .eq('personal_code', personalCode.toUpperCase())
        .single()

      if (error || !data) {
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