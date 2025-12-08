import { renderHook, act, waitFor } from '@testing-library/react'
import { usePreferenceDeadline } from '../usePreferenceDeadline'
import { supabase } from '@/lib/supabase'
import type { User } from '@/lib/supabase'

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('usePreferenceDeadline', () => {
  const mockUser: User = {
    id: 'user-123',
    name: 'Test Manager',
    personal_code: 'MGR001',
    role: 'DEPARTMENT_MANAGER',
    department_id: 'dept-123',
    hospital_id: 'hospital-123',
    created_at: new Date().toISOString(),
  }

  const mockHospitalId = 'hospital-123'
  const mockDepartmentId = 'dept-123'
  const mockTargetMonth = new Date(2025, 0, 15) // January 2025

  const mockToast = {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock for fetching deadlines (returns empty)
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    })

    ;(mockSupabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
      insert: jest.fn(),
      update: jest.fn(),
    })
  })

  describe('activateDeadline', () => {
    it('should successfully insert a new deadline for a manager', async () => {
      // Setup: Mock successful insert
      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null })
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      })

      ;(mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'preference_deadlines') {
          return {
            select: mockSelect,
            insert: mockInsert,
            update: jest.fn(),
          }
        }
        return { select: mockSelect }
      })

      const { result } = renderHook(() =>
        usePreferenceDeadline(mockUser, mockHospitalId, mockToast)
      )

      // Wait for initial load
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Act: Activate deadline
      let success: boolean = false
      await act(async () => {
        success = await result.current.activateDeadline(mockDepartmentId, mockTargetMonth)
      })

      // Assert: Should succeed
      expect(success).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          department_id: mockDepartmentId,
          hospital_id: mockHospitalId,
          target_month: '2025-01-01',
          activated_by: mockUser.id,
        })
      )
      expect(mockToast.success).toHaveBeenCalledWith(
        'Termenul limită a fost activat! Staff-ul are 24 de ore.'
      )
      expect(mockToast.error).not.toHaveBeenCalled()
    })

    it('should handle RLS policy violation error gracefully', async () => {
      // Setup: Mock RLS policy error (the actual error we're seeing)
      const rlsError = {
        code: '42501',
        message: 'new row violates row-level security policy for table "preference_deadlines"',
        details: null,
        hint: null,
      }

      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: rlsError })
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      })

      ;(mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'preference_deadlines') {
          return {
            select: mockSelect,
            insert: mockInsert,
          }
        }
        return { select: mockSelect }
      })

      // Spy on console.error to verify logging
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const { result } = renderHook(() =>
        usePreferenceDeadline(mockUser, mockHospitalId, mockToast)
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      let success: boolean = true
      await act(async () => {
        success = await result.current.activateDeadline(mockDepartmentId, mockTargetMonth)
      })

      // Assert: Should fail gracefully with proper error logging
      expect(success).toBe(false)
      expect(mockToast.error).toHaveBeenCalledWith('Nu s-a putut activa termenul limită.')
      expect(consoleSpy).toHaveBeenCalledWith(
        'Deadline insert failed:',
        expect.objectContaining({
          code: '42501',
          message: expect.stringContaining('row-level security'),
          userId: mockUser.id,
          userRole: mockUser.role,
        })
      )

      consoleSpy.mockRestore()
    })

    it('should return false when user is null', async () => {
      const { result } = renderHook(() =>
        usePreferenceDeadline(null, mockHospitalId, mockToast)
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      let success: boolean = true
      await act(async () => {
        success = await result.current.activateDeadline(mockDepartmentId, mockTargetMonth)
      })

      expect(success).toBe(false)
    })

    it('should return false when hospitalId is null', async () => {
      const { result } = renderHook(() =>
        usePreferenceDeadline(mockUser, null, mockToast)
      )

      let success: boolean = true
      await act(async () => {
        success = await result.current.activateDeadline(mockDepartmentId, mockTargetMonth)
      })

      expect(success).toBe(false)
    })

    it('should reject STAFF users from activating deadlines', async () => {
      const staffUser: User = {
        ...mockUser,
        role: 'STAFF',
      }

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const { result } = renderHook(() =>
        usePreferenceDeadline(staffUser, mockHospitalId, mockToast)
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      let success: boolean = true
      await act(async () => {
        success = await result.current.activateDeadline(mockDepartmentId, mockTargetMonth)
      })

      expect(success).toBe(false)
      expect(mockToast.error).toHaveBeenCalledWith(
        'Nu aveți permisiunea de a activa termene limită.'
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        'Unauthorized deadline activation attempt:',
        expect.objectContaining({
          userId: staffUser.id,
          userRole: 'STAFF',
        })
      )

      consoleSpy.mockRestore()
    })

    it('should allow HOSPITAL_ADMIN to activate deadlines', async () => {
      const adminUser: User = {
        ...mockUser,
        role: 'HOSPITAL_ADMIN',
      }

      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null })
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      })

      ;(mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'preference_deadlines') {
          return {
            select: mockSelect,
            insert: mockInsert,
          }
        }
        return { select: mockSelect }
      })

      const { result } = renderHook(() =>
        usePreferenceDeadline(adminUser, mockHospitalId, mockToast)
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      let success: boolean = false
      await act(async () => {
        success = await result.current.activateDeadline(mockDepartmentId, mockTargetMonth)
      })

      expect(success).toBe(true)
      expect(mockInsert).toHaveBeenCalled()
    })
  })
})
