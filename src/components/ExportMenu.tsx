'use client'

import { useState, useRef, useEffect } from 'react'
import { type Shift, type User } from '@/lib/supabase'
import { parseISODate, formatDateForDB } from '@/lib/dateUtils'

interface ExportMenuProps {
  shifts: Shift[]
  users: User[]
  selectedDate: Date
  currentUser: User
}

type ExportFormat = 'csv-simple' | 'csv-detailed' | 'csv-staff'

export default function ExportMenu({
  shifts,
  users,
  selectedDate,
  currentUser
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const year = selectedDate.getFullYear()
  const month = selectedDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthNames = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
                     'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie']

  const getMonthShifts = () => {
    return shifts.filter(s => {
      const d = parseISODate(s.shift_date)
      const inMonth = d.getMonth() === month && d.getFullYear() === year
      // DEPARTMENT_MANAGER can only see their own department
      if (currentUser.role === 'DEPARTMENT_MANAGER') {
        return inMonth && s.department === currentUser.department
      }
      return inMonth
    })
  }

  const getFilteredUsers = () => {
    // DEPARTMENT_MANAGER can only see staff from their own department
    if (currentUser.role === 'DEPARTMENT_MANAGER') {
      return users.filter(u => u.role === 'STAFF' && u.department === currentUser.department)
    }
    return users.filter(u => u.role === 'STAFF')
  }

  const downloadCSV = (content: string, filename: string) => {
    const BOM = '\uFEFF' // UTF-8 BOM for Excel
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
  }

  const exportSimple = () => {
    const monthShifts = getMonthShifts()
    const rows = []
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day, 12, 0, 0)
      const dateStr = formatDateForDB(date)
      const dayShifts = monthShifts.filter(s => s.shift_date === dateStr)

      const row: Record<string, string> = {
        date: `${String(day).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.${year}`,
        medicina: '',
        chirurgie: '',
        urgente: '',
        ati: ''
      }

      dayShifts.forEach(shift => {
        if (shift.department === 'Medicina Interna') row.medicina = shift.user?.name || ''
        if (shift.department === 'Chirurgie') row.chirurgie = shift.user?.name || ''
        if (shift.department === 'Urgente') row.urgente = shift.user?.name || ''
        if (shift.department === 'ATI') row.ati = shift.user?.name || ''
      })

      rows.push(row)
    }

    const csv = [
      'Data,Interne,Chirurgie,CPU,ATI',
      ...rows.map(r => `${r.date},${r.medicina},${r.chirurgie},${r.urgente},${r.ati}`)
    ].join('\n')

    downloadCSV(csv, `Garzi ${monthNames[month]} ${year}.csv`)
    setIsOpen(false)
  }

  const exportDetailed = () => {
    const monthShifts = getMonthShifts()

    const rows = monthShifts.map(shift => {
      const shiftDate = parseISODate(shift.shift_date)
      const dayNames = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă']

      return {
        data: `${String(shiftDate.getDate()).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.${year}`,
        ziua: dayNames[shiftDate.getDay()],
        departament: shift.department || '',
        tipTura: shift.shift_type?.name || 'Standard',
        asignat: shift.user?.name || 'Neocupat',
        status: shift.status === 'assigned' ? 'Asignat' :
                shift.status === 'reserved' ? 'Rezervat' :
                shift.status === 'available' ? 'Disponibil' :
                shift.status === 'pending_swap' ? 'În schimb' : shift.status
      }
    }).sort((a, b) => a.data.localeCompare(b.data))

    const csv = [
      'Data,Ziua,Departament,Tip Tură,Asignat,Status',
      ...rows.map(r => `${r.data},${r.ziua},${r.departament},${r.tipTura},${r.asignat},${r.status}`)
    ].join('\n')

    downloadCSV(csv, `Garzi Detaliat ${monthNames[month]} ${year}.csv`)
    setIsOpen(false)
  }

  const exportStaffReport = () => {
    const monthShifts = getMonthShifts()
    const staffUsers = getFilteredUsers()

    const staffStats = staffUsers.map(user => {
      const userShifts = monthShifts.filter(s => s.assigned_to === user.id)
      const assignedCount = userShifts.filter(s => s.status === 'assigned').length
      const reservedCount = userShifts.filter(s => s.status === 'reserved').length

      // Count by department
      const byDept: Record<string, number> = {}
      userShifts.forEach(s => {
        const dept = s.department || 'Nespecificat'
        byDept[dept] = (byDept[dept] || 0) + 1
      })

      // Count weekends
      const weekendCount = userShifts.filter(s => {
        const d = parseISODate(s.shift_date)
        return d.getDay() === 0 || d.getDay() === 6
      }).length

      return {
        nume: user.name,
        departament: user.department || '',
        totalTure: userShifts.length,
        asignate: assignedCount,
        rezervate: reservedCount,
        maxTure: user.max_shifts_per_month || 8,
        procent: Math.round((userShifts.length / (user.max_shifts_per_month || 8)) * 100),
        weekend: weekendCount,
        perDept: Object.entries(byDept).map(([d, c]) => `${d}: ${c}`).join('; ')
      }
    }).sort((a, b) => b.totalTure - a.totalTure)

    const csv = [
      'Nume,Departament,Total Ture,Asignate,Rezervate,Max Ture,Procent %,Weekenduri,Per Departament',
      ...staffStats.map(s =>
        `${s.nume},${s.departament},${s.totalTure},${s.asignate},${s.rezervate},${s.maxTure},${s.procent}%,${s.weekend},"${s.perDept}"`
      )
    ].join('\n')

    downloadCSV(csv, `Raport Personal ${monthNames[month]} ${year}.csv`)
    setIsOpen(false)
  }

  const handleExport = (format: ExportFormat) => {
    switch (format) {
      case 'csv-simple':
        exportSimple()
        break
      case 'csv-detailed':
        exportDetailed()
        break
      case 'csv-staff':
        exportStaffReport()
        break
    }
  }

  // Only managers and admins can access detailed exports
  const canAccessDetailedExports = currentUser.role !== 'STAFF'

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-secondary flex items-center gap-2"
      >
        <span>📥</span>
        <span className="hidden sm:inline">Export</span>
        <span className="text-xs">▼</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-2">
            <p className="text-xs text-gray-500 px-3 py-2 border-b">
              Export pentru {monthNames[month]} {year}
            </p>

            <button
              onClick={() => handleExport('csv-simple')}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded flex items-center gap-3"
            >
              <span>📊</span>
              <div>
                <p className="font-medium text-sm">Tabel simplu</p>
                <p className="text-xs text-gray-500">Ture pe departament/zi</p>
              </div>
            </button>

            {canAccessDetailedExports && (
              <>
                <button
                  onClick={() => handleExport('csv-detailed')}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded flex items-center gap-3"
                >
                  <span>📋</span>
                  <div>
                    <p className="font-medium text-sm">Raport detaliat</p>
                    <p className="text-xs text-gray-500">Toate turele cu status</p>
                  </div>
                </button>

                <button
                  onClick={() => handleExport('csv-staff')}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded flex items-center gap-3"
                >
                  <span>👥</span>
                  <div>
                    <p className="font-medium text-sm">Raport personal</p>
                    <p className="text-xs text-gray-500">Statistici per angajat</p>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
