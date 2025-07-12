'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useHospital } from '@/contexts/HospitalContext'

interface DashboardStats {
  hospitals: number
  staff: number
  todayShifts: number
  pendingSwaps: number
}

interface Activity {
  id: number
  userId: number
  userName?: string
  type: string
  description: string
  createdAt: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const { selectedHospital } = useHospital()
  const [stats, setStats] = useState<DashboardStats>({
    hospitals: 0,
    staff: 0,
    todayShifts: 0,
    pendingSwaps: 0
  })
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingActivities, setIsLoadingActivities] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
    fetchRecentActivities()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true)
      
      // Fetch hospitals count
      const hospitalsRes = await fetch('/api/hospitals')
      const hospitals = hospitalsRes.ok ? await hospitalsRes.json() : []
      
      // Fetch staff count
      const staffRes = await fetch('/api/staff')
      const staff = staffRes.ok ? await staffRes.json() : []
      
      // Fetch today's shifts count
      const today = new Date().toISOString().split('T')[0]
      const shiftsRes = await fetch(`/api/shifts?date=${today}`)
      const shifts = shiftsRes.ok ? await shiftsRes.json() : []
      
      // Fetch pending swaps count
      const swapsRes = await fetch('/api/swaps?status=pending')
      const swaps = swapsRes.ok ? await swapsRes.json() : []
      
      setStats({
        hospitals: hospitals.length,
        staff: staff.length,
        todayShifts: shifts.length,
        pendingSwaps: swaps.length
      })
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchRecentActivities = async () => {
    try {
      setIsLoadingActivities(true)
      const res = await fetch('/api/activities?limit=5')
      if (res.ok) {
        const data = await res.json()
        setActivities(data.activities || [])
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error)
    } finally {
      setIsLoadingActivities(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login': return '🔑'
      case 'logout': return '🚪'
      case 'shift_assigned': return '✅'
      case 'shift_swapped': return '🔄'
      case 'shift_reserved': return '📌'
      case 'staff_created': return '👤'
      case 'staff_updated': return '✏️'
      case 'hospital_created': return '🏥'
      case 'schedule_generated': return '📅'
      default: return '📝'
    }
  }

  const formatActivityTime = (createdAt: string) => {
    const date = new Date(createdAt)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Chiar acum'
    if (minutes < 60) return `${minutes} minute în urmă`
    if (hours < 24) return `${hours} ore în urmă`
    return `${days} zile în urmă`
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-label-primary">
              Panou Principal
            </h1>
            {selectedHospital && (
              <p className="text-sm text-label-secondary mt-1">
                {selectedHospital.name} • {selectedHospital.city}
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-system-blue/10 to-system-blue/5 border border-system-blue/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl lg:text-3xl font-bold text-system-blue">
                  {isLoading ? '...' : stats.hospitals}
                </p>
                <p className="text-label-secondary text-sm mt-1">Spitale Active</p>
              </div>
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-system-blue/10 rounded-ios flex items-center justify-center">
                <span className="text-system-blue text-xl lg:text-2xl">🏥</span>
              </div>
            </div>
          </Card>
          
          <Card className="bg-gradient-to-br from-system-green/10 to-system-green/5 border border-system-green/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl lg:text-3xl font-bold text-system-green">
                  {isLoading ? '...' : stats.staff}
                </p>
                <p className="text-label-secondary text-sm mt-1">Personal Medical</p>
              </div>
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-system-green/10 rounded-ios flex items-center justify-center">
                <span className="text-system-green text-xl lg:text-2xl">👥</span>
              </div>
            </div>
          </Card>
          
          <Card className="bg-gradient-to-br from-system-orange/10 to-system-orange/5 border border-system-orange/20 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl lg:text-3xl font-bold text-system-orange">
                  {isLoading ? '...' : stats.todayShifts}
                </p>
                <p className="text-label-secondary text-sm mt-1">Gărzi Azi</p>
              </div>
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-system-orange/10 rounded-ios flex items-center justify-center">
                <span className="text-system-orange text-xl lg:text-2xl">📅</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            Acțiuni Rapide
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card hoverable onClick={() => router.push('/admin/staff')} className="group hover:border-system-blue/30 transition-all">
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-system-blue/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">👨‍⚕️</span>
                </div>
                <p className="text-lg font-medium">Gestionează Personal</p>
                <p className="text-sm text-label-secondary mt-1">Adaugă sau editează doctori</p>
              </div>
            </Card>
            
            <Card hoverable onClick={() => router.push('/admin/hospitals')} className="group hover:border-system-purple/30 transition-all">
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-system-purple/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">🏥</span>
                </div>
                <p className="text-lg font-medium">Gestionează Spitale</p>
                <p className="text-sm text-label-secondary mt-1">Configurează unități</p>
              </div>
            </Card>
            
            <Card hoverable onClick={() => router.push('/admin/schedule')} className="group hover:border-system-green/30 transition-all">
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-system-green/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">📅</span>
                </div>
                <p className="text-lg font-medium">Vezi Programul</p>
                <p className="text-sm text-label-secondary mt-1">Vezi toate gărzile</p>
              </div>
            </Card>
            
            <Card hoverable onClick={() => router.push('/admin/swaps')} className="group hover:border-system-orange/30 transition-all">
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-system-orange/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">🔄</span>
                </div>
                <p className="text-lg font-medium">Cereri de Schimb</p>
                <p className="text-sm text-label-secondary mt-1">Aprobă sau respinge schimburi</p>
              </div>
            </Card>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">📊</span>
            Activitate Recentă
          </h2>
          <Card>
            {isLoadingActivities ? (
              <div className="text-center py-8 text-label-tertiary">
                <p>Se încarcă activitățile...</p>
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-label-tertiary">
                <p>Nicio activitate recentă</p>
              </div>
            ) : (
              <div className="divide-y divide-separator">
                {activities.map((activity) => (
                  <div key={activity.id} className="p-4 hover:bg-fill-tertiary/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl mt-0.5">{getActivityIcon(activity.type)}</span>
                      <div className="flex-1">
                        <p className="text-label-primary">
                          <span className="font-medium">{activity.userName || 'Utilizator'}</span>
                          {' '}{activity.description}
                        </p>
                        <p className="text-xs text-label-tertiary mt-1">
                          {formatActivityTime(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}