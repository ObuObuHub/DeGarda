'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, type User } from '@/lib/supabase'
import { type Hospital, type ShiftType, type Department } from '@/types'
import { auth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import HospitalManagement from '@/components/HospitalManagement'
import StaffManagement from '@/components/StaffManagement'
import ShiftTypeManagement from '@/components/ShiftTypeManagement'
import DepartmentManagement from '@/components/DepartmentManagement'

type AdminTab = 'hospitals' | 'departments' | 'shifts' | 'users'

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null)
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<AdminTab>('hospitals')
  const router = useRouter()

  const selectedHospital = hospitals.find(h => h.id === selectedHospitalId)

  const loadHospitals = useCallback(async (): Promise<void> => {
    const { data } = await supabase
      .from('hospitals')
      .select('*')
      .order('name')

    setHospitals(data || [])
    // Auto-select first hospital if none selected
    if (data && data.length > 0 && !selectedHospitalId) {
      setSelectedHospitalId(data[0].id)
    }
  }, [selectedHospitalId])

  const loadShiftTypes = useCallback(async (): Promise<void> => {
    let query = supabase
      .from('shift_types')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (selectedHospitalId) {
      query = query.eq('hospital_id', selectedHospitalId)
    }

    const { data } = await query
    setShiftTypes(data || [])
  }, [selectedHospitalId])

  const loadUsers = useCallback(async (): Promise<void> => {
    let query = supabase
      .from('users')
      .select('*, hospital:hospitals(name, code)')
      .order('name')

    if (selectedHospitalId) {
      query = query.eq('hospital_id', selectedHospitalId)
    }

    const { data } = await query
    setAllUsers(data || [])
  }, [selectedHospitalId])

  const loadDepartments = useCallback(async (): Promise<void> => {
    let query = supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (selectedHospitalId) {
      query = query.eq('hospital_id', selectedHospitalId)
    }

    const { data } = await query
    setDepartments(data || [])
  }, [selectedHospitalId])

  // Auth check on mount
  useEffect(() => {
    const currentUser = auth.getCurrentUser()

    if (!currentUser) {
      router.push('/')
      return
    }

    if (currentUser.role !== 'SUPER_ADMIN') {
      router.push('/dashboard')
      return
    }

    setUser(currentUser)
    setLoading(false)
  }, [router])

  // Load data when user changes or hospital selection changes
  useEffect(() => {
    if (user) {
      loadHospitals()
      loadShiftTypes()
      loadDepartments()
      loadUsers()
    }
  }, [user, loadHospitals, loadShiftTypes, loadDepartments, loadUsers])

  const handleLogout = (): void => {
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

  // User CRUD
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

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="space-y-2">
                <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="flex gap-3">
                <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-purple-200 rounded-full" />
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-purple-500 rounded-full border-t-transparent animate-spin" />
            </div>
            <p className="mt-4 text-gray-600">Se încarcă panoul de administrare...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!user) return null

  const tabs: { id: AdminTab; label: string; icon: string; count?: number }[] = [
    { id: 'hospitals', label: 'Spitale', icon: '🏥', count: hospitals.length },
    { id: 'departments', label: 'Departamente', icon: '🏢', count: departments.length },
    { id: 'shifts', label: 'Tipuri Ture', icon: '⏰', count: shiftTypes.length },
    { id: 'users', label: 'Utilizatori', icon: '👥', count: allUsers.length },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            {/* Left: Logo */}
            <div className="flex items-center gap-3">
              <a href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <span className="text-2xl">🏥</span>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">DeGardă</h1>
                  <p className="text-xs text-purple-600 font-medium">Panou Administrare</p>
                </div>
              </a>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              {/* Back to Dashboard */}
              <a
                href="/dashboard"
                className="btn btn-secondary flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline">Înapoi la Dashboard</span>
                <span className="sm:hidden">Înapoi</span>
              </a>

              {/* User Info */}
              <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-700 font-medium text-sm">
                    {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-purple-600">Super Admin</p>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="btn btn-ghost text-red-600 hover:bg-red-50 hover:text-red-700"
                title="Deconectare"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold">{hospitals.length}</p>
              <p className="text-purple-200 text-sm">Spitale</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{departments.length}</p>
              <p className="text-purple-200 text-sm">Departamente</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{shiftTypes.length}</p>
              <p className="text-purple-200 text-sm">Tipuri Ture</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{allUsers.length}</p>
              <p className="text-purple-200 text-sm">Utilizatori</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b sticky top-[60px] z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 overflow-x-auto py-2" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id
                      ? 'bg-purple-200 text-purple-800'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Hospital Filter (for non-hospital tabs) */}
      {activeTab !== 'hospitals' && hospitals.length > 0 && (
        <div className="bg-gray-50 border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">Filtrează după spital:</span>
              <div className="flex gap-2 overflow-x-auto">
                <button
                  onClick={() => setSelectedHospitalId(null)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    selectedHospitalId === null
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 border hover:bg-gray-50'
                  }`}
                >
                  Toate
                </button>
                {hospitals.map((hospital) => (
                  <button
                    key={hospital.id}
                    onClick={() => setSelectedHospitalId(hospital.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      selectedHospitalId === hospital.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 border hover:bg-gray-50'
                    }`}
                  >
                    {hospital.code}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Hospitals Tab */}
        {activeTab === 'hospitals' && (
          <div className="animate-in">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Gestionare Spitale</h2>
              <p className="text-gray-500 mt-1">Adaugă, editează sau șterge spitale din sistem</p>
            </div>
            <HospitalManagement
              hospitals={hospitals}
              onAddHospital={addHospital}
              onUpdateHospital={updateHospital}
              onDeleteHospital={deleteHospital}
            />
          </div>
        )}

        {/* Departments Tab */}
        {activeTab === 'departments' && (
          <div className="animate-in">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Gestionare Departamente</h2>
              <p className="text-gray-500 mt-1">
                {selectedHospital
                  ? `Departamente pentru ${selectedHospital.name}`
                  : 'Toate departamentele din sistem'
                }
              </p>
            </div>

            {!selectedHospitalId ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full mb-3">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-yellow-800 font-medium">Selectează un spital</p>
                <p className="text-yellow-600 text-sm mt-1">Pentru a gestiona departamentele, selectează mai întâi un spital din filtrul de mai sus.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <DepartmentManagement
                  departments={departments}
                  selectedHospitalId={selectedHospitalId}
                  onAddDepartment={addDepartment}
                  onUpdateDepartment={updateDepartment}
                  onDeleteDepartment={deleteDepartment}
                />
              </div>
            )}
          </div>
        )}

        {/* Shift Types Tab */}
        {activeTab === 'shifts' && (
          <div className="animate-in">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Tipuri de Ture</h2>
              <p className="text-gray-500 mt-1">
                {selectedHospital
                  ? `Tipuri de ture pentru ${selectedHospital.name}`
                  : 'Toate tipurile de ture din sistem'
                }
              </p>
            </div>

            {!selectedHospitalId ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full mb-3">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-yellow-800 font-medium">Selectează un spital</p>
                <p className="text-yellow-600 text-sm mt-1">Pentru a gestiona tipurile de ture, selectează mai întâi un spital din filtrul de mai sus.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <ShiftTypeManagement
                  shiftTypes={shiftTypes}
                  hospitals={hospitals}
                  selectedHospitalId={selectedHospitalId}
                  onAddShiftType={addShiftType}
                  onUpdateShiftType={updateShiftType}
                  onDeleteShiftType={deleteShiftType}
                />
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="animate-in">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Gestionare Utilizatori</h2>
              <p className="text-gray-500 mt-1">
                {selectedHospital
                  ? `Utilizatori din ${selectedHospital.name}`
                  : 'Toți utilizatorii din sistem'
                }
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
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
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            DeGardă Admin Panel • Conectat ca {user.name}
          </p>
        </div>
      </footer>
    </div>
  )
}
