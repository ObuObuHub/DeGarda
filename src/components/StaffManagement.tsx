'use client'

import { useState, useMemo } from 'react'
import { type User } from '@/lib/supabase'
import { type UserRole, type Hospital, type Department } from '@/types'
import DataTable, { Column, Badge } from './ui/DataTable'
import FormModal, { FormField, TextInput, SelectInput } from './ui/FormModal'
import ConfirmDialog from './ui/ConfirmDialog'

interface StaffManagementProps {
  currentUser: User
  allUsers: User[]
  hospitals?: Hospital[]
  departments?: Department[]
  onAddUser: (userData: Omit<User, 'id' | 'created_at'>) => Promise<boolean>
  onUpdateUser: (userId: string, userData: Partial<User>) => Promise<boolean>
  onDeleteUser: (userId: string) => Promise<boolean>
}

interface FormData {
  name: string
  personal_code: string
  department: string
  role: UserRole
  hospital_id: string
  max_shifts_per_month: number
}

const ROLE_LABELS: Record<UserRole, string> = {
  'SUPER_ADMIN': 'Super Admin',
  'HOSPITAL_ADMIN': 'Admin Spital',
  'DEPARTMENT_MANAGER': 'Manager Secție',
  'STAFF': 'Personal'
}

const ROLE_VARIANTS: Record<UserRole, 'purple' | 'danger' | 'info' | 'default'> = {
  'SUPER_ADMIN': 'purple',
  'HOSPITAL_ADMIN': 'danger',
  'DEPARTMENT_MANAGER': 'info',
  'STAFF': 'default'
}

export default function StaffManagement({
  currentUser,
  allUsers,
  hospitals = [],
  departments = [],
  onAddUser,
  onUpdateUser,
  onDeleteUser
}: StaffManagementProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    personal_code: '',
    department: currentUser.department || '',
    role: 'STAFF',
    hospital_id: currentUser.hospital_id || '',
    max_shifts_per_month: 8
  })
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null)

  const visibleUsers = useMemo(() => allUsers.filter(u => {
    if (currentUser.role === 'SUPER_ADMIN') return true
    if (currentUser.role === 'HOSPITAL_ADMIN') return u.hospital_id === currentUser.hospital_id
    if (currentUser.role === 'DEPARTMENT_MANAGER') {
      return u.hospital_id === currentUser.hospital_id &&
             u.department === currentUser.department &&
             u.role === 'STAFF'
    }
    return false
  }), [allUsers, currentUser])

  const allowedRoles = useMemo((): UserRole[] => {
    switch (currentUser.role) {
      case 'SUPER_ADMIN': return ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DEPARTMENT_MANAGER', 'STAFF']
      case 'HOSPITAL_ADMIN': return ['DEPARTMENT_MANAGER', 'STAFF']
      case 'DEPARTMENT_MANAGER': return ['STAFF']
      default: return []
    }
  }, [currentUser.role])

  const allowedDepartments = useMemo((): string[] => {
    if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'HOSPITAL_ADMIN') {
      const hospitalId = formData.hospital_id || currentUser.hospital_id
      if (hospitalId) return departments.filter(d => d.hospital_id === hospitalId).map(d => d.name)
      return departments.map(d => d.name)
    }
    if (currentUser.role === 'DEPARTMENT_MANAGER' && currentUser.department) {
      return [currentUser.department]
    }
    return []
  }, [currentUser, departments, formData.hospital_id])

  const columns: Column<User>[] = useMemo(() => {
    const cols: Column<User>[] = [
      { key: 'name', header: 'Nume', render: u => u.name },
      { key: 'code', header: 'Cod', render: u => <span className="font-mono text-sm">{u.personal_code}</span> },
      { key: 'department', header: 'Departament', render: u => u.department || '-' },
      { key: 'role', header: 'Rol', render: u => <Badge variant={ROLE_VARIANTS[u.role]}>{ROLE_LABELS[u.role]}</Badge> }
    ]
    if (currentUser.role === 'SUPER_ADMIN') {
      cols.push({ key: 'hospital', header: 'Spital', render: u => <span className="text-sm text-gray-600">{u.hospital?.name || '-'}</span> })
    }
    cols.push({ key: 'shifts', header: 'Ture/lună', render: u => u.max_shifts_per_month || 8 })
    return cols
  }, [currentUser.role])

  const canManageUsers = ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DEPARTMENT_MANAGER'].includes(currentUser.role)
  if (!canManageUsers) return null

  const openAddModal = () => {
    setEditingUser(null)
    setFormData({
      name: '',
      personal_code: '',
      department: currentUser.department || '',
      role: 'STAFF',
      hospital_id: currentUser.hospital_id || '',
      max_shifts_per_month: 8
    })
    setShowModal(true)
  }

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      personal_code: user.personal_code,
      department: user.department || '',
      role: user.role,
      hospital_id: user.hospital_id || '',
      max_shifts_per_month: user.max_shifts_per_month || 8
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingUser(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const userData = {
        name: formData.name,
        personal_code: formData.personal_code,
        department: formData.department || undefined,
        role: formData.role,
        hospital_id: formData.role === 'SUPER_ADMIN' ? undefined : formData.hospital_id || undefined,
        max_shifts_per_month: formData.max_shifts_per_month
      }

      const success = editingUser
        ? await onUpdateUser(editingUser.id, userData)
        : await onAddUser(userData as Omit<User, 'id' | 'created_at'>)

      if (success) closeModal()
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setLoading(true)
    try {
      await onDeleteUser(deleteConfirm.id)
    } finally {
      setLoading(false)
      setDeleteConfirm(null)
    }
  }

  const canDeleteUser = (user: User) => user.id !== currentUser.id

  return (
    <div className="bg-white rounded-lg shadow-sm border mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">👥</span>
          <span className="text-lg font-semibold text-gray-900">Gestionare Personal</span>
          <span className="text-sm text-gray-500">
            ({visibleUsers.length} {visibleUsers.length === 1 ? 'persoană' : 'persoane'})
          </span>
        </div>
        <span className="text-gray-400 text-xl">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 border-t">
          <div className="flex justify-end mt-4 mb-4">
            <button onClick={openAddModal} className="btn btn-primary flex items-center gap-2">
              <span>+</span>
              <span>Adaugă Personal</span>
            </button>
          </div>

          <DataTable
            data={visibleUsers}
            columns={columns}
            keyExtractor={u => u.id}
            onEdit={openEditModal}
            onDelete={u => canDeleteUser(u) && setDeleteConfirm(u)}
            emptyMessage="Nu există personal de afișat."
          />
        </div>
      )}

      <FormModal
        isOpen={showModal}
        title={editingUser ? 'Editează Personal' : 'Adaugă Personal Nou'}
        onClose={closeModal}
        onSubmit={handleSubmit}
        loading={loading}
      >
        <FormField label="Nume complet" required>
          <TextInput
            value={formData.name}
            onChange={v => setFormData({ ...formData, name: v })}
            placeholder="ex: Dr. Ion Popescu"
            required
          />
        </FormField>

        <FormField label="Cod personal (pentru autentificare)" required>
          <TextInput
            value={formData.personal_code}
            onChange={v => setFormData({ ...formData, personal_code: v.toUpperCase() })}
            placeholder="ex: ION1"
            pattern="[A-Z0-9]+"
            title="Doar litere mari și cifre"
            required
            className="font-mono"
          />
        </FormField>

        {currentUser.role === 'SUPER_ADMIN' && hospitals.length > 0 && formData.role !== 'SUPER_ADMIN' && (
          <FormField label="Spital" required>
            <SelectInput
              value={formData.hospital_id}
              onChange={v => setFormData({ ...formData, hospital_id: v })}
              options={hospitals.map(h => ({ value: h.id, label: h.name }))}
              placeholder="Selectează spital"
              required
            />
          </FormField>
        )}

        <FormField label="Rol" required>
          <SelectInput
            value={formData.role}
            onChange={v => setFormData({ ...formData, role: v as UserRole })}
            options={allowedRoles.map(role => ({ value: role, label: ROLE_LABELS[role] }))}
            required
          />
        </FormField>

        {(formData.role === 'DEPARTMENT_MANAGER' || formData.role === 'STAFF') && (
          <FormField label="Departament" required>
            <SelectInput
              value={formData.department}
              onChange={v => setFormData({ ...formData, department: v })}
              options={allowedDepartments.map(d => ({ value: d, label: d }))}
              placeholder="Selectează departament"
              required
            />
          </FormField>
        )}

        {formData.role === 'STAFF' && (
          <FormField label="Ture maxime pe lună">
            <TextInput
              type="number"
              value={String(formData.max_shifts_per_month)}
              onChange={v => setFormData({ ...formData, max_shifts_per_month: parseInt(v) || 8 })}
              min={1}
              max={31}
            />
          </FormField>
        )}
      </FormModal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Șterge Utilizator"
        message={`Sigur vrei să ștergi utilizatorul "${deleteConfirm?.name}"?`}
        confirmText="Șterge"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        loading={loading}
      />
    </div>
  )
}
