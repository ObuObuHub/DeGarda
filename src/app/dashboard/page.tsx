'use client'

import { useState, useEffect } from 'react'
import { supabase, type User, type Shift, type UnavailableDate, type SwapRequest } from '@/lib/supabase'
import { auth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import {} from '@/types'
import DepartmentCalendar from '@/components/DepartmentCalendar'
import SwapRequestModal from '@/components/SwapRequestModal'
import { DEPARTMENTS } from '@/types'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [unavailableDates, setUnavailableDates] = useState<UnavailableDate[]>([])
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showSwapModal, setShowSwapModal] = useState(false)
  const [showSwapRequests, setShowSwapRequests] = useState(false)
  const [pendingSwapRequests, setPendingSwapRequests] = useState<SwapRequest[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [router])

  useEffect(() => {
    if (user) {
      loadShifts()
      if (user.role === 'MANAGER' || user.role === 'ADMIN') {
        loadManagerData()
      }
    }
  }, [selectedDate, user])

  const checkUser = async () => {
    const currentUser = auth.getCurrentUser()
    
    if (!currentUser) {
      router.push('/')
      return
    }

    setUser(currentUser)
    loadData()
    setLoading(false)
  }

  const loadData = async () => {
    const promises = [
      loadShifts(),
      loadUnavailableDates(),
      loadSwapRequests()
    ]
    
    if (user?.role === 'MANAGER' || user?.role === 'ADMIN') {
      promises.push(loadUsers())
      promises.push(loadPendingSwapRequests())
    }
    
    await Promise.all(promises)
  }

  const loadShifts = async () => {
    const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
    const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)

    const { data } = await supabase
      .from('shifts')
      .select(`
        *,
        user:assigned_to(name, department, role)
      `)
      .gte('shift_date', startOfMonth.toISOString().split('T')[0])
      .lte('shift_date', endOfMonth.toISOString().split('T')[0])
      .order('shift_date')

    setShifts(data || [])
  }

  const loadUnavailableDates = async () => {
    if (!user) return
    
    const { data } = await supabase
      .from('unavailable_dates')
      .select('*')
      .eq('user_id', user.id)

    setUnavailableDates(data || [])
  }

  const loadSwapRequests = async () => {
    const { data } = await supabase
      .from('swap_requests')
      .select('*')
      .eq('status', 'pending')

    setSwapRequests(data || [])
  }

  const loadManagerData = async () => {
    await Promise.all([
      loadUsers(),
      loadPendingSwapRequests()
    ])
  }

  const loadUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('name')

    setAllUsers(data || [])
  }

  const loadPendingSwapRequests = async () => {
    const { data } = await supabase
      .from('swap_requests')
      .select(`
        *,
        requester:requester_id(name, department),
        from_shift:from_shift_id(shift_date, shift_time, department),
        to_shift:to_shift_id(shift_date, shift_time, department)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    setPendingSwapRequests(data || [])
  }

  const approveSwapRequest = async (requestId: string, approved: boolean) => {
    if (!user) return

    const { error } = await supabase
      .from('swap_requests')
      .update({
        status: approved ? 'approved' : 'rejected',
        approved_by: user.id
      })
      .eq('id', requestId)

    if (!error) {
      loadPendingSwapRequests()
      loadShifts() // Refresh shifts in case they were swapped
    }
  }

  const handleLogout = async () => {
    auth.logout()
    router.push('/')
  }

  const reserveShift = async (shiftId: string) => {
    if (!user) return

    const { error } = await supabase
      .from('shifts')
      .update({ 
        assigned_to: user.id, 
        status: 'reserved' 
      })
      .eq('id', shiftId)
      .eq('status', 'available') // Only if still available

    if (!error) {
      loadShifts()
    } else {
      alert('Nu s-a putut rezerva tura. Poate a fost deja luată.')
    }
  }

  const cancelShift = async (shiftId: string) => {
    if (!user) return

    const { error } = await supabase
      .from('shifts')
      .update({ 
        assigned_to: null, 
        status: 'available' 
      })
      .eq('id', shiftId)
      .eq('assigned_to', user.id)

    if (!error) {
      loadShifts()
    }
  }

  const createReservation = async (date: Date) => {
    if (!user || !user.department) return

    // Get reserved shifts count for this month
    const month = date.getMonth()
    const year = date.getFullYear()
    const reservedCount = shifts.filter(shift => {
      const shiftDate = new Date(shift.shift_date)
      return shift.assigned_to === user.id &&
             shift.status === 'reserved' &&
             shiftDate.getMonth() === month &&
             shiftDate.getFullYear() === year
    }).length

    // Check if user has reached the limit
    if (reservedCount >= 2) {
      alert('Poți rezerva maxim 2 ture pe lună!')
      return
    }

    // Create new shift
    const { error } = await supabase
      .from('shifts')
      .insert({
        shift_date: date.toISOString().split('T')[0],
        department: user.department,
        assigned_to: user.id,
        status: 'reserved',
        shift_time: '24h'
      })

    if (!error) {
      loadShifts()
    } else {
      alert('Nu s-a putut crea rezervarea.')
    }
  }

  const markUnavailable = async (date: Date) => {
    if (!user) return

    const dateStr = date.toISOString().split('T')[0]
    
    const { error } = await supabase
      .from('unavailable_dates')
      .insert({
        user_id: user.id,
        unavailable_date: dateStr
      })

    if (!error) {
      loadUnavailableDates()
    }
  }

  const removeUnavailable = async (date: Date) => {
    if (!user) return

    const dateStr = date.toISOString().split('T')[0]
    
    const { error } = await supabase
      .from('unavailable_dates')
      .delete()
      .eq('user_id', user.id)
      .eq('unavailable_date', dateStr)

    if (!error) {
      loadUnavailableDates()
    }
  }

  const deleteShift = async (shiftId: string) => {
    if (!user || user.role !== 'ADMIN') return

    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('id', shiftId)

    if (!error) {
      loadShifts()
    } else {
      alert('Nu s-a putut șterge tura.')
    }
  }

  const deleteAllShifts = async () => {
    if (!user || user.role !== 'ADMIN') return

    if (!confirm('Sigur vrei să ștergi TOATE turele? Această acțiune nu poate fi anulată!')) {
      return
    }

    const { error } = await supabase
      .from('shifts')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (!error) {
      alert('Toate turele au fost șterse!')
      loadShifts()
    } else {
      alert('Eroare la ștergerea turelor: ' + error.message)
    }
  }

  const exportToCSV = () => {
    if (!user) return
    
    const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
    const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
    
    // Get all shifts for the month
    const monthShifts = shifts.filter(shift => {
      const shiftDate = new Date(shift.shift_date)
      return shiftDate >= startOfMonth && shiftDate <= endOfMonth
    })

    // Create a map of shifts by date and department
    const shiftsByDateAndDept: Record<string, Record<string, string>> = {}
    
    // Initialize all dates in the month
    const currentDate = new Date(startOfMonth)
    while (currentDate <= endOfMonth) {
      const dateStr = currentDate.toLocaleDateString('ro-RO')
      shiftsByDateAndDept[dateStr] = {
        'Medicina Interna': '',
        'Chirurgie': '',
        'Urgente': '',
        'ATI': ''
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    // Fill in the assigned staff for each shift
    monthShifts.forEach(shift => {
      const dateStr = new Date(shift.shift_date).toLocaleDateString('ro-RO')
      const staffName = shift.user?.name || 'Neasignat'
      if (shiftsByDateAndDept[dateStr]) {
        shiftsByDateAndDept[dateStr][shift.department] = staffName
      }
    })

    // Create CSV content with department columns
    const headers = ['Data', 'Interne', 'Chirurgie', 'CPU', 'ATI']
    const rows = Object.entries(shiftsByDateAndDept).map(([date, depts]) => [
      date,
      depts['Medicina Interna'] || '',
      depts['Chirurgie'] || '',
      depts['Urgente'] || '', // CPU is Urgente
      depts['ATI'] || ''
    ])

    // Helper function to escape CSV values
    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n')

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    const monthNames = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 
                       'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie']
    const monthName = monthNames[selectedDate.getMonth()]
    link.download = `Garzi ${monthName} ${selectedDate.getFullYear()}.csv`
    link.click()
  }

  const userShifts = shifts.filter(shift => shift.assigned_to === user?.id)
  const availableShifts = shifts.filter(shift => shift.status === 'available')

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
              <h1 className="text-2xl font-bold text-gray-900">🏥 Degarda</h1>
              <p className="text-gray-600">
                {user.name} - {user.role === 'MANAGER' ? 'Manager' : user.role === 'ADMIN' ? 'Admin' : 'Personal'} {user.department ? `(${user.department})` : ''}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowSwapModal(true)}
                disabled={userShifts.length === 0}
                className="btn btn-secondary"
                title={userShifts.length === 0 ? 'Nu ai ture de schimbat' : ''}
              >
                🔄 Schimb Tură
              </button>
              <button
                onClick={exportToCSV}
                className="btn btn-secondary"
              >
                📊 Descarca Excel
              </button>
              {(user.role === 'MANAGER' || user.role === 'ADMIN') && (
                <>
                  <button
                    onClick={() => setShowSwapRequests(!showSwapRequests)}
                    className="btn btn-secondary relative"
                  >
                    🔄 Cereri
                    {pendingSwapRequests.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {pendingSwapRequests.length}
                      </span>
                    )}
                  </button>
                </>
              )}
              {user.role === 'ADMIN' && (
                <button
                  onClick={deleteAllShifts}
                  className="btn btn-danger"
                  title="Șterge toate turele (doar pentru testare)"
                >
                  🗑️ Șterge Tot
                </button>
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

        {/* Department Calendars */}
        <div className="space-y-6">
          {DEPARTMENTS.map(department => (
            <DepartmentCalendar
              key={department}
              department={department}
              shifts={shifts}
              unavailableDates={unavailableDates}
              onReserveShift={reserveShift}
              onCancelShift={cancelShift}
              onMarkUnavailable={markUnavailable}
              onRemoveUnavailable={removeUnavailable}
              onDeleteShift={deleteShift}
              onCreateReservation={createReservation}
              currentUser={user}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              pendingSwapRequests={swapRequests}
              users={allUsers}
              onShiftsGenerated={loadShifts}
            />
          ))}
        </div>

        <SwapRequestModal
          isOpen={showSwapModal}
          onClose={() => setShowSwapModal(false)}
          currentUser={user}
          userShifts={userShifts}
          targetShifts={shifts.filter(s => s.assigned_to !== user.id && s.assigned_to !== null)}
          onSwapRequested={() => {
            alert('Cererea de schimb a fost trimisă!')
            // Optionally reload shifts or swap requests
          }}
        />

      </main>

      {/* Manager/Admin: Swap Requests Panel */}
      {(user?.role === 'MANAGER' || user?.role === 'ADMIN') && showSwapRequests && (
        <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl border-l z-40 overflow-y-auto">
          <div className="sticky top-0 bg-white border-b p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                🔄 Cereri de Schimb ({pendingSwapRequests.length})
              </h2>
              <button
                onClick={() => setShowSwapRequests(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {pendingSwapRequests.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Nu există cereri de schimb în așteptare
              </p>
            ) : (
              pendingSwapRequests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 bg-gray-50"
                >
                  <h3 className="font-medium text-gray-900 mb-2">
                    {request.requester?.name} ({request.requester?.department})
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                    <div>
                      <p className="font-medium">Din:</p>
                      <p>📅 {new Date(request.from_shift?.shift_date || '').toLocaleDateString('ro-RO')}</p>
                      <p>⏰ 24 ore</p>
                    </div>
                    <div>
                      <p className="font-medium">În:</p>
                      <p>📅 {new Date(request.to_shift?.shift_date || '').toLocaleDateString('ro-RO')}</p>
                      <p>⏰ 24 ore</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => approveSwapRequest(request.id, true)}
                      className="btn btn-success text-sm flex-1"
                    >
                      ✅ Aprobă
                    </button>
                    <button
                      onClick={() => approveSwapRequest(request.id, false)}
                      className="btn btn-danger text-sm flex-1"
                    >
                      ❌ Respinge
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}