'use client'

import { useState, useEffect } from 'react'
import { type User } from '@/lib/supabase'
import { auth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import DepartmentCalendar from '@/components/DepartmentCalendar'
import StaffManagement from '@/components/StaffManagement'
import DeadlineManagement from '@/components/DeadlineManagement'
import ExportMenu from '@/components/ExportMenu'
import NotificationBell from '@/components/NotificationBell'
import MyShiftsCard from '@/components/MyShiftsCard'
import QuickActions, { MobileFAB, HelpModal } from '@/components/QuickActions'
import { useDashboardData, useShiftActions, useSwapActions, useUserActions, usePreferenceDeadline } from '@/hooks'
import { useToast } from '@/hooks/useToast'
import { isWorkingStaff } from '@/lib/roles'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [authLoading, setAuthLoading] = useState(true)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [showMobileShifts, setShowMobileShifts] = useState(false)
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

  // Use deadline hook
  const {
    deadlines,
    activateDeadline,
    isDeadlineLocked,
    getDeadlineForDepartment,
    getTimeRemaining
  } = usePreferenceDeadline(user, user?.hospital_id || null, toast, selectedDate)

  const shiftActions = useShiftActions(
    user,
    shifts,
    shiftTypes,
    selectedDate,
    loadShifts,
    loadUnavailableDates,
    toast,
    isDeadlineLocked,
    departments
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

  const handleLogout = (): void => {
    auth.logout()
    router.push('/')
  }

  const userShifts = shifts.filter(shift => shift.assigned_to === user?.id)
  const pendingSwaps = swapRequests.filter(s => s.target_user_id === user?.id && s.status === 'pending')

  // Loading state with skeleton
  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Skeleton Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="space-y-2">
                <div className="h-7 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="flex gap-3">
                <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
                <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 rounded-full" />
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-500 rounded-full border-t-transparent animate-spin" />
            </div>
            <p className="mt-4 text-gray-600">Se încarcă datele...</p>
            <p className="text-sm text-gray-400 mt-1">Un moment, te rog</p>
          </div>
        </main>
      </div>
    )
  }

  if (!user) return null

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'SUPER_ADMIN': return 'Super Admin'
      case 'HOSPITAL_ADMIN': return 'Admin Spital'
      case 'DEPARTMENT_MANAGER': return 'Manager Secție'
      default: return 'Personal Medical'
    }
  }

  const getRoleBadgeColor = (role: string): string => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-purple-100 text-purple-700'
      case 'HOSPITAL_ADMIN': return 'bg-blue-100 text-blue-700'
      case 'DEPARTMENT_MANAGER': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const filteredUsers = allUsers.filter(u => {
    if (user.role === 'SUPER_ADMIN') return true
    if (user.role === 'HOSPITAL_ADMIN') return u.hospital_id === user.hospital_id
    if (user.role === 'DEPARTMENT_MANAGER') {
      return u.hospital_id === user.hospital_id &&
             u.department === user.department &&
             isWorkingStaff(u.role)
    }
    return false
  })

  const filteredDepartments = departments.filter(dept =>
    user.role === 'SUPER_ADMIN' ||
    user.role === 'HOSPITAL_ADMIN' ||
    dept.name === user.department
  )

  const isCurrentMonth = (): boolean => {
    const now = new Date()
    return selectedDate.getMonth() === now.getMonth() &&
           selectedDate.getFullYear() === now.getFullYear()
  }

  const goToToday = (): void => {
    setSelectedDate(new Date())
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            {/* Left: Logo and Hospital */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏥</span>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">DeGardă</h1>
                  {user.hospital && (
                    <p className="text-xs text-gray-500 truncate max-w-[200px]">
                      {user.hospital.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Help Button - Mobile only for staff */}
              {isWorkingStaff(user.role) && (
                <button
                  onClick={() => setShowHelpModal(true)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors lg:hidden"
                  title="Ajutor"
                >
                  <span className="text-xl">❓</span>
                </button>
              )}

              {/* Notification Bell */}
              <NotificationBell
                shifts={shifts}
                swapRequests={swapRequests}
                currentUser={user}
                onAcceptSwap={swapActions.acceptSwapRequest}
                onRejectSwap={swapActions.rejectSwapRequest}
              />

              {/* Export */}
              <ExportMenu
                shifts={shifts}
                users={allUsers}
                selectedDate={selectedDate}
                currentUser={user}
              />

              {/* Admin Link */}
              {user.role === 'SUPER_ADMIN' && (
                <a
                  href="/admin"
                  className="hidden sm:flex btn btn-secondary items-center gap-1"
                  title="Panou Administrare"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="hidden md:inline">Admin</span>
                </a>
              )}

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-700 font-medium text-sm">
                      {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.department || getRoleLabel(user.role)}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border py-2 z-20 animate-in">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b">
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.hospital?.name}</p>
                        <span className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </div>

                      {/* Quick Stats */}
                      <div className="px-4 py-3 border-b">
                        <p className="text-xs text-gray-500 mb-2">Luna aceasta</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">Ture programate</span>
                          <span className="font-semibold text-blue-600">{userShifts.length}</span>
                        </div>
                        {pendingSwaps.length > 0 && (
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm text-gray-700">Cereri de schimb</span>
                            <span className="font-semibold text-orange-600">{pendingSwaps.length}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {user.role === 'SUPER_ADMIN' && (
                        <a
                          href="/admin"
                          className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 sm:hidden"
                        >
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Panou Administrare
                        </a>
                      )}

                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2 text-red-600 hover:bg-red-50"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Deconectare
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Month Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border">
          <button
            onClick={() => {
              const newDate = new Date(selectedDate)
              newDate.setMonth(newDate.getMonth() - 1)
              setSelectedDate(newDate)
            }}
            className="btn btn-secondary flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Luna precedentă</span>
            <span className="sm:hidden">Înapoi</span>
          </button>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 capitalize">
              {selectedDate.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center justify-center gap-3 mt-1">
              <span className="text-sm text-gray-500">
                {userShifts.length} {userShifts.length === 1 ? 'tură' : 'ture'} programate
              </span>
              {!isCurrentMonth() && (
                <button
                  onClick={goToToday}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  ← Astăzi
                </button>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              const newDate = new Date(selectedDate)
              newDate.setMonth(newDate.getMonth() + 1)
              setSelectedDate(newDate)
            }}
            className="btn btn-secondary flex items-center gap-2"
          >
            <span className="hidden sm:inline">Luna următoare</span>
            <span className="sm:hidden">Înainte</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Staff View: My Shifts and Quick Actions side by side on desktop */}
        {isWorkingStaff(user.role) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* My Shifts Card - Takes 2 columns on large screens */}
            <div className="lg:col-span-2">
              <MyShiftsCard
                shifts={shifts}
                currentUser={user}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            </div>

            {/* Quick Actions - Takes 1 column */}
            <div className="hidden lg:block">
              <QuickActions
                currentUser={user}
                pendingSwapCount={pendingSwaps.length}
                swapRequests={swapRequests}
                onOpenHelp={() => setShowHelpModal(true)}
              />
            </div>
          </div>
        )}

        {/* Department Calendars */}
        <div className="space-y-6">
          {filteredDepartments.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm border">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Niciun departament disponibil</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Nu ai acces la niciun departament. Contactează administratorul spitalului pentru a fi adăugat la un departament.
              </p>
            </div>
          ) : (
            filteredDepartments.map(dept => {
              const deadline = getDeadlineForDepartment(dept.id, selectedDate)
              const deptIsLocked = isDeadlineLocked(dept.id, selectedDate)
              const timeRemaining = deadline ? getTimeRemaining(deadline) : null

              return (
                <DepartmentCalendar
                  key={dept.id}
                  department={dept.name}
                  departmentId={dept.id}
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
                  isDeadlineLocked={deptIsLocked}
                  deadlineTimeRemaining={timeRemaining}
                />
              )
            })
          )}
        </div>

        {/* Staff Management - Visible to managers and admins */}
        {user.role !== 'STAFF' && (
          <div className="mt-8">
            <StaffManagement
              currentUser={user}
              allUsers={filteredUsers}
              departments={departments}
              onAddUser={userActions.addUser}
              onUpdateUser={userActions.updateUser}
              onDeleteUser={userActions.deleteUser}
            />
          </div>
        )}

        {/* Deadline Management - Visible to managers and admins */}
        {user.role !== 'STAFF' && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border overflow-hidden">
            <DeadlineManagement
              departments={filteredDepartments}
              deadlines={deadlines}
              selectedHospitalId={user.hospital_id || null}
              onActivateDeadline={activateDeadline}
            />
          </div>
        )}

        {/* Delete All Button - Only for admins, hidden in a collapsible section */}
        {(user.role === 'SUPER_ADMIN' || user.role === 'HOSPITAL_ADMIN') && (
          <div className="mt-8 p-4 bg-red-50 rounded-xl border border-red-100">
            <details>
              <summary className="cursor-pointer text-red-700 font-medium text-sm">
                Opțiuni Avansate (pentru testare)
              </summary>
              <div className="mt-4">
                <p className="text-sm text-red-600 mb-3">
                  Atenție: Această acțiune va șterge toate turele din această lună.
                </p>
                <button
                  onClick={shiftActions.deleteAllShifts}
                  className="btn btn-danger"
                >
                  Șterge toate turele
                </button>
              </div>
            </details>
          </div>
        )}
      </main>

      {/* Mobile Floating Action Button for Staff */}
      {isWorkingStaff(user.role) && (
        <MobileFAB
          onShowMyShifts={() => setShowMobileShifts(true)}
          hasNotifications={pendingSwaps.length > 0}
        />
      )}

      {/* Mobile My Shifts Slide-up Panel */}
      {showMobileShifts && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setShowMobileShifts(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden animate-slide-up">
            <div className="bg-white rounded-t-2xl shadow-xl max-h-[80vh] overflow-hidden">
              <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Turele Mele</h3>
                <button
                  onClick={() => setShowMobileShifts(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto pb-safe">
                <MyShiftsCard
                  shifts={shifts}
                  currentUser={user}
                  selectedDate={selectedDate}
                  onDateChange={(date) => {
                    setSelectedDate(date)
                    setShowMobileShifts(false)
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Help Modal */}
      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </div>
  )
}
