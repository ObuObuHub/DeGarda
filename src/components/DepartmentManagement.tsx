'use client'

import { useState } from 'react'
import { type Department } from '@/types'

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
  '#DC2626', // Red
  '#EA580C', // Orange
  '#CA8A04', // Yellow
  '#16A34A', // Green
  '#0D9488', // Teal
  '#2563EB', // Blue
  '#7C3AED', // Violet
  '#9333EA', // Purple
  '#DB2777', // Pink
  '#6B7280', // Gray
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

  // Filter departments by selected hospital
  const filteredDepartments = selectedHospitalId
    ? departments.filter(d => d.hospital_id === selectedHospitalId)
    : departments

  const openAddModal = () => {
    setEditingDepartment(null)
    setFormData(EMPTY_FORM)
    setShowModal(true)
  }

  const openEditModal = (department: Department) => {
    setEditingDepartment(department)
    setFormData({
      name: department.name,
      color: department.color
    })
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
      if (editingDepartment) {
        const success = await onUpdateDepartment(editingDepartment.id, {
          name: formData.name,
          color: formData.color
        })
        if (success) closeModal()
      } else {
        const success = await onAddDepartment({
          hospital_id: selectedHospitalId,
          name: formData.name,
          color: formData.color,
          is_active: true
        })
        if (success) closeModal()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (department: Department) => {
    if (!confirm(`Sigur vrei să ștergi departamentul "${department.name}"? Toate turele și utilizatorii asociați vor fi afectați.`)) {
      return
    }

    setLoading(true)
    try {
      await onDeleteDepartment(department.id)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      {/* Add Button */}
      {selectedHospitalId && (
        <div className="flex justify-end mb-4">
          <button
            onClick={openAddModal}
            className="btn btn-primary flex items-center gap-2"
          >
            <span>+</span>
            <span>Adaugă Departament</span>
          </button>
        </div>
      )}

      {/* List */}
      <div>
        {!selectedHospitalId ? (
          <p className="text-gray-500 text-center py-8">
            Selectează un spital pentru a vedea departamentele.
          </p>
        ) : filteredDepartments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Nu există departamente. Adaugă primul departament.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Culoare</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Nume</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.map(department => (
                  <tr key={department.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div
                        className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: department.color }}
                      />
                    </td>
                    <td className="py-3 px-4 font-medium">{department.name}</td>
                    <td className="py-3 px-4 text-center">
                      {department.is_active ? (
                        <span className="text-green-600 text-sm">Activ</span>
                      ) : (
                        <span className="text-gray-400 text-sm">Inactiv</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(department)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editează"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(department)}
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

      {/* Modal - rendered inside the p-6 container */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">
                {editingDepartment ? 'Editează Departament' : 'Adaugă Departament Nou'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nume Departament
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  placeholder="ex: Cardiologie, Pediatrie, Neurologie"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Culoare
                </label>
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
              </div>

              {/* Preview */}
              <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full"
                  style={{ backgroundColor: formData.color }}
                />
                <span className="font-medium">{formData.name || 'Nume departament'}</span>
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
