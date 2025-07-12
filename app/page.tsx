'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface Hospital {
  id: string
  name: string
  city: string
  staff?: number
}

export default function HospitalSelectionPage() {
  const router = useRouter()
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchHospitals()
  }, [])

  const fetchHospitals = async () => {
    try {
      const response = await fetch('/api/hospitals')
      if (response.ok) {
        const data = await response.json()
        setHospitals(data)
      }
    } catch (error) {
      console.error('Failed to fetch hospitals:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectHospital = (hospitalId: string) => {
    // Store hospital selection and go directly to dashboard
    localStorage.setItem('selectedHospitalId', hospitalId)
    router.push('/admin/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">DeGarda</h1>
          <p className="text-xl text-gray-600">Selectează spitalul pentru a continua</p>
        </div>

        {/* Hospital Cards */}
        {isLoading ? (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Se încarcă spitalele...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hospitals.map((hospital) => (
              <Card
                key={hospital.id}
                hoverable
                className="p-8 transform transition-all duration-200 hover:scale-105 bg-white hover:shadow-2xl"
              >
                <div className="text-center space-y-4">
                  {/* Hospital Icon */}
                  <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-5xl">🏥</span>
                  </div>
                  
                  {/* Hospital Info */}
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{hospital.name}</h3>
                    <p className="text-gray-600 text-lg">{hospital.city}</p>
                    {hospital.staff && (
                      <p className="text-sm text-gray-500 mt-2">{hospital.staff} membri personal</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 space-y-3">
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={() => handleSelectHospital(hospital.id)}
                    >
                      Dashboard Admin
                    </Button>
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={() => {
                        localStorage.setItem('selectedHospitalId', hospital.id)
                        router.push('/staff')
                      }}
                    >
                      Portal Personal Medical
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}


        {/* Footer */}
        <div className="text-center mt-12 text-gray-500">
          <p>© 2024 DeGarda. Toate drepturile rezervate.</p>
        </div>
      </div>
    </div>
  )
}