'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StaffModal } from '@/components/StaffModal'
import { StaffMember } from '@/lib/data'
import { HospitalSelector } from '@/components/HospitalSelector'
import { useHospital } from '@/contexts/HospitalContext'

export default function StaffPage() {
  const router = useRouter()
  const { selectedHospitalId } = useHospital()
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | undefined>()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hospitals, setHospitals] = useState<any[]>([])

  // Fetch staff from API
  useEffect(() => {
    fetchStaff()
    fetchHospitals()
  }, [])

  const fetchStaff = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/staff')
      if (!response.ok) {
        throw new Error('Failed to fetch staff')
      }
      const data = await response.json()
      setStaffList(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchHospitals = async () => {
    try {
      const response = await fetch('/api/hospitals')
      if (response.ok) {
        const data = await response.json()
        setHospitals(data)
      }
    } catch (err) {
      console.error('Failed to fetch hospitals:', err)
    }
  }

  // Filter staff by selected hospital
  const filteredStaff = staffList.filter(s => s.hospitalId === selectedHospitalId)

  const getHospitalName = (hospitalId: string) => {
    return hospitals.find(h => h.id === hospitalId)?.name || 'Unknown'
  }


  const handleAdd = () => {
    setEditingStaff(undefined)
    setIsModalOpen(true)
  }

  const handleEdit = (staff: StaffMember) => {
    setEditingStaff(staff)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Sigur vrei să ștergi acest membru?')) {
      try {
        const response = await fetch(`/api/staff/${id}`, {
          method: 'DELETE',
        })
        
        if (!response.ok) {
          const error = await response.json()
          alert(error.error || 'Failed to delete staff member')
          return
        }
        
        // Refresh the list
        await fetchStaff()
      } catch (err) {
        alert('An error occurred while deleting the staff member')
      }
    }
  }

  const handleSave = async (staffData: Omit<StaffMember, 'id'>) => {
    try {
      if (editingStaff) {
        // Edit existing
        const response = await fetch(`/api/staff/${editingStaff.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(staffData),
        })
        
        if (!response.ok) {
          const error = await response.json()
          alert(error.error || 'Failed to update staff member')
          return
        }
      } else {
        // Add new
        const response = await fetch('/api/staff', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(staffData),
        })
        
        if (!response.ok) {
          const error = await response.json()
          alert(error.error || 'Failed to create staff member')
          return
        }
      }
      
      // Refresh the list and close modal
      await fetchStaff()
      setIsModalOpen(false)
    } catch (err) {
      alert('An error occurred while saving the staff member')
    }
  }

  return (
    <div className="min-h-screen bg-background-secondary p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-label-primary">
              Gestionare Personal
            </h1>
            <p className="text-label-secondary mt-1">
              Gestionează doctori și personal medical
            </p>
          </div>
          <div className="space-x-2">
            <HospitalSelector />
            <Button variant="ghost" onClick={() => router.push('/admin/dashboard')}>
              Înapoi
            </Button>
            <Button onClick={handleAdd}>
              Adaugă Personal
            </Button>
          </div>
        </div>

        {/* Loading and Error States */}
        {isLoading && (
          <div className="text-center py-8">
            <p className="text-label-secondary">Se încarcă personalul...</p>
          </div>
        )}
        
        {error && (
          <div className="text-center py-8">
            <p className="text-red-500">{error}</p>
            <Button onClick={fetchStaff} className="mt-2">
              Reîncearcă
            </Button>
          </div>
        )}

        {/* Staff List - Grouped by Department */}
        {!isLoading && !error && (
          <div className="space-y-6">
            {['ATI', 'Urgențe', 'Laborator', 'Medicină Internă', 'Chirurgie'].map(dept => {
              const deptStaff = filteredStaff.filter(s => s.specialization === dept)
              if (deptStaff.length === 0) return null
              
              return (
                <div key={dept}>
                  <h3 className="text-lg font-semibold mb-3">{dept}</h3>
                  <div className="grid gap-4">
                    {deptStaff.map(member => (
                      <Card key={member.id} hoverable>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold">
                              {member.name}
                            </h3>
                            <p className="text-xs text-label-tertiary mt-1">
                              {member.email || 'Fără email'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(member)}>
                              Editează
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(member.id)}>
                              Șterge
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )
          ))}
          </div>
        )}
      </div>

      <StaffModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        staff={editingStaff}
      />
    </div>
  )
}