'use client'

import { useState, useEffect } from 'react'
import { supabase, type User, type Shift, type UnavailableDate, type SwapRequest } from '@/lib/supabase'
import { auth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import {} from '@/types'
import Calendar from '@/components/Calendar'
import SwapRequestModal from '@/components/SwapRequestModal'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [unavailableDates, setUnavailableDates] = useState<UnavailableDate[]>([])
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showSwapModal, setShowSwapModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [router])

  useEffect(() => {
    if (user) {
      loadShifts()
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
    await Promise.all([
      loadShifts(),
      loadUnavailableDates(),
      loadSwapRequests()
    ])
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

  const exportToCSV = () => {
    if (!user) return
    
    const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
    const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
    
    const monthShifts = shifts.filter(shift => {
      const shiftDate = new Date(shift.shift_date)
      return shiftDate >= startOfMonth && shiftDate <= endOfMonth
    })

    // Create CSV content
    const headers = ['Data', 'Ora', 'Departament', 'Personal', 'Status']
    const csvContent = [
      headers.join(','),
      ...monthShifts.map(shift => [
        new Date(shift.shift_date).toLocaleDateString('ro-RO'),
        shift.shift_time === 'morning' ? 'Dimineață' : 
        shift.shift_time === 'afternoon' ? 'Amiază' : 'Noapte',
        shift.department,
        shift.user?.name || 'Nedefinit',
        shift.status === 'available' ? 'Disponibil' :
        shift.status === 'reserved' ? 'Rezervat' : 'Confirmat'
      ].join(','))
    ].join('\n')

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `ture-${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}.csv`
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
                {user.name} - {user.role === 'MANAGER' ? 'Manager' : 'Personal'} ({user.department})
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
                📊 Export CSV
              </button>
              {user.role === 'MANAGER' && (
                <button
                  onClick={() => router.push('/manager')}
                  className="btn btn-primary"
                >
                  Panou Manager
                </button>
              )}
              <button onClick={handleLogout} className="btn btn-secondary">
                Ieșire
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Calendar */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Calendar
          shifts={shifts}
          unavailableDates={unavailableDates}
          onReserveShift={reserveShift}
          onCancelShift={cancelShift}
          onMarkUnavailable={markUnavailable}
          onRemoveUnavailable={removeUnavailable}
          currentUser={user}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          pendingSwapRequests={swapRequests}
        />

        <SwapRequestModal
          isOpen={showSwapModal}
          onClose={() => setShowSwapModal(false)}
          currentUser={user}
          userShifts={userShifts}
          availableShifts={availableShifts}
          onSwapRequested={() => {
            alert('Cererea de schimb a fost trimisă!')
            // Optionally reload shifts or swap requests
          }}
        />
      </main>
    </div>
  )
}