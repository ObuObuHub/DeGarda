'use client'

import { useCallback } from 'react'
import { supabase, type User } from '@/lib/supabase'

interface ToastFunctions {
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
}

interface UseUserActionsReturn {
  addUser: (userData: Omit<User, 'id' | 'created_at'>) => Promise<boolean>
  updateUser: (userId: string, userData: Partial<User>) => Promise<boolean>
  deleteUser: (userId: string) => Promise<boolean>
}

export function useUserActions(
  user: User | null,
  allUsers: User[],
  onRefreshUsers: () => Promise<void>,
  toast?: ToastFunctions
): UseUserActionsReturn {

  const addUser = useCallback(async (userData: Omit<User, 'id' | 'created_at'>): Promise<boolean> => {
    if (!user || user.role === 'STAFF') return false

    if (user.role === 'DEPARTMENT_MANAGER') {
      if (userData.role !== 'STAFF') {
        toast?.error('Managerii de secție pot adăuga doar personal.')
        return false
      }
      if (userData.department !== user.department) {
        toast?.error('Poți adăuga doar personal în departamentul tău.')
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
        toast?.error('Codul personal există deja!')
      } else {
        toast?.error(`Eroare: ${error.message}`)
      }
      return false
    }

    toast?.success('Utilizator adăugat cu succes!')
    await onRefreshUsers()
    return true
  }, [user, onRefreshUsers, toast])

  const updateUser = useCallback(async (userId: string, userData: Partial<User>): Promise<boolean> => {
    if (!user || user.role === 'STAFF') return false

    if (userId === user.id && userData.role && userData.role !== user.role) {
      toast?.error('Nu îți poți schimba propriul rol.')
      return false
    }

    if (user.role === 'DEPARTMENT_MANAGER') {
      const targetUser = allUsers.find(u => u.id === userId)
      if (!targetUser || targetUser.department !== user.department) {
        toast?.error('Poți edita doar personal din departamentul tău.')
        return false
      }
      if (userData.role && userData.role !== 'STAFF') {
        toast?.error('Managerii de secție pot seta doar rolul de Personal.')
        return false
      }
      if (userData.department && userData.department !== user.department) {
        toast?.error('Poți seta doar departamentul tău.')
        return false
      }
    }

    const { error } = await supabase
      .from('users')
      .update(userData)
      .eq('id', userId)

    if (error) {
      if (error.code === '23505') {
        toast?.error('Codul personal există deja!')
      } else {
        toast?.error(`Eroare: ${error.message}`)
      }
      return false
    }

    toast?.success('Utilizator actualizat cu succes!')
    await onRefreshUsers()
    return true
  }, [user, allUsers, onRefreshUsers, toast])

  const deleteUser = useCallback(async (userId: string): Promise<boolean> => {
    if (!user || user.role === 'STAFF') return false

    if (userId === user.id) {
      toast?.error('Nu te poți șterge pe tine însuți.')
      return false
    }

    if (user.role === 'DEPARTMENT_MANAGER') {
      const targetUser = allUsers.find(u => u.id === userId)
      if (!targetUser || targetUser.department !== user.department || targetUser.role !== 'STAFF') {
        toast?.error('Poți șterge doar personal din departamentul tău.')
        return false
      }
    }

    if (user.role === 'HOSPITAL_ADMIN') {
      const targetUser = allUsers.find(u => u.id === userId)
      if (!targetUser || targetUser.hospital_id !== user.hospital_id) {
        toast?.error('Poți șterge doar utilizatori din spitalul tău.')
        return false
      }
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (error) {
      toast?.error(`Eroare la ștergere: ${error.message}`)
      return false
    }

    toast?.success('Utilizator șters cu succes!')
    await onRefreshUsers()
    return true
  }, [user, allUsers, onRefreshUsers, toast])

  return {
    addUser,
    updateUser,
    deleteUser
  }
}
