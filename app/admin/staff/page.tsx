'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StaffModal } from '@/components/StaffModal'
import { staff as initialStaff, hospitals, StaffMember } from '@/lib/data'

export default function StaffPage() {
  const router = useRouter()
  const [staffList, setStaffList] = useState(initialStaff)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | undefined>()

  const getHospitalName = (hospitalId: string) => {
    return hospitals.find(h => h.id === hospitalId)?.name || 'Unknown'
  }

  const getTypePrefix = (type: string) => {
    switch (type) {
      case 'medic': return 'Dr.'
      case 'biolog': return 'Biol.'
      case 'chimist': return 'Ch.'
      case 'asistent': return 'As.'
      default: return ''
    }
  }

  const handleAdd = () => {
    setEditingStaff(undefined)
    setIsModalOpen(true)
  }

  const handleEdit = (staff: StaffMember) => {
    setEditingStaff(staff)
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Sigur vrei să ștergi acest membru?')) {
      setStaffList(staffList.filter(s => s.id !== id))
    }
  }

  const handleSave = (staffData: Omit<StaffMember, 'id'>) => {
    if (editingStaff) {
      // Edit existing
      setStaffList(staffList.map(s => 
        s.id === editingStaff.id 
          ? { ...staffData, id: editingStaff.id }
          : s
      ))
    } else {
      // Add new
      const newStaff: StaffMember = {
        ...staffData,
        id: Date.now().toString()
      }
      setStaffList([...staffList, newStaff])
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
            <Button variant="ghost" onClick={() => router.push('/admin/dashboard')}>
              Înapoi
            </Button>
            <Button onClick={handleAdd}>
              Adaugă Personal
            </Button>
          </div>
        </div>

        {/* Staff List */}
        <div className="grid gap-4">
          {staffList.map(member => (
            <Card key={member.id} hoverable>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold">
                    {getTypePrefix(member.type)} {member.name}
                  </h3>
                  <p className="text-sm text-label-secondary">
                    {member.specialization} • {getHospitalName(member.hospitalId)}
                  </p>
                  <p className="text-xs text-label-tertiary mt-1">
                    {member.email}
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

      <StaffModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        staff={editingStaff}
      />
    </div>
  )
}