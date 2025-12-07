'use client'

import { useState, useEffect } from 'react'
import { type User } from '@/lib/supabase'
import { auth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import DepartmentCalendar from '@/components/DepartmentCalendar'
import StaffManagement from '@/components/StaffManagement'
import ExportMenu from '@/components/ExportMenu'
import NotificationBell from '@/components/NotificationBell'
import { useDashboardData, useShiftActions, useSwapActions, useUserActions } from '@/hooks'
import { useToast } from '@/hooks/useToast'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [authLoading, setAuthLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  // Use custom hooks for data and actions
  const {
    shifts,
    shiftTypes,
    departments,
    unavailableDates,
    swapRequests,
    allUsers,
    loading: dataLoading,
    loadShifts,
    loadUnavailableDates,
    loadSwapRequests,
    loadUsers
  } = useDashboardData(user, selectedDate)

  const shiftActions = useShiftActions(
    user,
    shifts,
    shiftTypes,
    selectedDate,
    loadShifts,
    loadUnavailableDates,
    toast
  )

  const swapActions = useSwapActions(
    user,
    shifts,
    swapRequests,
    loadShifts,
    loadSwapRequests,
    toast
  )

  const userActions = useUserActions(user, allUsers, loadUsers, toast)

  // Auth check
  useEffect(() => {
    const currentUser = auth.getCurrentUser()
    if (!currentUser) {
      router.push('/')
      return
    }
    setUser(currentUser)
    setAuthLoading(false)
  }, [router])

  const handleLogout = () => {
    auth.logout()
    router.push('/')
  }

  const userShifts = shifts.filter(shift => shift.assigned_to === user?.id)

  if (authLoading || dataLoading) {
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

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'Super Admin'
      case 'HOSPITAL_ADMIN': return 'Admin Spital'
      case 'DEPARTMENT_MANAGER': return 'Manager Secție'
      default: return 'Personal'
    }
  }

  const filteredUsers = allUsers.filter(u => {
    if (user.role === 'SUPER_ADMIN') return true
    if (user.role === 'HOSPITAL_ADMIN') return u.hospital_id === user.hospital_id
    if (user.role === 'DEPARTMENT_MANAGER') {
      return u.hospital_id === user.hospital_id &&
             u.department === user.department &&
             u.role === 'STAFF'
    }
    return false
  })

  const filteredDepartments = departments.filter(dept =>
    user.role === 'SUPER_ADMIN' ||
    user.role === 'HOSPITAL_ADMIN' ||
    user.role === 'DEPARTMENT_MANAGER' ||
    dept.name === user.department
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Degarda</h1>
              <p className="text-gray-600">
                {user.name} - {getRoleLabel(user.role)}
                {user.department && ` (${user.department})`}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell
                shifts={shifts}
                swapRequests={swapRequests}
                currentUser={user}
                onAcceptSwap={swapActions.acceptSwapRequest}
                onRejectSwap={swapActions.rejectSwapRequest}
              />
              <ExportMenu
                shifts={shifts}
                users={allUsers}
                selectedDate={selectedDate}
                currentUser={user}
              />
              {(user.role === 'SUPER_ADMIN' || user.role === 'HOSPITAL_ADMIN') && (
                <button
                  onClick={shiftActions.deleteAllShifts}
                  className="btn btn-danger"
                  title="Șterge toate turele (doar pentru testare)"
                >
                  Șterge Tot
                </button>
              )}
              {user.role === 'SUPER_ADMIN' && (
                <a href="/admin" className="btn btn-secondary">
                  Admin
                </a>
              )}
              <button onClick={handleLogout} className="btn btn-secondary">
                Ieșire
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Month Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 bg-white p-4 rounded-lg shadow-sm">
          <button
            onClick={() => {
              const newDate = new Date(selectedDate)
              newDate.setMonth(newDate.getMonth() - 1)
              setSelectedDate(newDate)
            }}
            className="btn btn-secondary"
          >
            ← Luna precedentă
          </button>

          <div className="text-center">
            <h2 className="text-2xl font-semibold capitalize">
              {selectedDate.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Ai {userShifts.length} ture luna aceasta
            </p>
          </div>

          <button
            onClick={() => {
              const newDate = new Date(selectedDate)
              newDate.setMonth(newDate.getMonth() + 1)
              setSelectedDate(newDate)
            }}
            className="btn btn-secondary"
          >
            Luna următoare →
          </button>
        </div>

        {/* Staff Management - Visible to managers and admins */}
        {user.role !== 'STAFF' && (
          <StaffManagement
            currentUser={user}
            allUsers={filteredUsers}
            departments={departments}
            onAddUser={userActions.addUser}
            onUpdateUser={userActions.updateUser}
            onDeleteUser={userActions.deleteUser}
          />
        )}

        {/* Department Calendars */}
        <div className="space-y-6">
          {filteredDepartments.map(dept => (
            <DepartmentCalendar
              key={dept.id}
              department={dept.name}
              shifts={shifts}
              shiftTypes={shiftTypes}
              unavailableDates={unavailableDates}
              swapRequests={swapRequests}
              onReserveShift={shiftActions.reserveShift}
              onCancelShift={shiftActions.cancelShift}
              onMarkUnavailable={shiftActions.markUnavailable}
              onRemoveUnavailable={shiftActions.removeUnavailable}
              onSetPreference={shiftActions.setPreference}
              onRemovePreference={shiftActions.removePreference}
              onDeleteShift={shiftActions.deleteShift}
              onCreateReservation={shiftActions.createReservation}
              onRequestSwap={swapActions.requestSwap}
              onAssignShift={shiftActions.assignShift}
              onAcceptSwap={swapActions.acceptSwapRequest}
              onRejectSwap={swapActions.rejectSwapRequest}
              onCancelSwap={swapActions.cancelSwapRequest}
              onCheckConflicts={shiftActions.checkConflicts}
              currentUser={user}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              users={allUsers}
              onShiftsGenerated={loadShifts}
              departmentColor={dept.color}
            />
          ))}
        </div>
      </main>
    </div>
  )
}
