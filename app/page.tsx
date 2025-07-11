'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { HospitalSelector } from '@/components/HospitalSelector'
import { useHospital } from '@/contexts/HospitalContext'

export default function Home() {
  const router = useRouter()
  const { selectedHospital } = useHospital()
  const [isLoading, setIsLoading] = useState(false)

  const handleContinue = () => {
    setIsLoading(true)
    router.push('/admin/dashboard')
  }

  return (
    <div className="min-h-screen bg-background-secondary flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-label-primary mb-2">
            DeGarda
          </h1>
          <p className="text-label-secondary">
            Sistem de gestionare a gărzilor medicale
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-label-secondary mb-2">
              Selectează Spitalul
            </label>
            <HospitalSelector />
            {selectedHospital && (
              <p className="text-sm text-label-tertiary mt-2">
                {selectedHospital.city} • {selectedHospital.departments} secții • {selectedHospital.staff} personal
              </p>
            )}
          </div>

          <Button 
            onClick={handleContinue}
            fullWidth
            disabled={isLoading}
          >
            {isLoading ? 'Se încarcă...' : 'Continuă'}
          </Button>
        </div>

        <div className="mt-8 pt-6 border-t border-separator text-center">
          <p className="text-xs text-label-tertiary">
            Versiunea 2.0 • 2025
          </p>
        </div>
      </Card>
    </div>
  )
}