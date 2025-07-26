'use client'

import { useState, useEffect } from 'react'
import { supabase, type User, type SwapRequest, type Shift, type UnavailableDate } from '@/lib/supabase'
import { auth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { DEPARTMENTS, SHIFT_TIMES, Department } from '@/types'
import ShiftGenerator from '@/components/ShiftGenerator'

export default function ManagerPage() {
  const [user, setUser] = useState<User | null>(null)
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [unavailableDates, setUnavailableDates] = useState<UnavailableDate[]>([])
  const [loading, setLoading] = useState(true)
  const [showGenerator, setShowGenerator] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [router])

  const checkUser = async () => {
    const currentUser = auth.getCurrentUser()
    
    if (!currentUser) {
      router.push('/')
      return
    }

    if (currentUser.role !== 'MANAGER') {
      router.push('/dashboard')
      return
    }

    setUser(currentUser)
    loadData()
    setLoading(false)
  }

  const loadData = async () => {
    await Promise.all([
      loadSwapRequests(),
      loadUsers(),
      loadShifts(),
      loadUnavailableDates()
    ])
  }

  const loadUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('name')

    setAllUsers(data || [])
  }

  const loadShifts = async () => {
    const { data } = await supabase
      .from('shifts')
      .select('*')

    setShifts(data || [])
  }

  const loadUnavailableDates = async () => {
    const { data } = await supabase
      .from('unavailable_dates')
      .select('*')

    setUnavailableDates(data || [])
  }

  const loadSwapRequests = async () => {
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

    setSwapRequests(data || [])
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
      // If approved, swap the shifts
      if (approved) {
        const request = swapRequests.find(r => r.id === requestId)
        if (request) {
          // This would need more complex logic to actually swap the assignments
          // For now, just reload the requests
        }
      }
      loadSwapRequests()
    }
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
              <h1 className="text-2xl font-bold text-gray-900">👨‍💼 Panou Manager</h1>
              <p className="text-gray-600">{user.name} - {user.department}</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn btn-secondary"
            >
              ← Înapoi la Calendar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Shift Generation */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">🗓️ Generare Ture</h2>
            <button
              onClick={() => setShowGenerator(true)}
              className="btn btn-primary"
            >
              ✨ Generator Nou
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900">Total Ture</h3>
              <p className="text-2xl font-bold text-blue-700">{shifts.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-900">Ture Asignate</h3>
              <p className="text-2xl font-bold text-green-700">
                {shifts.filter(s => s.assigned_to).length}
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="font-medium text-yellow-900">Ture Libere</h3>
              <p className="text-2xl font-bold text-yellow-700">
                {shifts.filter(s => !s.assigned_to).length}
              </p>
            </div>
          </div>
        </div>

        {/* Swap Requests */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-6">
            🔄 Cereri de Schimb ({swapRequests.length})
          </h2>

          {swapRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nu există cereri de schimb în așteptare
            </p>
          ) : (
            <div className="space-y-4">
              {swapRequests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-2">
                        {request.requester?.name} ({request.requester?.department})
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <p className="font-medium">Din:</p>
                          <p>📅 {new Date(request.from_shift?.shift_date || '').toLocaleDateString('ro-RO')}</p>
                          <p>⏰ {request.from_shift?.shift_time === 'morning' ? 'Dimineață' : 
                                request.from_shift?.shift_time === 'afternoon' ? 'Amiază' : 'Noapte'}</p>
                          <p>🏥 {request.from_shift?.department}</p>
                        </div>
                        <div>
                          <p className="font-medium">În:</p>
                          <p>📅 {new Date(request.to_shift?.shift_date || '').toLocaleDateString('ro-RO')}</p>
                          <p>⏰ {request.to_shift?.shift_time === 'morning' ? 'Dimineață' : 
                                request.to_shift?.shift_time === 'afternoon' ? 'Amiază' : 'Noapte'}</p>
                          <p>🏥 {request.to_shift?.department}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => approveSwapRequest(request.id, true)}
                        className="btn btn-success text-sm"
                      >
                        ✅ Aprobă
                      </button>
                      <button
                        onClick={() => approveSwapRequest(request.id, false)}
                        className="btn btn-danger text-sm"
                      >
                        ❌ Respinge
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Shift Generator Modal */}
      <ShiftGenerator
        isOpen={showGenerator}
        onClose={() => setShowGenerator(false)}
        onGenerated={() => {
          loadShifts()
          setShowGenerator(false)
        }}
        existingShifts={shifts}
        unavailableDates={unavailableDates}
        users={allUsers}
      />
    </div>
  )
}