'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import withAuth, { AuthUser, WithAuthProps } from '@/components/withAuth'
import { DashboardStats } from '@/components/admin/DashboardStats'
import { QuickActions } from '@/components/admin/QuickActions'
import { PendingSwapApprovals } from '@/components/admin/PendingSwapApprovals'
import { RoleInformation } from '@/components/admin/RoleInformation'

interface AdminDashboardProps extends WithAuthProps {
  // Additional props if needed
}

function AdminDashboard({ user, isLoading, error }: AdminDashboardProps) {
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

  const handleRefreshData = () => {
    // This will trigger re-fetch in child components
    window.location.reload()
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Dashboard {user?.role === 'admin' ? 'Administrator' : 'Manager'}
            </h1>
            <p className="text-gray-600">
              Bun venit, {user?.name}! {user?.role === 'admin' ? 'Acces complet sistem' : `${user?.hospitalName}`}
            </p>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            Ieși
          </Button>
        </div>

        {/* Stats Overview */}
        <DashboardStats user={user} />

        {/* Quick Actions */}
        <QuickActions user={user} onRefresh={handleRefreshData} />

        {/* Pending Swap Approvals */}
        <PendingSwapApprovals user={user} onSwapAction={handleRefreshData} />

        {/* Role-specific Information */}
        <RoleInformation user={user} />
      </div>
    </div>
  )
}

export default withAuth(AdminDashboard, {
  allowedRoles: ['admin', 'manager'],
  redirectTo: '/'
})