'use client'

import { useRouter } from 'next/navigation'
import withAuth, { WithAuthProps } from '@/components/withAuth'
import { StaffDashboard } from '@/components/dashboards/StaffDashboard'
import { AdminDashboard } from '@/components/dashboards/AdminDashboard'

interface UnifiedDashboardProps extends WithAuthProps {}

function UnifiedDashboard({ user, isLoading: authLoading, error: authError }: UnifiedDashboardProps) {
  const router = useRouter()

  const handleLogout = async () => {
    // Clear HTTP-only cookie via logout API
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      // Continue with logout even if API call fails
    }
    
    // Clear any remaining localStorage/sessionStorage
    localStorage.clear()
    sessionStorage.clear()
    router.push('/')
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    router.push('/login')
    return null
  }

  // Route to appropriate dashboard based on role
  switch (user.role) {
    case 'staff':
      return <StaffDashboard user={user} onLogout={handleLogout} />

    case 'manager':
    case 'admin':
      return <AdminDashboard user={user} isLoading={false} error={null} />

    default:
      // Fallback for unknown roles
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <span className="text-6xl mb-4 block">❓</span>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Unknown Role</h1>
            <p className="text-gray-600 mb-6">
              Your account role ({user.role}) is not recognized by the system.
            </p>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Log Out
            </button>
          </div>
        </div>
      )
  }
}

export default withAuth(UnifiedDashboard)