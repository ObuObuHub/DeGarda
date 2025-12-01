'use client'

import { useState, useMemo } from 'react'
import { type Department } from '@/types'
import DataTable, { Column, Badge } from './ui/DataTable'
import FormModal, { FormField, TextInput } from './ui/FormModal'
import ConfirmDialog from './ui/ConfirmDialog'

interface DepartmentManagementProps {
  departments: Department[]
  selectedHospitalId: string | null
  onAddDepartment: (data: Omit<Department, 'id' | 'created_at'>) => Promise<boolean>
  onUpdateDepartment: (id: string, data: Partial<Department>) => Promise<boolean>
  onDeleteDepartment: (id: string) => Promise<boolean>
}

interface FormData {
  name: string
  color: string
}

const EMPTY_FORM: FormData = {
  name: '',
  color: '#3B82F6'
}

const PRESET_COLORS = [
  '#DC2626', '#EA580C', '#CA8A04', '#16A34A', '#0D9488',
  '#2563EB', '#7C3AED', '#9333EA', '#DB2777', '#6B7280'
]

export default function DepartmentManagement({
  departments,
  selectedHospitalId,
  onAddDepartment,
  onUpdateDepartment,
  onDeleteDepartment
}: DepartmentManagementProps) {
  const [showModal, setShowModal] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Department | null>(null)

  const filteredDepartments = selectedHospitalId
    ? departments.filter(d => d.hospital_id === selectedHospitalId)
    : departments

  const columns: Column<Department>[] = useMemo(() => [
    {
      key: 'color',
      header: 'Culoare',
      render: d => (
        <div
          className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
          style={{ backgroundColor: d.color }}
        />
      )
    },
    { key: 'name', header: 'Nume', render: d => <span className="font-medium">{d.name}</span> },
    {
      key: 'status',
      header: 'Status',
      className: 'text-center',
      render: d => <Badge variant={d.is_active ? 'success' : 'default'}>{d.is_active ? 'Activ' : 'Inactiv'}</Badge>
    }
  ], [])

  const openAddModal = () => {
    setEditingDepartment(null)
    setFormData(EMPTY_FORM)
    setShowModal(true)
  }

  const openEditModal = (department: Department) => {
    setEditingDepartment(department)
    setFormData({ name: department.name, color: department.color })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingDepartment(null)
    setFormData(EMPTY_FORM)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedHospitalId) {
      alert('Selectează un spital mai întâi.')
      return
    }
    setLoading(true)

    try {
      const success = editingDepartment
        ? await onUpdateDepartment(editingDepartment.id, { name: formData.name, color: formData.color })
        : await onAddDepartment({ hospital_id: selectedHospitalId, name: formData.name, color: formData.color, is_active: true })

      if (success) closeModal()
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setLoading(true)
    try {
      await onDeleteDepartment(deleteConfirm.id)
    } finally {
      setLoading(false)
      setDeleteConfirm(null)
    }
  }

  return (
    <div className="p-6">
      {selectedHospitalId && (
        <div className="flex justify-end mb-4">
          <button onClick={openAddModal} className="btn btn-primary flex items-center gap-2">
            <span>+</span>
            <span>Adaugă Departament</span>
          </button>
        </div>
      )}

      {!selectedHospitalId ? (
        <p className="text-gray-500 text-center py-8">Selectează un spital pentru a vedea departamentele.</p>
      ) : (
        <DataTable
          data={filteredDepartments}
          columns={columns}
          keyExtractor={d => d.id}
          onEdit={openEditModal}
          onDelete={d => setDeleteConfirm(d)}
          emptyMessage="Nu există departamente. Adaugă primul departament."
        />
      )}

      <FormModal
        isOpen={showModal}
        title={editingDepartment ? 'Editează Departament' : 'Adaugă Departament Nou'}
        onClose={closeModal}
        onSubmit={handleSubmit}
        loading={loading}
      >
        <FormField label="Nume Departament" required>
          <TextInput
            value={formData.name}
            onChange={v => setFormData({ ...formData, name: v })}
            placeholder="ex: Cardiologie, Pediatrie, Neurologie"
            required
          />
        </FormField>

        <FormField label="Culoare">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={formData.color}
              onChange={e => setFormData({ ...formData, color: e.target.value })}
              className="w-12 h-10 border rounded cursor-pointer"
            />
            <div className="flex gap-1 flex-wrap">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-6 h-6 rounded-full border-2 ${formData.color === color ? 'border-gray-800' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </FormField>

        <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
          <div className="w-10 h-10 rounded-full" style={{ backgroundColor: formData.color }} />
          <span className="font-medium">{formData.name || 'Nume departament'}</span>
        </div>
      </FormModal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Șterge Departament"
        message={`Sigur vrei să ștergi departamentul "${deleteConfirm?.name}"? Toate turele și utilizatorii asociați vor fi afectați.`}
        confirmText="Șterge"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        loading={loading}
      />
    </div>
  )
}
