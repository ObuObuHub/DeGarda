'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import withAuth, { WithAuthProps } from '@/components/withAuth'

interface ManagementPageProps extends WithAuthProps {}

function ManagementPage({ user }: ManagementPageProps) {
  const router = useRouter()

  useEffect(() => {
    if (user) {
      // Redirect based on role to appropriate management interface
      switch (user.role) {
        case 'admin':
          // Admins go to the admin panel
          router.push('/admin')
          break
        case 'manager':
          // Managers go to their dashboard which now has all management features
          router.push('/dashboard')
          break
        default:
          // Staff and others go to dashboard
          router.push('/dashboard')
          break
      }
    }
  }, [user, router])

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-4xl mb-4">🔄</div>
        <div className="text-gray-600">Redirecting to management interface...</div>
      </div>
    </div>
  )
}

export default withAuth(ManagementPage, {
  allowedRoles: ['admin', 'manager'],
  redirectTo: '/dashboard'
})