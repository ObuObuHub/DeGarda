'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { HospitalModal } from '@/components/HospitalModal'
import { hospitals as initialHospitals, Hospital } from '@/lib/data'

export default function HospitalsPage() {
  const router = useRouter()
  const [hospitals, setHospitals] = useState(initialHospitals)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingHospital, setEditingHospital] = useState<Hospital | undefined>()

  const handleAdd = () => {
    setEditingHospital(undefined)
    setIsModalOpen(true)
  }

  const handleEdit = (hospital: Hospital) => {
    setEditingHospital(hospital)
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Sigur vrei să ștergi acest spital?')) {
      setHospitals(hospitals.filter(h => h.id !== id))
    }
  }

  const handleSave = (hospitalData: Omit<Hospital, 'id'>) => {
    if (editingHospital) {
      // Edit existing
      setHospitals(hospitals.map(h => 
        h.id === editingHospital.id 
          ? { ...hospitalData, id: editingHospital.id }
          : h
      ))
    } else {
      // Add new
      const newHospital: Hospital = {
        ...hospitalData,
        id: Date.now().toString()
      }
      setHospitals([...hospitals, newHospital])
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

        {/* Hospitals Grid */}
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