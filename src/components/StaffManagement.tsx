'use client'

import { useState } from 'react'
import { type User } from '@/lib/supabase'
import { DEPARTMENTS, type Department, type UserRole, type Hospital } from '@/types'

interface StaffManagementProps {
  currentUser: User
  allUsers: User[]
  hospitals?: Hospital[]
  onAddUser: (userData: Omit<User, 'id' | 'created_at'>) => Promise<boolean>
  onUpdateUser: (userId: string, userData: Partial<User>) => Promise<boolean>
  onDeleteUser: (userId: string) => Promise<boolean>
}

interface FormData {
  name: string
  personal_code: string
  department: Department | ''
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

export default function StaffManagement({
  currentUser,
  allUsers,
  hospitals = [],
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
    department: '',
    role: 'STAFF',
    hospital_id: currentUser.hospital_id || '',
    max_shifts_per_month: 8
  })
  const [loading, setLoading] = useState(false)

  // Filter users based on current user's role
  const visibleUsers = allUsers.filter(u => {
    if (currentUser.role === 'SUPER_ADMIN') {
      return true // Super Admin sees everyone
    }
    if (currentUser.role === 'HOSPITAL_ADMIN') {
      // Hospital Admin sees all users in their hospital
      return u.hospital_id === currentUser.hospital_id
    }
    if (currentUser.role === 'DEPARTMENT_MANAGER') {
      // Department Manager sees only STAFF in their department
      return u.hospital_id === currentUser.hospital_id &&
             u.department === currentUser.department &&
             u.role === 'STAFF'
    }
    return false
  })

  // Determine which roles the current user can assign
  const getAllowedRoles = (): UserRole[] => {
    switch (currentUser.role) {
      case 'SUPER_ADMIN':
        return ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DEPARTMENT_MANAGER', 'STAFF']
      case 'HOSPITAL_ADMIN':
        return ['DEPARTMENT_MANAGER', 'STAFF']
      case 'DEPARTMENT_MANAGER':
        return ['STAFF']
      default:
        return []
    }
  }

  // Determine which departments the current user can assign
  const getAllowedDepartments = (): Department[] => {
    if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'HOSPITAL_ADMIN') {
      return DEPARTMENTS
    }
    if (currentUser.role === 'DEPARTMENT_MANAGER' && currentUser.department) {
      return [currentUser.department]
    }
    return []
  }

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

      if (editingUser) {
        const success = await onUpdateUser(editingUser.id, userData)
        if (success) closeModal()
      } else {
        const success = await onAddUser(userData as Omit<User, 'id' | 'created_at'>)
        if (success) closeModal()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (user: User) => {
    if (!confirm(`Sigur vrei să ștergi utilizatorul ${user.name}?`)) {
      return
    }

    setLoading(true)
    try {
      await onDeleteUser(user.id)
    } finally {
      setLoading(false)
    }
  }

  // Don't render if user doesn't have permission
  const canManageUsers = ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DEPARTMENT_MANAGER'].includes(currentUser.role)
  if (!canManageUsers) {
    return null
  }

  const allowedRoles = getAllowedRoles()
  const allowedDepartments = getAllowedDepartments()

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header - Collapsible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">👥</span>
          <span className="text-lg font-semibold text-gray-900">
            Gestionare Personal
          </span>
          <span className="text-sm text-gray-500">
            ({visibleUsers.length} {visibleUsers.length === 1 ? 'persoană' : 'persoane'})
          </span>
        </div>
        <span className="text-gray-400 text-xl">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t">
          {/* Add Button */}
          <div className="flex justify-end mt-4 mb-4">
            <button
              onClick={openAddModal}
              className="btn btn-primary flex items-center gap-2"
            >
              <span>+</span>
              <span>Adaugă Personal</span>
            </button>
          </div>

          {/* Staff List */}
          {visibleUsers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nu există personal de afișat.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Nume</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Cod</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Departament</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Rol</th>
                    {currentUser.role === 'SUPER_ADMIN' && (
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Spital</th>
                    )}
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Ture/lună</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map(user => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{user.name}</td>
                      <td className="py-3 px-4 font-mono text-sm">{user.personal_code}</td>
                      <td className="py-3 px-4">{user.department || '-'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'HOSPITAL_ADMIN' ? 'bg-red-100 text-red-800' :
                          user.role === 'DEPARTMENT_MANAGER' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {ROLE_LABELS[user.role]}
                        </span>
                      </td>
                      {currentUser.role === 'SUPER_ADMIN' && (
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {user.hospital?.name || '-'}
                        </td>
                      )}
                      <td className="py-3 px-4">{user.max_shifts_per_month || 8}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            title="Editează"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Șterge"
                            disabled={user.id === currentUser.id}
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
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">
                {editingUser ? 'Editează Personal' : 'Adaugă Personal Nou'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nume complet
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  placeholder="ex: Dr. Ion Popescu"
                />
              </div>

              {/* Personal Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cod personal (pentru autentificare)
                </label>
                <input
                  type="text"
                  value={formData.personal_code}
                  onChange={e => setFormData({ ...formData, personal_code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  required
                  placeholder="ex: ION1"
                  pattern="[A-Z0-9]+"
                  title="Doar litere mari și cifre"
                />
              </div>

              {/* Hospital (Super Admin only) */}
              {currentUser.role === 'SUPER_ADMIN' && hospitals.length > 0 && formData.role !== 'SUPER_ADMIN' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Spital
                  </label>
                  <select
                    value={formData.hospital_id}
                    onChange={e => setFormData({ ...formData, hospital_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Selectează spital</option>
                    {hospitals.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol
                </label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {allowedRoles.map(role => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department (only for DEPARTMENT_MANAGER and STAFF) */}
              {(formData.role === 'DEPARTMENT_MANAGER' || formData.role === 'STAFF') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Departament
                  </label>
                  <select
                    value={formData.department}
                    onChange={e => setFormData({ ...formData, department: e.target.value as Department })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Selectează departament</option>
                    {allowedDepartments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Max shifts per month (only for STAFF) */}
              {formData.role === 'STAFF' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ture maxime pe lună
                  </label>
                  <input
                    type="number"
                    value={formData.max_shifts_per_month}
                    onChange={e => setFormData({ ...formData, max_shifts_per_month: parseInt(e.target.value) || 8 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min={1}
                    max={31}
                  />
                </div>
              )}

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
