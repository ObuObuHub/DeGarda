'use client'

import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useHospital } from '@/contexts/HospitalContext'

export default function AdminDashboard() {
  const router = useRouter()
  const { selectedHospital } = useHospital()

  const handleLogout = async () => {
    // Temporarily disabled
    router.push('/')
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-label-primary">
            Panou Principal
          </h1>
          {selectedHospital && (
            <p className="text-sm text-label-secondary mt-1">
              {selectedHospital.name} • {selectedHospital.city}
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-system-blue/10 to-system-blue/5 border border-system-blue/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-system-blue">2</p>
                <p className="text-label-secondary text-sm mt-1">Spitale Active</p>
              </div>
              <div className="w-12 h-12 bg-system-blue/10 rounded-ios flex items-center justify-center">
                <span className="text-system-blue text-2xl">🏥</span>
              </div>
            </div>
          </Card>
          
          <Card className="bg-gradient-to-br from-system-green/10 to-system-green/5 border border-system-green/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-system-green">11</p>
                <p className="text-label-secondary text-sm mt-1">Personal Medical</p>
              </div>
              <div className="w-12 h-12 bg-system-green/10 rounded-ios flex items-center justify-center">
                <span className="text-system-green text-2xl">👥</span>
              </div>
            </div>
          </Card>
          
          <Card className="bg-gradient-to-br from-system-orange/10 to-system-orange/5 border border-system-orange/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-system-orange">0</p>
                <p className="text-label-secondary text-sm mt-1">Gărzi Azi</p>
              </div>
              <div className="w-12 h-12 bg-system-orange/10 rounded-ios flex items-center justify-center">
                <span className="text-system-orange text-2xl">📅</span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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