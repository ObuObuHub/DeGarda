'use client'

import { useState } from 'react'
import { type ShiftType, type Hospital } from '@/types'

interface ShiftTypeManagementProps {
  shiftTypes: ShiftType[]
  hospitals: Hospital[]
  selectedHospitalId: string | null
  onAddShiftType: (data: Omit<ShiftType, 'id' | 'created_at'>) => Promise<boolean>
  onUpdateShiftType: (id: string, data: Partial<ShiftType>) => Promise<boolean>
  onDeleteShiftType: (id: string) => Promise<boolean>
}

interface FormData {
  name: string
  start_time: string
  end_time: string
  is_default: boolean
}

const EMPTY_FORM: FormData = {
  name: '',
  start_time: '08:00',
  end_time: '20:00',
  is_default: false
}

// Calculate duration in hours between two times
const calculateDuration = (startTime: string, endTime: string): number => {
  // Special case: 00:00 - 00:00 = 24 hours
  if (startTime === '00:00' && endTime === '00:00') {
    return 24
  }

  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)

  const startMinutes = startH * 60 + startM
  let endMinutes = endH * 60 + endM

  // Handle overnight shifts (e.g., 20:00 - 08:00)
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60
  }

  return (endMinutes - startMinutes) / 60
}

// Format duration for display
const formatDuration = (hours: number): string => {
  if (hours === 24) return '24 ore'
  if (hours === Math.floor(hours)) return `${hours} ore`
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}h ${m}m`
}

export default function ShiftTypeManagement({
  shiftTypes,
  hospitals,
  selectedHospitalId,
  onAddShiftType,
  onUpdateShiftType,
  onDeleteShiftType
}: ShiftTypeManagementProps) {
  const [showModal, setShowModal] = useState(false)
  const [editingShiftType, setEditingShiftType] = useState<ShiftType | null>(null)
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)

  // Filter shift types by selected hospital
  const filteredShiftTypes = selectedHospitalId
    ? shiftTypes.filter(st => st.hospital_id === selectedHospitalId)
    : shiftTypes

  const selectedHospital = hospitals.find(h => h.id === selectedHospitalId)

  const openAddModal = () => {
    setEditingShiftType(null)
    setFormData(EMPTY_FORM)
    setShowModal(true)
  }

  const openEditModal = (shiftType: ShiftType) => {
    setEditingShiftType(shiftType)
    setFormData({
      name: shiftType.name,
      start_time: shiftType.start_time.slice(0, 5), // Remove seconds if present
      end_time: shiftType.end_time.slice(0, 5),
      is_default: shiftType.is_default
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingShiftType(null)
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
      const duration = calculateDuration(formData.start_time, formData.end_time)

      if (editingShiftType) {
        const success = await onUpdateShiftType(editingShiftType.id, {
          name: formData.name,
          start_time: formData.start_time,
          end_time: formData.end_time,
          duration_hours: duration,
          is_default: formData.is_default
        })
        if (success) closeModal()
      } else {
        const success = await onAddShiftType({
          hospital_id: selectedHospitalId,
          name: formData.name,
          start_time: formData.start_time,
          end_time: formData.end_time,
          duration_hours: duration,
          is_default: formData.is_default,
          is_active: true
        })
        if (success) closeModal()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (shiftType: ShiftType) => {
    if (shiftType.is_default) {
      alert('Nu poți șterge tipul de tură implicit. Setează alt tip ca implicit mai întâi.')
      return
    }
    if (!confirm(`Sigur vrei să ștergi tipul de tură "${shiftType.name}"?`)) {
      return
    }

    setLoading(true)
    try {
      await onDeleteShiftType(shiftType.id)
    } finally {
      setLoading(false)
    }
  }

  const handleSetDefault = async (shiftType: ShiftType) => {
    if (shiftType.is_default) return

    setLoading(true)
    try {
      // First, unset current default
      const currentDefault = filteredShiftTypes.find(st => st.is_default)
      if (currentDefault) {
        await onUpdateShiftType(currentDefault.id, { is_default: false })
      }
      // Then set new default
      await onUpdateShiftType(shiftType.id, { is_default: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">⏰</span>
          <span className="text-lg font-semibold text-gray-900">
            Tipuri de Ture
          </span>
          {selectedHospital && (
            <span className="text-sm text-gray-500">
              - {selectedHospital.name}
            </span>
          )}
          <span className="text-sm text-gray-500">
            ({filteredShiftTypes.length})
          </span>
        </div>
        {selectedHospitalId && (
          <button
            onClick={openAddModal}
            className="btn btn-primary flex items-center gap-2"
          >
            <span>+</span>
            <span>Adaugă Tip</span>
          </button>
        )}
      </div>

      {/* List */}
      <div className="p-6">
        {!selectedHospitalId ? (
          <p className="text-gray-500 text-center py-8">
            Selectează un spital pentru a vedea tipurile de ture.
          </p>
        ) : filteredShiftTypes.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Nu există tipuri de ture. Adaugă primul tip.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Nume</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Interval</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Durată</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Implicit</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {filteredShiftTypes.map(shiftType => (
                  <tr key={shiftType.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{shiftType.name}</td>
                    <td className="py-3 px-4 font-mono text-sm">
                      {shiftType.start_time.slice(0, 5)} - {shiftType.end_time.slice(0, 5)}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {formatDuration(shiftType.duration_hours)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {shiftType.is_default ? (
                        <span className="text-yellow-500 text-lg" title="Implicit">⭐</span>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(shiftType)}
                          className="text-gray-400 hover:text-yellow-500 text-lg"
                          title="Setează ca implicit"
                          disabled={loading}
                        >
                          ☆
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(shiftType)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editează"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(shiftType)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Șterge"
                          disabled={shiftType.is_default}
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
                {editingShiftType ? 'Editează Tip de Tură' : 'Adaugă Tip de Tură Nou'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nume
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  placeholder="ex: Zi (12h), Noapte, Dimineață"
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ora început
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* End Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ora sfârșit
                </label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Duration Preview */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Durată calculată: </span>
                <span className="font-medium">
                  {formatDuration(calculateDuration(formData.start_time, formData.end_time))}
                </span>
              </div>

              {/* Is Default */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={e => setFormData({ ...formData, is_default: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_default" className="text-sm text-gray-700">
                  Setează ca tip implicit pentru acest spital
                </label>
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
