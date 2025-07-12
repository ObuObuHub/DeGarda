'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { showToast } from '@/components/Toast'

export default function SettingsPage() {
  const router = useRouter()
  const [isClearing, setIsClearing] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)

  const handleClearDatabase = async () => {
    const confirmed = confirm(
      'ATENȚIE! Această acțiune va șterge:\n\n' +
      '• Toate spitalele\n' +
      '• Tot personalul\n' +
      '• Toate gărzile\n' +
      '• Toate rezervările\n' +
      '• Toate cererile de schimb\n' +
      '• Toate notificările\n\n' +
      'Această acțiune NU poate fi anulată!\n\n' +
      'Ești sigur că vrei să continui?'
    )

    if (!confirmed) return

    const doubleConfirmed = confirm('Confirmă din nou pentru a șterge TOATE datele!')
    if (!doubleConfirmed) return

    try {
      setIsClearing(true)
      const response = await fetch('/api/admin/clear-database', {
        method: 'DELETE'
      })

      if (response.ok) {
        showToast('success', 'Succes', 'Baza de date a fost curățată!')
        // Clear local storage and redirect to hospital selection
        localStorage.removeItem('selectedHospitalId')
        sessionStorage.removeItem('selectedHospitalId')
        setTimeout(() => {
          router.push('/')
        }, 2000)
      } else {
        const data = await response.json()
        showToast('error', 'Eroare', data.error || 'Nu s-a putut curăța baza de date')
      }
    } catch (error) {
      showToast('error', 'Eroare', 'Eroare la conectarea cu serverul')
    } finally {
      setIsClearing(false)
    }
  }

  const handleInitSchema = async () => {
    try {
      setIsInitializing(true)
      const response = await fetch('/api/admin/init-schema', {
        method: 'POST'
      })

      if (response.ok) {
        showToast('success', 'Succes', 'Schema bazei de date a fost inițializată!')
      } else {
        const data = await response.json()
        showToast('error', 'Eroare', data.error || 'Nu s-a putut inițializa schema')
      }
    } catch (error) {
      showToast('error', 'Eroare', 'Eroare la conectarea cu serverul')
    } finally {
      setIsInitializing(false)
    }
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-label-primary">Setări Admin</h1>
          <p className="text-label-secondary mt-1">Configurări avansate pentru administratori</p>
        </div>

        {/* Danger Zone */}
        <Card className="border-red-200 bg-red-50">
          <div className="p-6">
            <h2 className="text-xl font-bold text-red-800 mb-4">Zonă Periculoasă</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-red-700 mb-2">Curățare Bază de Date</h3>
                <p className="text-sm text-red-600 mb-4">
                  Șterge toate datele din aplicație. Această acțiune nu poate fi anulată!
                </p>
                <Button
                  variant="danger"
                  onClick={handleClearDatabase}
                  disabled={isClearing}
                  icon={isClearing ? undefined : "trash"}
                >
                  {isClearing ? 'Se șterge...' : 'Șterge Toate Datele'}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Database Setup */}
        <Card className="mt-6">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Configurare Bază de Date</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Inițializare Schema</h3>
                <p className="text-sm text-label-secondary mb-4">
                  Creează toate tabelele necesare în baza de date. Rulează aceasta dacă vezi erori despre tabele lipsă.
                </p>
                <Button
                  variant="primary"
                  onClick={handleInitSchema}
                  disabled={isInitializing}
                  icon={isInitializing ? undefined : "database"}
                >
                  {isInitializing ? 'Se inițializează...' : 'Inițializează Schema'}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Instructions */}
        <Card className="mt-6">
          <div className="p-6">
            <h2 className="text-lg font-bold mb-4">Instrucțiuni:</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-label-secondary">
              <li>Dacă vezi erori despre tabele lipsă, apasă "Inițializează Schema" mai întâi</li>
              <li>După curățarea bazei de date, vei fi redirecționat</li>
              <li>Adaugă spitalele dorite din meniul "Spitale"</li>
              <li>Adaugă personalul pentru fiecare spital din meniul "Personal"</li>
              <li>Gărzile pot fi generate automat sau adăugate manual</li>
            </ol>
          </div>
        </Card>
      </div>
    </div>
  )
}