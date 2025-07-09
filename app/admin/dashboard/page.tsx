'use client'

import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function AdminDashboard() {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-background-secondary p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-label-primary">
            Admin Dashboard
          </h1>
          <Button variant="ghost" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <div className="text-center">
              <p className="text-3xl font-bold text-system-blue">2</p>
              <p className="text-label-secondary">Hospitals</p>
            </div>
          </Card>
          
          <Card>
            <div className="text-center">
              <p className="text-3xl font-bold text-system-green">1</p>
              <p className="text-label-secondary">Staff Members</p>
            </div>
          </Card>
          
          <Card>
            <div className="text-center">
              <p className="text-3xl font-bold text-system-orange">0</p>
              <p className="text-label-secondary">Shifts Today</p>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card hoverable onClick={() => router.push('/admin/staff')}>
            <div className="text-center py-4">
              <p className="text-lg font-medium">Manage Staff</p>
              <p className="text-sm text-label-secondary mt-1">Add or edit doctors</p>
            </div>
          </Card>
          
          <Card hoverable onClick={() => router.push('/admin/hospitals')}>
            <div className="text-center py-4">
              <p className="text-lg font-medium">Manage Hospitals</p>
              <p className="text-sm text-label-secondary mt-1">Configure facilities</p>
            </div>
          </Card>
          
          <Card hoverable onClick={() => router.push('/admin/schedule')}>
            <div className="text-center py-4">
              <p className="text-lg font-medium">View Schedule</p>
              <p className="text-sm text-label-secondary mt-1">See all shifts</p>
            </div>
          </Card>
          
          <Card hoverable onClick={() => router.push('/admin/swaps')}>
            <div className="text-center py-4">
              <p className="text-lg font-medium">Swap Requests</p>
              <p className="text-sm text-label-secondary mt-1">Approve or deny swaps</p>
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <Card>
            <div className="text-center py-8 text-label-tertiary">
              <p>No recent activity</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}