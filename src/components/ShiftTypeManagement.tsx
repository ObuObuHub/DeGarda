'use client'

import { useState, useMemo, useCallback } from 'react'
import { type ShiftType, type Hospital } from '@/types'
import DataTable, { Column } from './ui/DataTable'
import FormModal, { FormField, TextInput } from './ui/FormModal'
import ConfirmDialog from './ui/ConfirmDialog'

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

const calculateDuration = (startTime: string, endTime: string): number => {
  if (startTime === '00:00' && endTime === '00:00') return 24
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  const startMinutes = startH * 60 + startM
  let endMinutes = endH * 60 + endM
  if (endMinutes <= startMinutes) endMinutes += 24 * 60
  return (endMinutes - startMinutes) / 60
}

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
  const [deleteConfirm, setDeleteConfirm] = useState<ShiftType | null>(null)

  const filteredShiftTypes = selectedHospitalId
    ? shiftTypes.filter(st => st.hospital_id === selectedHospitalId)
    : shiftTypes

  const selectedHospital = hospitals.find(h => h.id === selectedHospitalId)

  const handleSetDefault = useCallback(async (shiftType: ShiftType) => {
    if (shiftType.is_default) return
    setLoading(true)
    try {
      const currentDefault = filteredShiftTypes.find(st => st.is_default)
      if (currentDefault) {
        await onUpdateShiftType(currentDefault.id, { is_default: false })
      }
      await onUpdateShiftType(shiftType.id, { is_default: true })
    } finally {
      setLoading(false)
    }
  }, [filteredShiftTypes, onUpdateShiftType])

  const columns: Column<ShiftType>[] = useMemo(() => [
    { key: 'name', header: 'Nume', render: st => <span className="font-medium">{st.name}</span> },
    { key: 'interval', header: 'Interval', render: st => (
      <span className="font-mono text-sm">{st.start_time.slice(0, 5)} - {st.end_time.slice(0, 5)}</span>
    )},
    { key: 'duration', header: 'Durată', render: st => (
      <span className="text-gray-600">{formatDuration(st.duration_hours)}</span>
    )},
    { key: 'default', header: 'Implicit', className: 'text-center', render: st => (
      st.is_default ? (
        <span className="text-yellow-500 text-lg" title="Implicit">⭐</span>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); handleSetDefault(st) }}
          className="text-gray-400 hover:text-yellow-500 text-lg"
          title="Setează ca implicit"
          disabled={loading}
        >☆</button>
      )
    )}
  ], [loading, handleSetDefault])

  const openAddModal = () => {
    setEditingShiftType(null)
    setFormData(EMPTY_FORM)
    setShowModal(true)
  }

  const openEditModal = (shiftType: ShiftType) => {
    setEditingShiftType(shiftType)
    setFormData({
      name: shiftType.name,
      start_time: shiftType.start_time.slice(0, 5),
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
      const data = {
        name: formData.name,
        start_time: formData.start_time,
        end_time: formData.end_time,
        duration_hours: duration,
        is_default: formData.is_default
      }

      const success = editingShiftType
        ? await onUpdateShiftType(editingShiftType.id, data)
        : await onAddShiftType({ ...data, hospital_id: selectedHospitalId, is_active: true })

      if (success) closeModal()
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    if (deleteConfirm.is_default) {
      alert('Nu poți șterge tipul de tură implicit. Setează alt tip ca implicit mai întâi.')
      setDeleteConfirm(null)
      return
    }
    setLoading(true)
    try {
      await onDeleteShiftType(deleteConfirm.id)
    } finally {
      setLoading(false)
      setDeleteConfirm(null)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">⏰</span>
          <span className="text-lg font-semibold text-gray-900">Tipuri de Ture</span>
          {selectedHospital && <span className="text-sm text-gray-500">- {selectedHospital.name}</span>}
          <span className="text-sm text-gray-500">({filteredShiftTypes.length})</span>
        </div>
        {selectedHospitalId && (
          <button onClick={openAddModal} className="btn btn-primary flex items-center gap-2">
            <span>+</span>
            <span>Adaugă Tip</span>
          </button>
        )}
      </div>

      <div className="p-6">
        {!selectedHospitalId ? (
          <p className="text-gray-500 text-center py-8">Selectează un spital pentru a vedea tipurile de ture.</p>
        ) : (
          <DataTable
            data={filteredShiftTypes}
            columns={columns}
            keyExtractor={st => st.id}
            onEdit={openEditModal}
            onDelete={st => setDeleteConfirm(st)}
            emptyMessage="Nu există tipuri de ture. Adaugă primul tip."
          />
        )}
      </div>

      <FormModal
        isOpen={showModal}
        title={editingShiftType ? 'Editează Tip de Tură' : 'Adaugă Tip de Tură Nou'}
        onClose={closeModal}
        onSubmit={handleSubmit}
        loading={loading}
      >
        <FormField label="Nume" required>
          <TextInput
            value={formData.name}
            onChange={v => setFormData({ ...formData, name: v })}
            placeholder="ex: Zi (12h), Noapte, Dimineață"
            required
          />
        </FormField>

        <FormField label="Ora început" required>
          <input
            type="time"
            value={formData.start_time}
            onChange={e => setFormData({ ...formData, start_time: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </FormField>

        <FormField label="Ora sfârșit" required>
          <input
            type="time"
            value={formData.end_time}
            onChange={e => setFormData({ ...formData, end_time: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </FormField>

        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">Durată calculată: </span>
          <span className="font-medium">{formatDuration(calculateDuration(formData.start_time, formData.end_time))}</span>
        </div>

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
      </FormModal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Șterge Tip de Tură"
        message={`Sigur vrei să ștergi tipul de tură "${deleteConfirm?.name}"?`}
        confirmText="Șterge"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        loading={loading}
      />
    </div>
  )
}
