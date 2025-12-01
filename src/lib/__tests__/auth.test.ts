import { auth } from '../auth'

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })

// Mock supabase
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  },
}))

describe('auth', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
  })

  describe('getCurrentUser', () => {
    it('returns null when no user in localStorage', () => {
      expect(auth.getCurrentUser()).toBeNull()
    })

    it('returns user from localStorage', () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        personal_code: 'TEST1',
        role: 'STAFF',
        department: 'ATI',
      }
      mockLocalStorage.setItem('degarda_user', JSON.stringify(mockUser))

      const user = auth.getCurrentUser()
      expect(user).toEqual(mockUser)
    })

    it('returns null on JSON parse error', () => {
      mockLocalStorage.setItem('degarda_user', 'invalid json')
      expect(auth.getCurrentUser()).toBeNull()
    })
  })

  describe('logout', () => {
    it('removes user from localStorage', () => {
      const mockUser = { id: 'user-1', name: 'Test' }
      mockLocalStorage.setItem('degarda_user', JSON.stringify(mockUser))

      auth.logout()

      expect(mockLocalStorage.getItem('degarda_user')).toBeNull()
    })
  })

  describe('isAuthenticated', () => {
    it('returns false when no user', () => {
      expect(auth.isAuthenticated()).toBe(false)
    })

    it('returns true when user exists', () => {
      const mockUser = { id: 'user-1', name: 'Test' }
      mockLocalStorage.setItem('degarda_user', JSON.stringify(mockUser))

      expect(auth.isAuthenticated()).toBe(true)
    })
  })
})
