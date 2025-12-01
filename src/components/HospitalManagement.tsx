'use client'

import { useState, useMemo } from 'react'
import { type Hospital } from '@/types'
import DataTable, { Column } from './ui/DataTable'
import FormModal, { FormField, TextInput } from './ui/FormModal'
import ConfirmDialog from './ui/ConfirmDialog'

interface HospitalManagementProps {
  hospitals: Hospital[]
  onAddHospital: (data: { name: string; code: string; location?: string }) => Promise<boolean>
  onUpdateHospital: (id: string, data: Partial<Hospital>) => Promise<boolean>
  onDeleteHospital: (id: string) => Promise<boolean>
}

interface FormData {
  name: string
  code: string
  location: string
}

const EMPTY_FORM: FormData = {
  name: '',
  code: '',
  location: ''
}

export default function HospitalManagement({
  hospitals,
  onAddHospital,
  onUpdateHospital,
  onDeleteHospital
}: HospitalManagementProps) {
  const [showModal, setShowModal] = useState(false)
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null)
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Hospital | null>(null)

  const columns: Column<Hospital>[] = useMemo(() => [
    { key: 'name', header: 'Nume', render: h => <span className="font-medium">{h.name}</span> },
    { key: 'code', header: 'Cod', render: h => <span className="font-mono text-sm">{h.code}</span> },
    { key: 'location', header: 'Locație', render: h => <span className="text-gray-600">{h.location || '-'}</span> }
  ], [])

  const openAddModal = () => {
    setEditingHospital(null)
    setFormData(EMPTY_FORM)
    setShowModal(true)
  }

  const openEditModal = (hospital: Hospital) => {
    setEditingHospital(hospital)
    setFormData({
      name: hospital.name,
      code: hospital.code,
      location: hospital.location || ''
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingHospital(null)
    setFormData(EMPTY_FORM)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const data = {
        name: formData.name,
        code: formData.code.toUpperCase(),
        location: formData.location || undefined
      }

      const success = editingHospital
        ? await onUpdateHospital(editingHospital.id, data)
        : await onAddHospital(data)

      if (success) closeModal()
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setLoading(true)
    try {
      await onDeleteHospital(deleteConfirm.id)
    } finally {
      setLoading(false)
      setDeleteConfirm(null)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">🏥</span>
          <span className="text-lg font-semibold text-gray-900">Spitale</span>
          <span className="text-sm text-gray-500">({hospitals.length})</span>
        </div>
        <button onClick={openAddModal} className="btn btn-primary flex items-center gap-2">
          <span>+</span>
          <span>Adaugă Spital</span>
        </button>
      </div>

      <div className="p-6">
        <DataTable
          data={hospitals}
          columns={columns}
          keyExtractor={h => h.id}
          onEdit={openEditModal}
          onDelete={h => setDeleteConfirm(h)}
          emptyMessage="Nu există spitale. Adaugă primul spital."
        />
      </div>

      <FormModal
        isOpen={showModal}
        title={editingHospital ? 'Editează Spital' : 'Adaugă Spital Nou'}
        onClose={closeModal}
        onSubmit={handleSubmit}
        loading={loading}
      >
        <FormField label="Nume spital" required>
          <TextInput
            value={formData.name}
            onChange={v => setFormData({ ...formData, name: v })}
            placeholder="ex: Spitalul Județean de Urgență"
            required
          />
        </FormField>

        <FormField label="Cod (scurt, unic)" required>
          <TextInput
            value={formData.code}
            onChange={v => setFormData({ ...formData, code: v.toUpperCase() })}
            placeholder="ex: PIATRA"
            pattern="[A-Z0-9]+"
            title="Doar litere mari și cifre"
            required
            className="font-mono"
          />
        </FormField>

        <FormField label="Locație (opțional)">
          <TextInput
            value={formData.location}
            onChange={v => setFormData({ ...formData, location: v })}
            placeholder="ex: Piatra-Neamț"
          />
        </FormField>
      </FormModal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Șterge Spital"
        message={`Sigur vrei să ștergi spitalul "${deleteConfirm?.name}"? Această acțiune va șterge și toți utilizatorii și turele asociate!`}
        confirmText="Șterge"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        loading={loading}
      />
    </div>
  )
}
