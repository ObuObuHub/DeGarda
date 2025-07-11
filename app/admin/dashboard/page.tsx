'use client'

import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { HospitalSelector } from '@/components/HospitalSelector'
import { NotificationBell } from '@/components/NotificationBell'
import { useHospital } from '@/contexts/HospitalContext'

export default function AdminDashboard() {
  const router = useRouter()
  const { selectedHospital } = useHospital()

  const handleLogout = async () => {
    // Temporarily disabled
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-background-secondary p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-label-primary">
              Panou Administrator
            </h1>
            {selectedHospital && (
              <p className="text-sm text-label-secondary mt-1">
                {selectedHospital.city}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <HospitalSelector />
            <NotificationBell userId="1" />
            <Button variant="ghost" onClick={handleLogout}>
              Deconectare
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <div className="text-center">
              <p className="text-3xl font-bold text-system-blue">2</p>
              <p className="text-label-secondary">Spitale</p>
            </div>
          </Card>
          
          <Card>
            <div className="text-center">
              <p className="text-3xl font-bold text-system-green">11</p>
              <p className="text-label-secondary">Personal Medical</p>
            </div>
          </Card>
          
          <Card>
            <div className="text-center">
              <p className="text-3xl font-bold text-system-orange">0</p>
              <p className="text-label-secondary">Gărzi Azi</p>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <h2 className="text-lg font-semibold mb-4">Acțiuni Rapide</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card hoverable onClick={() => router.push('/admin/staff')}>
            <div className="text-center py-4">
              <p className="text-lg font-medium">Gestionează Personal</p>
              <p className="text-sm text-label-secondary mt-1">Adaugă sau editează doctori</p>
            </div>
          </Card>
          
          <Card hoverable onClick={() => router.push('/admin/hospitals')}>
            <div className="text-center py-4">
              <p className="text-lg font-medium">Gestionează Spitale</p>
              <p className="text-sm text-label-secondary mt-1">Configurează unități</p>
            </div>
          </Card>
          
          <Card hoverable onClick={() => router.push('/admin/schedule')}>
            <div className="text-center py-4">
              <p className="text-lg font-medium">Vezi Programul</p>
              <p className="text-sm text-label-secondary mt-1">Vezi toate gărzile</p>
            </div>
          </Card>
          
          <Card hoverable onClick={() => router.push('/admin/swaps')}>
            <div className="text-center py-4">
              <p className="text-lg font-medium">Cereri de Schimb</p>
              <p className="text-sm text-label-secondary mt-1">Aprobă sau respinge schimburi</p>
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Activitate Recentă</h2>
          <Card>
            <div className="text-center py-8 text-label-tertiary">
              <p>Nicio activitate recentă</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}