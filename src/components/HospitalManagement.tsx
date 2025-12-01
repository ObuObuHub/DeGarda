'use client'

import { useState } from 'react'
import { type Hospital } from '@/types'

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
      if (editingHospital) {
        const success = await onUpdateHospital(editingHospital.id, {
          name: formData.name,
          code: formData.code.toUpperCase(),
          location: formData.location || undefined
        })
        if (success) closeModal()
      } else {
        const success = await onAddHospital({
          name: formData.name,
          code: formData.code.toUpperCase(),
          location: formData.location || undefined
        })
        if (success) closeModal()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (hospital: Hospital) => {
    if (!confirm(`Sigur vrei să ștergi spitalul "${hospital.name}"?\n\nAceastă acțiune va șterge și toți utilizatorii și turele asociate!`)) {
      return
    }

    setLoading(true)
    try {
      await onDeleteHospital(hospital.id)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">🏥</span>
          <span className="text-lg font-semibold text-gray-900">
            Spitale
          </span>
          <span className="text-sm text-gray-500">
            ({hospitals.length})
          </span>
        </div>
        <button
          onClick={openAddModal}
          className="btn btn-primary flex items-center gap-2"
        >
          <span>+</span>
          <span>Adaugă Spital</span>
        </button>
      </div>

      {/* List */}
      <div className="p-6">
        {hospitals.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Nu există spitale. Adaugă primul spital.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Nume</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Cod</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Locație</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {hospitals.map(hospital => (
                  <tr key={hospital.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{hospital.name}</td>
                    <td className="py-3 px-4 font-mono text-sm">{hospital.code}</td>
                    <td className="py-3 px-4 text-gray-600">{hospital.location || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(hospital)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editează"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(hospital)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Șterge"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">
                {editingHospital ? 'Editează Spital' : 'Adaugă Spital Nou'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nume spital
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  placeholder="ex: Spitalul Județean de Urgență"
                />
              </div>

              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cod (scurt, unic)
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  required
                  placeholder="ex: PIATRA"
                  pattern="[A-Z0-9]+"
                  title="Doar litere mari și cifre"
                  maxLength={20}
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Locație (opțional)
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ex: Piatra-Neamț"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Se salvează...' : 'Salvează'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
