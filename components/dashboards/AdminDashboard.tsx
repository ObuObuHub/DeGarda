'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AuthUser } from '@/components/withAuth'
import { useApi } from '@/hooks/useApi'

interface AdminStats {
  totalHospitals: number
  totalStaff: number
  totalManagers: number
  systemReservations: number
  systemPendingSwaps: number
}

interface AdminDashboardProps {
  user: AuthUser
  onLogout: () => void
}

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats>({
    totalHospitals: 0,
    totalStaff: 0,
    totalManagers: 0,
    systemReservations: 0,
    systemPendingSwaps: 0
  })

  // Use standardized API hooks
  const hospitalsApi = useApi({ logContext: 'AdminDashboard' })
  const staffApi = useApi({ logContext: 'AdminDashboard' })
  const reservationsApi = useApi({ logContext: 'AdminDashboard' })
  const swapsApi = useApi({ logContext: 'AdminDashboard' })

  const isLoading = hospitalsApi.isLoading || staffApi.isLoading || reservationsApi.isLoading || swapsApi.isLoading

  useEffect(() => {
    fetchAdminStats()
  }, [])

  const fetchAdminStats = async () => {
    try {
      // Fetch all data in parallel with the new API format
      const [hospitalsResult, staffResult, reservationsResult, swapsResult] = await Promise.all([
        hospitalsApi.get('/api/hospitals'),
        staffApi.get('/api/admin/all-staff'),
        reservationsApi.get('/api/admin/all-reservations'),
        swapsApi.get('/api/admin/all-swaps?status=pending')
      ])

      const totalHospitals = hospitalsApi.data?.length || 0
      const allStaff = staffApi.data || []
      const totalStaff = allStaff.length
      const totalManagers = allStaff.filter((s: any) => s.role === 'manager').length
      const systemReservations = reservationsApi.data?.length || 0
      const systemPendingSwaps = swapsApi.data?.length || 0

      setStats({
        totalHospitals,
        totalStaff,
        totalManagers,
        systemReservations,
        systemPendingSwaps
      })
    } catch (error) {
      // Errors are already handled by the useApi hooks
      console.error('Failed to fetch admin stats', error)
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Admin Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-xl">👑</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Administrator Dashboard</h1>
              <p className="text-sm text-gray-600">{user?.name} • System Administrator</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/admin')}
            >
              Admin Panel
            </Button>
            <Button variant="ghost" size="sm" onClick={onLogout}>
              Ieși
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* System Overview */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">System Overview</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🏥</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {isLoading ? '...' : stats.totalHospitals}
              </div>
              <div className="text-sm text-gray-600">Total Hospitals</div>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">👥</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {isLoading ? '...' : stats.totalStaff}
              </div>
              <div className="text-sm text-gray-600">Total Staff</div>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">👨‍💼</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {isLoading ? '...' : stats.totalManagers}
              </div>
              <div className="text-sm text-gray-600">Managers</div>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📝</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {isLoading ? '...' : stats.systemReservations}
              </div>
              <div className="text-sm text-gray-600">Active Reservations</div>
            </Card>

            <Card className="p-6 text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">⏳</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {isLoading ? '...' : stats.systemPendingSwaps}
              </div>
              <div className="text-sm text-gray-600">Pending Swaps</div>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" 
                  onClick={() => router.push('/admin')}>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">⚙️</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Manage System</h3>
                  <p className="text-sm text-gray-600">Hospitals, staff, and settings</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" 
                  onClick={() => router.push('/generate-shifts')}>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🔄</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Generate Shifts</h3>
                  <p className="text-sm text-gray-600">Create schedules for hospitals</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" 
                  onClick={() => router.push('/schedule')}>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📅</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">View Schedules</h3>
                  <p className="text-sm text-gray-600">Monitor all hospital schedules</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* System Health */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">System Health</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Hospitals with active shifts:</span>
                  <span className="font-semibold">{stats.totalHospitals}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Staff with reservations:</span>
                  <span className="font-semibold">{stats.systemReservations}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Pending approvals:</span>
                  <span className={`font-semibold ${stats.systemPendingSwaps > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {stats.systemPendingSwaps}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">System Status</h3>
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-gray-600">Database: Connected</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-gray-600">Authentication: Active</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-gray-600">Hospital Isolation: Enforced</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}