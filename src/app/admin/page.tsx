'use client'

import { useState, useEffect } from 'react'
import { supabase, type User } from '@/lib/supabase'
import { type Hospital, type ShiftType, type Department } from '@/types'
import { auth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import HospitalManagement from '@/components/HospitalManagement'
import HospitalSelector from '@/components/HospitalSelector'
import StaffManagement from '@/components/StaffManagement'
import ShiftTypeManagement from '@/components/ShiftTypeManagement'
import DepartmentManagement from '@/components/DepartmentManagement'

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null)
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadHospitals()
      loadShiftTypes()
      loadDepartments()
      loadUsers()
    }
  }, [user, selectedHospitalId])

  const checkUser = async () => {
    const currentUser = auth.getCurrentUser()

    if (!currentUser) {
      router.push('/')
      return
    }

    // Only SUPER_ADMIN can access this page
    if (currentUser.role !== 'SUPER_ADMIN') {
      router.push('/dashboard')
      return
    }

    setUser(currentUser)
    setLoading(false)
  }

  const loadHospitals = async () => {
    const { data } = await supabase
      .from('hospitals')
      .select('*')
      .order('name')

    setHospitals(data || [])
  }

  const loadShiftTypes = async () => {
    const { data } = await supabase
      .from('shift_types')
      .select('*')
      .eq('is_active', true)
      .order('name')

    setShiftTypes(data || [])
  }

  const loadUsers = async () => {
    let query = supabase
      .from('users')
      .select('*, hospital:hospitals(name, code)')
      .order('name')

    if (selectedHospitalId) {
      query = query.eq('hospital_id', selectedHospitalId)
    }

    const { data } = await query
    setAllUsers(data || [])
  }

  const loadDepartments = async () => {
    const { data } = await supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('name')

    setDepartments(data || [])
  }

  const handleLogout = () => {
    auth.logout()
    router.push('/')
  }

  // Hospital CRUD
  const addHospital = async (data: { name: string; code: string; location?: string }): Promise<boolean> => {
    const { error } = await supabase
      .from('hospitals')
      .insert(data)

    if (error) {
      if (error.code === '23505') {
        alert('Codul spitalului există deja!')
      } else {
        alert(`Eroare: ${error.message}`)
      }
      return false
    }

    await loadHospitals()
    return true
  }

  const updateHospital = async (id: string, data: Partial<Hospital>): Promise<boolean> => {
    const { error } = await supabase
      .from('hospitals')
      .update(data)
      .eq('id', id)

    if (error) {
      alert(`Eroare: ${error.message}`)
      return false
    }

    await loadHospitals()
    return true
  }

  const deleteHospital = async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('hospitals')
      .delete()
      .eq('id', id)

    if (error) {
      alert(`Eroare: ${error.message}`)
      return false
    }

    await loadHospitals()
    await loadShiftTypes()
    await loadUsers()
    return true
  }

  // Shift Type CRUD
  const addShiftType = async (data: Omit<ShiftType, 'id' | 'created_at'>): Promise<boolean> => {
    // If setting as default, first unset current default
    if (data.is_default) {
      await supabase
        .from('shift_types')
        .update({ is_default: false })
        .eq('hospital_id', data.hospital_id)
        .eq('is_default', true)
    }

    const { error } = await supabase
      .from('shift_types')
      .insert(data)

    if (error) {
      if (error.code === '23505') {
        alert('Un tip de tură cu acest nume există deja pentru acest spital!')
      } else {
        alert(`Eroare: ${error.message}`)
      }
      return false
    }

    await loadShiftTypes()
    return true
  }

  const updateShiftType = async (id: string, data: Partial<ShiftType>): Promise<boolean> => {
    // If setting as default, first unset current default
    if (data.is_default) {
      const shiftType = shiftTypes.find(st => st.id === id)
      if (shiftType) {
        await supabase
          .from('shift_types')
          .update({ is_default: false })
          .eq('hospital_id', shiftType.hospital_id)
          .eq('is_default', true)
      }
    }

    const { error } = await supabase
      .from('shift_types')
      .update(data)
      .eq('id', id)

    if (error) {
      alert(`Eroare: ${error.message}`)
      return false
    }

    await loadShiftTypes()
    return true
  }

  const deleteShiftType = async (id: string): Promise<boolean> => {
    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('shift_types')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      alert(`Eroare: ${error.message}`)
      return false
    }

    await loadShiftTypes()
    return true
  }

  // Department CRUD
  const addDepartment = async (data: Omit<Department, 'id' | 'created_at'>): Promise<boolean> => {
    const { error } = await supabase
      .from('departments')
      .insert(data)

    if (error) {
      if (error.code === '23505') {
        alert('Un departament cu acest nume există deja pentru acest spital!')
      } else {
        alert(`Eroare: ${error.message}`)
      }
      return false
    }

    await loadDepartments()
    return true
  }

  const updateDepartment = async (id: string, data: Partial<Department>): Promise<boolean> => {
    const { error } = await supabase
      .from('departments')
      .update(data)
      .eq('id', id)

    if (error) {
      alert(`Eroare: ${error.message}`)
      return false
    }

    await loadDepartments()
    return true
  }

  const deleteDepartment = async (id: string): Promise<boolean> => {
    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('departments')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      alert(`Eroare: ${error.message}`)
      return false
    }

    await loadDepartments()
    return true
  }

  // User CRUD (Super Admin can manage all users)
  const addUser = async (userData: Omit<User, 'id' | 'created_at'>): Promise<boolean> => {
    const { error } = await supabase
      .from('users')
      .insert(userData)

    if (error) {
      if (error.code === '23505') {
        alert('Codul personal există deja în acest spital!')
      } else {
        alert(`Eroare: ${error.message}`)
      }
      return false
    }

    await loadUsers()
    return true
  }

  const updateUser = async (userId: string, userData: Partial<User>): Promise<boolean> => {
    const { error } = await supabase
      .from('users')
      .update(userData)
      .eq('id', userId)

    if (error) {
      alert(`Eroare: ${error.message}`)
      return false
    }

    await loadUsers()
    return true
  }

  const deleteUser = async (userId: string): Promise<boolean> => {
    if (userId === user?.id) {
      alert('Nu te poți șterge pe tine însuți.')
      return false
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (error) {
      alert(`Eroare: ${error.message}`)
      return false
    }

    await loadUsers()
    return true
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Se încarcă...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🏥 DeGarda - Admin</h1>
              <p className="text-gray-600">
                {user.name} - Super Admin
              </p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/dashboard"
                className="btn btn-secondary"
              >
                📊 Dashboard
              </a>
              <button onClick={handleLogout} className="btn btn-secondary">
                Ieșire
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Hospital Management */}
          <HospitalManagement
            hospitals={hospitals}
            onAddHospital={addHospital}
            onUpdateHospital={updateHospital}
            onDeleteHospital={deleteHospital}
          />

          {/* Shift Type Management */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">⏰</span>
                <span className="text-lg font-semibold text-gray-900">
                  Tipuri de Ture
                </span>
              </div>
              <HospitalSelector
                hospitals={hospitals}
                selectedHospitalId={selectedHospitalId}
                onSelect={setSelectedHospitalId}
                showAllOption={false}
              />
            </div>
            <div className="p-6">
              <ShiftTypeManagement
                shiftTypes={shiftTypes}
                hospitals={hospitals}
                selectedHospitalId={selectedHospitalId}
                onAddShiftType={addShiftType}
                onUpdateShiftType={updateShiftType}
                onDeleteShiftType={deleteShiftType}
              />
            </div>
          </div>

          {/* Department Management */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">🏢</span>
                <span className="text-lg font-semibold text-gray-900">
                  Departamente
                </span>
              </div>
              <HospitalSelector
                hospitals={hospitals}
                selectedHospitalId={selectedHospitalId}
                onSelect={setSelectedHospitalId}
                showAllOption={false}
              />
            </div>
            <DepartmentManagement
              departments={departments}
              selectedHospitalId={selectedHospitalId}
              onAddDepartment={addDepartment}
              onUpdateDepartment={updateDepartment}
              onDeleteDepartment={deleteDepartment}
            />
          </div>

          {/* User Management Section */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">👥</span>
                <span className="text-lg font-semibold text-gray-900">
                  Gestionare Utilizatori
                </span>
              </div>
              <HospitalSelector
                hospitals={hospitals}
                selectedHospitalId={selectedHospitalId}
                onSelect={setSelectedHospitalId}
                showAllOption={true}
              />
            </div>
            <div className="p-6">
              <StaffManagement
                currentUser={user}
                allUsers={allUsers}
                hospitals={hospitals}
                departments={departments}
                onAddUser={addUser}
                onUpdateUser={updateUser}
                onDeleteUser={deleteUser}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
