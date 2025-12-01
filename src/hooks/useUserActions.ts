'use client'

import { useCallback } from 'react'
import { supabase, type User } from '@/lib/supabase'

interface UseUserActionsReturn {
  addUser: (userData: Omit<User, 'id' | 'created_at'>) => Promise<boolean>
  updateUser: (userId: string, userData: Partial<User>) => Promise<boolean>
  deleteUser: (userId: string) => Promise<boolean>
}

export function useUserActions(
  user: User | null,
  allUsers: User[],
  onRefreshUsers: () => Promise<void>
): UseUserActionsReturn {

  const addUser = useCallback(async (userData: Omit<User, 'id' | 'created_at'>): Promise<boolean> => {
    if (!user || user.role === 'STAFF') return false

    if (user.role === 'DEPARTMENT_MANAGER') {
      if (userData.role !== 'STAFF') {
        alert('Managerii de secție pot adăuga doar personal.')
        return false
      }
      if (userData.department !== user.department) {
        alert('Poți adăuga doar personal în departamentul tău.')
        return false
      }
    }

    if (user.role === 'HOSPITAL_ADMIN') {
      userData = { ...userData, hospital_id: user.hospital_id }
    }

    const { error } = await supabase
      .from('users')
      .insert(userData)

    if (error) {
      if (error.code === '23505') {
        alert('Codul personal există deja!')
      } else {
        alert(`Eroare: ${error.message}`)
      }
      return false
    }

    await onRefreshUsers()
    return true
  }, [user, onRefreshUsers])

  const updateUser = useCallback(async (userId: string, userData: Partial<User>): Promise<boolean> => {
    if (!user || user.role === 'STAFF') return false

    if (userId === user.id && userData.role && userData.role !== user.role) {
      alert('Nu îți poți schimba propriul rol.')
      return false
    }

    if (user.role === 'DEPARTMENT_MANAGER') {
      const targetUser = allUsers.find(u => u.id === userId)
      if (!targetUser || targetUser.department !== user.department) {
        alert('Poți edita doar personal din departamentul tău.')
        return false
      }
      if (userData.role && userData.role !== 'STAFF') {
        alert('Managerii de secție pot seta doar rolul de Personal.')
        return false
      }
      if (userData.department && userData.department !== user.department) {
        alert('Poți seta doar departamentul tău.')
        return false
      }
    }

    const { error } = await supabase
      .from('users')
      .update(userData)
      .eq('id', userId)

    if (error) {
      if (error.code === '23505') {
        alert('Codul personal există deja!')
      } else {
        alert(`Eroare: ${error.message}`)
      }
      return false
    }

    await onRefreshUsers()
    return true
  }, [user, allUsers, onRefreshUsers])

  const deleteUser = useCallback(async (userId: string): Promise<boolean> => {
    if (!user || user.role === 'STAFF') return false

    if (userId === user.id) {
      alert('Nu te poți șterge pe tine însuți.')
      return false
    }

    if (user.role === 'DEPARTMENT_MANAGER') {
      const targetUser = allUsers.find(u => u.id === userId)
      if (!targetUser || targetUser.department !== user.department || targetUser.role !== 'STAFF') {
        alert('Poți șterge doar personal din departamentul tău.')
        return false
      }
    }

    if (user.role === 'HOSPITAL_ADMIN') {
      const targetUser = allUsers.find(u => u.id === userId)
      if (!targetUser || targetUser.hospital_id !== user.hospital_id) {
        alert('Poți șterge doar utilizatori din spitalul tău.')
        return false
      }
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (error) {
      alert(`Eroare la ștergere: ${error.message}`)
      return false
    }

    await onRefreshUsers()
    return true
  }, [user, allUsers, onRefreshUsers])

  return {
    addUser,
    updateUser,
    deleteUser
  }
}
