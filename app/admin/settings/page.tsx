'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { showToast } from '@/components/Toast'

export default function SettingsPage() {
  const router = useRouter()
  const [isClearing, setIsClearing] = useState(false)

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

        {/* Instructions */}
        <Card className="mt-6">
          <div className="p-6">
            <h2 className="text-lg font-bold mb-4">După curățarea bazei de date:</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-label-secondary">
              <li>Vei fi redirecționat la pagina de selectare spital</li>
              <li>Adaugă spitalele dorite din meniul "Spitale"</li>
              <li>Adaugă personalul pentru fiecare spital din meniul "Personal"</li>
              <li>Primul utilizator adăugat ar trebui să aibă rol de "admin"</li>
              <li>Gărzile pot fi generate automat sau adăugate manual</li>
            </ol>
          </div>
        </Card>
      </div>
    </div>
  )
}