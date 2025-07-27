'use client'

import { useState, useEffect } from 'react'
import { supabase, type User, type Shift, type UnavailableDate } from '@/lib/supabase'
import { auth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import {} from '@/types'
import DepartmentCalendar from '@/components/DepartmentCalendar'
import { DEPARTMENTS } from '@/types'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [unavailableDates, setUnavailableDates] = useState<UnavailableDate[]>([])
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
      loadUnavailableDates()
    ]
    
    if (user?.role === 'MANAGER' || user?.role === 'ADMIN') {
      promises.push(loadUsers())
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
    }

    // Determine which department to use
    const targetDepartment = department || user.department
    if (!targetDepartment) return

    // Create new shift
    const { error } = await supabase
      .from('shifts')
      .insert({
        shift_date: date.toISOString().split('T')[0],
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

  const requestSwap = async (shiftId: string) => {
    if (!user) return

    const { error } = await supabase
      .from('shifts')
      .update({ status: 'pending_swap' })
      .eq('id', shiftId)
      .eq('assigned_to', user.id)

    if (!error) {
      loadShifts()
      alert('Cererea de schimb a fost înregistrată. Un manager va reasigna tura.')
    } else {
      alert('Nu s-a putut înregistra cererea de schimb.')
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
      // Create a proper Date object for this day (using the same approach as Calendar component)
      const date = new Date(year, month, day)
      const dateStr = date.toISOString().split('T')[0]
      
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
              onRequestSwap={requestSwap}
              onAssignShift={assignShift}
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