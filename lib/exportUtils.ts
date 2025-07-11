import * as XLSX from 'xlsx'
import { staff } from './data'

interface ShiftData {
  date: string
  doctorId: string | null
  doctorName: string | null
  type: string
  status: string
}

export function exportScheduleToExcel(
  shifts: Record<string, ShiftData>,
  month: number,
  year: number,
  hospitalName: string
) {
  // Romanian month names
  const monthNames = [
    'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
  ]

  const dayNames = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă']

  // Convert shifts to array format for Excel
  const data = []
  
  // Add header
  data.push([`Program Gărzi - ${monthNames[month]} ${year}`])
  data.push([hospitalName])
  data.push([]) // Empty row
  data.push(['Data', 'Zi', 'Doctor', 'Tip Gardă', 'Status'])

  // Get all days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const date = new Date(year, month, day)
    const dayName = dayNames[date.getDay()]
    
    const shift = shifts[dateStr]
    
    if (shift) {
      data.push([
        `${day} ${monthNames[month]} ${year}`,
        dayName,
        shift.doctorName || 'Nealocat',
        shift.type === '24h' ? 'Gardă 24h' : shift.type,
        shift.status === 'assigned' ? 'Atribuit' : 'Liber'
      ])
    } else {
      data.push([
        `${day} ${monthNames[month]} ${year}`,
        dayName,
        'Nealocat',
        'Gardă 24h',
        'Liber'
      ])
    }
  }

  // Add summary at the end
  data.push([]) // Empty row
  data.push(['Sumar:'])
  
  // Count shifts per doctor
  const doctorCounts: Record<string, number> = {}
  Object.values(shifts).forEach(shift => {
    if (shift.doctorName) {
      doctorCounts[shift.doctorName] = (doctorCounts[shift.doctorName] || 0) + 1
    }
  })

  data.push(['Doctor', 'Număr Gărzi'])
  Object.entries(doctorCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([doctor, count]) => {
      data.push([doctor, count])
    })

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(data)

  // Set column widths
  ws['!cols'] = [
    { width: 20 }, // Data
    { width: 12 }, // Zi
    { width: 25 }, // Doctor
    { width: 15 }, // Tip Gardă
    { width: 12 }  // Status
  ]

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Program Gărzi')

  // Generate Excel file
  const fileName = `Program_Garzi_${monthNames[month]}_${year}.xlsx`
  XLSX.writeFile(wb, fileName)
}