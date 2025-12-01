// Staff Management Authorization Tests

interface User {
  id: string
  name: string
  personal_code: string
  role: 'STAFF' | 'MANAGER' | 'ADMIN'
  department?: 'ATI' | 'Urgente' | 'Chirurgie' | 'Medicina Interna'
}

// Helper functions that mirror the authorization logic in dashboard/page.tsx
function canAddUser(
  currentUser: User,
  newUserData: { role: string; department?: string }
): { allowed: boolean; reason?: string } {
  if (currentUser.role !== 'MANAGER' && currentUser.role !== 'ADMIN') {
    return { allowed: false, reason: 'Only managers and admins can add users' }
  }

  if (currentUser.role === 'MANAGER') {
    if (newUserData.role !== 'STAFF') {
      return { allowed: false, reason: 'Managers can only add STAFF' }
    }
    if (newUserData.department !== currentUser.department) {
      return { allowed: false, reason: 'Managers can only add to their own department' }
    }
  }

  return { allowed: true }
}

function canUpdateUser(
  currentUser: User,
  targetUser: User,
  updates: { role?: string; department?: string; name?: string }
): { allowed: boolean; reason?: string } {
  if (currentUser.role !== 'MANAGER' && currentUser.role !== 'ADMIN') {
    return { allowed: false, reason: 'Only managers and admins can update users' }
  }

  // Cannot change own role
  if (currentUser.id === targetUser.id && updates.role && updates.role !== currentUser.role) {
    return { allowed: false, reason: 'Cannot change own role' }
  }

  if (currentUser.role === 'MANAGER') {
    if (targetUser.department !== currentUser.department) {
      return { allowed: false, reason: 'Managers can only edit users in their department' }
    }
    if (updates.role && updates.role !== 'STAFF') {
      return { allowed: false, reason: 'Managers can only set STAFF role' }
    }
    if (updates.department && updates.department !== currentUser.department) {
      return { allowed: false, reason: 'Managers can only set their own department' }
    }
  }

  return { allowed: true }
}

function canDeleteUser(
  currentUser: User,
  targetUser: User
): { allowed: boolean; reason?: string } {
  if (currentUser.role !== 'MANAGER' && currentUser.role !== 'ADMIN') {
    return { allowed: false, reason: 'Only managers and admins can delete users' }
  }

  if (currentUser.id === targetUser.id) {
    return { allowed: false, reason: 'Cannot delete yourself' }
  }

  if (currentUser.role === 'MANAGER') {
    if (targetUser.department !== currentUser.department || targetUser.role !== 'STAFF') {
      return { allowed: false, reason: 'Managers can only delete STAFF in their department' }
    }
  }

  return { allowed: true }
}

describe('Staff Management - Authorization', () => {
  const adminUser: User = {
    id: 'admin-1',
    name: 'Admin User',
    personal_code: 'ADMIN1',
    role: 'ADMIN',
    department: undefined
  }

  const managerATI: User = {
    id: 'manager-1',
    name: 'Manager ATI',
    personal_code: 'MGR1',
    role: 'MANAGER',
    department: 'ATI'
  }

  const staffATI: User = {
    id: 'staff-1',
    name: 'Staff ATI',
    personal_code: 'STAFF1',
    role: 'STAFF',
    department: 'ATI'
  }

  const staffUrgente: User = {
    id: 'staff-2',
    name: 'Staff Urgente',
    personal_code: 'STAFF2',
    role: 'STAFF',
    department: 'Urgente'
  }

  describe('canAddUser', () => {
    test('admin can add any user to any department', () => {
      expect(canAddUser(adminUser, { role: 'STAFF', department: 'ATI' }).allowed).toBe(true)
      expect(canAddUser(adminUser, { role: 'MANAGER', department: 'Urgente' }).allowed).toBe(true)
      expect(canAddUser(adminUser, { role: 'ADMIN', department: undefined }).allowed).toBe(true)
    })

    test('manager can add STAFF to their department', () => {
      const result = canAddUser(managerATI, { role: 'STAFF', department: 'ATI' })
      expect(result.allowed).toBe(true)
    })

    test('manager cannot add MANAGER or ADMIN', () => {
      const resultManager = canAddUser(managerATI, { role: 'MANAGER', department: 'ATI' })
      expect(resultManager.allowed).toBe(false)

      const resultAdmin = canAddUser(managerATI, { role: 'ADMIN', department: 'ATI' })
      expect(resultAdmin.allowed).toBe(false)
    })

    test('manager cannot add to different department', () => {
      const result = canAddUser(managerATI, { role: 'STAFF', department: 'Urgente' })
      expect(result.allowed).toBe(false)
    })

    test('staff cannot add anyone', () => {
      const result = canAddUser(staffATI, { role: 'STAFF', department: 'ATI' })
      expect(result.allowed).toBe(false)
    })
  })

  describe('canUpdateUser', () => {
    test('admin can update any user', () => {
      expect(canUpdateUser(adminUser, staffATI, { role: 'MANAGER' }).allowed).toBe(true)
      expect(canUpdateUser(adminUser, staffUrgente, { department: 'Chirurgie' }).allowed).toBe(true)
    })

    test('admin cannot change own role', () => {
      const result = canUpdateUser(adminUser, adminUser, { role: 'STAFF' })
      expect(result.allowed).toBe(false)
    })

    test('manager can update STAFF in their department', () => {
      const result = canUpdateUser(managerATI, staffATI, { name: 'New Name' })
      expect(result.allowed).toBe(true)
    })

    test('manager cannot update users in other departments', () => {
      const result = canUpdateUser(managerATI, staffUrgente, { name: 'New Name' })
      expect(result.allowed).toBe(false)
    })

    test('manager cannot change user role to non-STAFF', () => {
      const result = canUpdateUser(managerATI, staffATI, { role: 'MANAGER' })
      expect(result.allowed).toBe(false)
    })

    test('manager cannot move user to different department', () => {
      const result = canUpdateUser(managerATI, staffATI, { department: 'Urgente' })
      expect(result.allowed).toBe(false)
    })

    test('staff cannot update anyone', () => {
      const result = canUpdateUser(staffATI, staffUrgente, { name: 'New Name' })
      expect(result.allowed).toBe(false)
    })
  })

  describe('canDeleteUser', () => {
    test('admin can delete any user', () => {
      expect(canDeleteUser(adminUser, staffATI).allowed).toBe(true)
      expect(canDeleteUser(adminUser, managerATI).allowed).toBe(true)
    })

    test('admin cannot delete themselves', () => {
      const result = canDeleteUser(adminUser, adminUser)
      expect(result.allowed).toBe(false)
    })

    test('manager can delete STAFF in their department', () => {
      const result = canDeleteUser(managerATI, staffATI)
      expect(result.allowed).toBe(true)
    })

    test('manager cannot delete users in other departments', () => {
      const result = canDeleteUser(managerATI, staffUrgente)
      expect(result.allowed).toBe(false)
    })

    test('manager cannot delete other managers', () => {
      const managerATI2: User = { ...managerATI, id: 'manager-2', name: 'Manager ATI 2' }
      const result = canDeleteUser(managerATI, managerATI2)
      expect(result.allowed).toBe(false)
    })

    test('manager cannot delete themselves', () => {
      const result = canDeleteUser(managerATI, managerATI)
      expect(result.allowed).toBe(false)
    })

    test('staff cannot delete anyone', () => {
      const result = canDeleteUser(staffATI, staffUrgente)
      expect(result.allowed).toBe(false)
    })
  })
})

describe('Staff Management - User Visibility', () => {
  const users: User[] = [
    { id: '1', name: 'Admin', personal_code: 'A1', role: 'ADMIN' },
    { id: '2', name: 'Manager ATI', personal_code: 'M1', role: 'MANAGER', department: 'ATI' },
    { id: '3', name: 'Staff ATI 1', personal_code: 'S1', role: 'STAFF', department: 'ATI' },
    { id: '4', name: 'Staff ATI 2', personal_code: 'S2', role: 'STAFF', department: 'ATI' },
    { id: '5', name: 'Manager Urgente', personal_code: 'M2', role: 'MANAGER', department: 'Urgente' },
    { id: '6', name: 'Staff Urgente', personal_code: 'S3', role: 'STAFF', department: 'Urgente' },
  ]

  function getVisibleUsers(currentUser: User, allUsers: User[]): User[] {
    if (currentUser.role === 'ADMIN') {
      return allUsers
    }
    if (currentUser.role === 'MANAGER') {
      return allUsers.filter(u => u.department === currentUser.department && u.role === 'STAFF')
    }
    return []
  }

  test('admin sees all users', () => {
    const admin = users.find(u => u.role === 'ADMIN')!
    const visible = getVisibleUsers(admin, users)
    expect(visible.length).toBe(users.length)
  })

  test('manager sees only STAFF in their department', () => {
    const managerATI = users.find(u => u.role === 'MANAGER' && u.department === 'ATI')!
    const visible = getVisibleUsers(managerATI, users)

    expect(visible.length).toBe(2) // Only ATI staff
    expect(visible.every(u => u.role === 'STAFF')).toBe(true)
    expect(visible.every(u => u.department === 'ATI')).toBe(true)
  })

  test('staff sees no users', () => {
    const staff = users.find(u => u.role === 'STAFF')!
    const visible = getVisibleUsers(staff, users)
    expect(visible.length).toBe(0)
  })
})
