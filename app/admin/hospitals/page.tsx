'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { HospitalModal } from '@/components/HospitalModal'
import { Hospital } from '@/lib/data'

export default function HospitalsPage() {
  const router = useRouter()
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingHospital, setEditingHospital] = useState<Hospital | undefined>()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch hospitals from API
  useEffect(() => {
    fetchHospitals()
  }, [])

  const fetchHospitals = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/hospitals')
      if (!response.ok) {
        throw new Error('Failed to fetch hospitals')
      }
      const data = await response.json()
      setHospitals(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingHospital(undefined)
    setIsModalOpen(true)
  }

  const handleEdit = (hospital: Hospital) => {
    setEditingHospital(hospital)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Sigur vrei să ștergi acest spital?')) {
      try {
        const response = await fetch(`/api/hospitals/${id}`, {
          method: 'DELETE',
        })
        
        if (!response.ok) {
          const error = await response.json()
          alert(error.error || 'Failed to delete hospital')
          return
        }
        
        // Refresh the list
        await fetchHospitals()
      } catch (err) {
        alert('An error occurred while deleting the hospital')
      }
    }
  }

  const handleSave = async (hospitalData: Omit<Hospital, 'id'>) => {
    try {
      if (editingHospital) {
        // Edit existing
        const response = await fetch(`/api/hospitals/${editingHospital.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(hospitalData),
        })
        
        if (!response.ok) {
          const error = await response.json()
          alert(error.error || 'Failed to update hospital')
          return
        }
      } else {
        // Add new
        const response = await fetch('/api/hospitals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(hospitalData),
        })
        
        if (!response.ok) {
          const error = await response.json()
          alert(error.error || 'Failed to create hospital')
          return
        }
      }
      
      // Refresh the list and close modal
      await fetchHospitals()
      setIsModalOpen(false)
    } catch (err) {
      alert('An error occurred while saving the hospital')
    }
  }

  return (
    <div className="min-h-screen bg-background-secondary p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-label-primary">
              Gestionare Spitale
            </h1>
            <p className="text-label-secondary mt-1">
              Configurează unitățile medicale
            </p>
          </div>
          <div className="space-x-2">
            <Button variant="ghost" onClick={() => router.push('/admin/dashboard')}>
              Înapoi
            </Button>
            <Button onClick={handleAdd}>
              Adaugă Spital
            </Button>
          </div>
        </div>

        {/* Loading and Error States */}
        {isLoading && (
          <div className="text-center py-8">
            <p className="text-label-secondary">Se încarcă spitalele...</p>
          </div>
        )}
        
        {error && (
          <div className="text-center py-8">
            <p className="text-red-500">{error}</p>
            <Button onClick={fetchHospitals} className="mt-2">
              Reîncearcă
            </Button>
          </div>
        )}

        {/* Hospitals Grid */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hospitals.map(hospital => (
            <Card key={hospital.id} hoverable>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{hospital.name}</h3>
                  <p className="text-label-secondary">{hospital.city}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-label-tertiary">Secții</p>
                    <p className="font-medium">{hospital.departments || 0}</p>
                  </div>
                  <div>
                    <p className="text-label-tertiary">Personal</p>
                    <p className="font-medium">{hospital.staff || 0}</p>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(hospital)}>
                    Editează
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(hospital.id)}>
                    Șterge
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          </div>
        )}
      </div>

      <HospitalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        hospital={editingHospital}
      />
    </div>
  )
}