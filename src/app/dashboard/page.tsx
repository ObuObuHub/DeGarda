'use client'

import { useState, useEffect } from 'react'
import { supabase, type User, type Shift, type UnavailableDate, type SwapRequest } from '@/lib/supabase'
import { auth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import {} from '@/types'
import DepartmentCalendar from '@/components/DepartmentCalendar'
import { DEPARTMENTS } from '@/types'
import { parseISODate, formatDateForDB, getFirstDayOfMonth, getLastDayOfMonth } from '@/lib/dateUtils'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [unavailableDates, setUnavailableDates] = useState<UnavailableDate[]>([])
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [allUsers, setAllUsers] = useState<User[]>([])
  const router = useRouter()

  useEffect(() => {
    checkUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  useEffect(() => {
    if (user) {
      loadShifts()
      loadSwapRequests() // Load swap requests when date changes too
      if (user.role === 'MANAGER' || user.role === 'ADMIN') {
        loadManagerData()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    }
    
    await Promise.all(promises)
  }

  const loadShifts = async () => {
    const startOfMonth = getFirstDayOfMonth(selectedDate)
    const endOfMonth = getLastDayOfMonth(selectedDate)

    const { data } = await supabase
      .from('shifts')
      .select(`
        *,
        user:assigned_to(name, department, role)
      `)
      .gte('shift_date', formatDateForDB(startOfMonth))
      .lte('shift_date', formatDateForDB(endOfMonth))
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
    if (!user) return
    
    // First try simple query
    const { data: simpleData, error: simpleError } = await supabase
      .from('swap_requests')
      .select('*')
      .or(`requester_id.eq.${user.id},target_user_id.eq.${user.id}`)
      .eq('status', 'pending')
    
    console.log('Simple swap requests:', simpleData)
    console.log('Simple error:', simpleError)
    
    // Then try with joins (might fail)
    const { data, error } = await supabase
      .from('swap_requests')
      .select(`
        *,
        requester:users!requester_id(name, department),
        target_user:users!target_user_id(name, department),
        requester_shift:shifts!requester_shift_id(shift_date, department),
        target_shift:shifts!target_shift_id(shift_date, department)
      `)
      .or(`requester_id.eq.${user.id},target_user_id.eq.${user.id}`)
      .eq('status', 'pending')

    console.log('Swap requests with joins:', data)
    console.log('Join error:', error)
    
    // Use simple data for now if joins fail
    setSwapRequests(data || simpleData || [])
  }


  const loadManagerData = async () => {
    await Promise.all([
      loadUsers()
    ])
  }

  const loadUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('name')

    setAllUsers(data || [])
  }


  const handleLogout = async () => {
    auth.logout()
    router.push('/')
  }

  const reserveShift = async (shiftId: string) => {
    if (!user) return

    // For staff, check if they can reserve this shift
    if (user.role === 'STAFF') {
      // First, get the shift to check its department
      const { data: shiftData } = await supabase
        .from('shifts')
        .select('department')
        .eq('id', shiftId)
        .single()

      if (!shiftData || shiftData.department !== user.department) {
        alert('Poți rezerva doar ture din departamentul tău!')
        return
      }
    }

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

  const createReservation = async (date: Date, department?: string) => {
    if (!user) return

    // For staff, they can only create in their own department
    if (user.role === 'STAFF') {
      if (!user.department) return
      
      // Get reserved shifts count for this month
      const month = date.getMonth()
      const year = date.getFullYear()
      const reservedCount = shifts.filter(shift => {
        const shiftDate = parseISODate(shift.shift_date)
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
    }

    // Determine which department to use
    const targetDepartment = department || user.department
    if (!targetDepartment) return

    // Create new shift
    const { error } = await supabase
      .from('shifts')
      .insert({
        shift_date: formatDateForDB(date),
        department: targetDepartment,
        assigned_to: user.role === 'STAFF' ? user.id : null,
        status: user.role === 'STAFF' ? 'reserved' : 'available',
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

    const dateStr = formatDateForDB(date)
    
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

    const dateStr = formatDateForDB(date)
    
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

  const requestSwap = async (requesterShiftId: string, targetShiftIds: string[]) => {
    if (!user) return

    // Create swap requests for each target shift
    const swapRequestsToCreate = targetShiftIds.map(targetShiftId => {
      // Find the target shift to get the user ID
      const targetShift = shifts.find(s => s.id === targetShiftId)
      if (!targetShift || !targetShift.assigned_to) return null
      
      return {
        requester_id: user.id,
        requester_shift_id: requesterShiftId,
        target_user_id: targetShift.assigned_to,
        target_shift_id: targetShiftId,
        status: 'pending'
      }
    }).filter(Boolean)

    if (swapRequestsToCreate.length === 0) {
      alert('Nu s-au putut crea cererile de schimb.')
      return
    }

    const { error } = await supabase
      .from('swap_requests')
      .insert(swapRequestsToCreate)

    if (!error) {
      await loadSwapRequests()
      alert(`${swapRequestsToCreate.length} cereri de schimb trimise!`)
    } else {
      alert('Nu s-au putut înregistra cererile de schimb.')
    }
  }

  const assignShift = async (shiftId: string, userId: string | null) => {
    if (!user || (user.role !== 'MANAGER' && user.role !== 'ADMIN')) return

    const { error } = await supabase
      .from('shifts')
      .update({ 
        assigned_to: userId,
        status: userId ? 'assigned' : 'available'
      })
      .eq('id', shiftId)

    if (!error) {
      loadShifts()
    } else {
      alert('Nu s-a putut asigna tura.')
    }
  }

  const acceptSwapRequest = async (swapRequestId: string) => {
    if (!user) return

    // Get the swap request details
    const swapRequest = swapRequests.find(sr => sr.id === swapRequestId)
    if (!swapRequest) {
      console.error('Swap request not found:', swapRequestId)
      return
    }

    console.log('Accepting swap request:', swapRequest)

    // Perform the swap in a transaction-like manner
    // Update requester's shift to go to target user
    const { data: data1, error: error1 } = await supabase
      .from('shifts')
      .update({ 
        assigned_to: swapRequest.target_user_id,
        status: 'assigned' // Ensure status is updated
      })
      .eq('id', swapRequest.requester_shift_id)
      .select()

    if (error1) {
      console.error('Error updating requester shift:', error1)
      alert(`Eroare la schimbarea turei requester: ${error1.message}`)
      return
    }
    console.log('Updated requester shift:', data1)

    // Update target's shift to go to requester
    const { data: data2, error: error2 } = await supabase
      .from('shifts')
      .update({ 
        assigned_to: swapRequest.requester_id,
        status: 'assigned' // Ensure status is updated
      })
      .eq('id', swapRequest.target_shift_id)
      .select()

    if (error2) {
      console.error('Error updating target shift:', error2)
      // Try to rollback the first update
      await supabase
        .from('shifts')
        .update({ 
          assigned_to: swapRequest.requester_id,
          status: 'assigned'
        })
        .eq('id', swapRequest.requester_shift_id)
      alert(`Eroare la schimbarea turei target: ${error2.message}`)
      return
    }
    console.log('Updated target shift:', data2)

    // Update swap request status
    const { error: error3 } = await supabase
      .from('swap_requests')
      .update({ status: 'accepted' })
      .eq('id', swapRequestId)

    // Cancel all other pending requests for the same requester shift
    await supabase
      .from('swap_requests')
      .update({ status: 'cancelled' })
      .eq('requester_shift_id', swapRequest.requester_shift_id)
      .eq('status', 'pending')
      .neq('id', swapRequestId)

    if (!error3) {
      await Promise.all([loadShifts(), loadSwapRequests()])
      alert('Schimb acceptat cu succes!')
    }
  }

  const rejectSwapRequest = async (swapRequestId: string) => {
    if (!user) return

    const { error } = await supabase
      .from('swap_requests')
      .update({ status: 'rejected' })
      .eq('id', swapRequestId)

    if (!error) {
      await loadSwapRequests()
      alert('Cerere de schimb refuzată.')
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
    
    // Get year and month from selected date
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    // Create rows for each day
    const rows = []
    for (let day = 1; day <= daysInMonth; day++) {
      // Create a proper Date object for this day at noon to avoid timezone issues
      const date = new Date(year, month, day, 12, 0, 0)
      const dateStr = formatDateForDB(date)
      
      // Find shifts for this exact date
      const dayShifts = shifts.filter(s => s.shift_date === dateStr)
      
      // Build row
      const row = {
        date: `${String(day).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.${year}`,
        medicina: '',
        chirurgie: '',
        urgente: '',
        ati: ''
      }
      
      // Fill in staff names
      dayShifts.forEach(shift => {
        if (shift.department === 'Medicina Interna') row.medicina = shift.user?.name || ''
        if (shift.department === 'Chirurgie') row.chirurgie = shift.user?.name || ''
        if (shift.department === 'Urgente') row.urgente = shift.user?.name || ''
        if (shift.department === 'ATI') row.ati = shift.user?.name || ''
      })
      
      rows.push(row)
    }
    
    // Create CSV
    const csv = [
      'Data,Interne,Chirurgie,CPU,ATI',
      ...rows.map(r => `${r.date},${r.medicina},${r.chirurgie},${r.urgente},${r.ati}`)
    ].join('\n')
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    const monthNames = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 
                       'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie']
    link.download = `Garzi ${monthNames[month]} ${year}.csv`
    link.click()
  }

  const userShifts = shifts.filter(shift => shift.assigned_to === user?.id)

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
                onClick={exportToCSV}
                className="btn btn-secondary"
              >
                📊 Descarcă Excel
              </button>
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
          {DEPARTMENTS
            .filter(department => 
              // Staff only see their own department, managers/admins see all
              user.role === 'MANAGER' || user.role === 'ADMIN' || department === user.department
            )
            .map(department => (
              <DepartmentCalendar
                key={department}
                department={department}
                shifts={shifts}
                unavailableDates={unavailableDates}
                swapRequests={swapRequests}
                onReserveShift={reserveShift}
                onCancelShift={cancelShift}
                onMarkUnavailable={markUnavailable}
                onRemoveUnavailable={removeUnavailable}
                onDeleteShift={deleteShift}
                onCreateReservation={createReservation}
                onRequestSwap={requestSwap}
                onAssignShift={assignShift}
                onAcceptSwap={acceptSwapRequest}
                onRejectSwap={rejectSwapRequest}
                currentUser={user}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                users={allUsers}
                onShiftsGenerated={loadShifts}
              />
            ))}
        </div>

      </main>
    </div>
  )
}