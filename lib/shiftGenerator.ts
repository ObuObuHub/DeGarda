interface Doctor {
  id: string
  name: string
  department?: string
  shiftsThisMonth: number
  weekendShifts: number
  lastShiftDate?: string
  unavailableDates: string[]
  reservedDates?: string[]
}

interface GeneratedShift {
  date: string
  doctorId: string
  doctorName: string
  department?: string
  type: '24h' | 'day' | 'night'
}

// Generate shifts for a specific department
export function generateDepartmentSchedule(
  year: number,
  month: number,
  doctors: Doctor[],
  department: string,
  existingShifts: Record<string, any> = {}
): GeneratedShift[] {
  // Filter doctors by department
  const departmentDoctors = doctors.filter(d => d.department === department)
  
  // Generate shifts for this department
  const shifts = generateMonthlySchedule(year, month, departmentDoctors, existingShifts)
  
  // Add department to each shift
  return shifts.map(shift => ({
    ...shift,
    department
  }))
}

// Generate shifts for all departments
export function generateAllDepartmentsSchedule(
  year: number,
  month: number,
  doctors: Doctor[],
  existingShifts: Record<string, any> = {}
): GeneratedShift[] {
  const departments = ['ATI', 'Urgențe', 'Laborator', 'Medicină Internă', 'Chirurgie']
  const allShifts: GeneratedShift[] = []
  
  for (const dept of departments) {
    // Filter existing shifts for this department only
    const deptExistingShifts: Record<string, any> = {}
    Object.entries(existingShifts).forEach(([date, shift]) => {
      // STRICT: Check if shift belongs to this department using the shift's department field
      // If shift doesn't have department field, look up from assigned doctor
      if (shift.department === dept) {
        deptExistingShifts[date] = shift
      } else if (!shift.department && shift.doctorId) {
        // Fallback: check doctor's department only if shift doesn't have department
        const doctor = doctors.find(d => d.id === shift.doctorId?.toString())
        if (doctor && doctor.department === dept) {
          deptExistingShifts[date] = shift
        }
      }
      // If shift has no department and no doctor, it doesn't belong to any department
    })
    
    const deptShifts = generateDepartmentSchedule(year, month, doctors, dept, deptExistingShifts)
    allShifts.push(...deptShifts)
  }
  
  return allShifts
}

export function generateMonthlySchedule(
  year: number,
  month: number,
  doctors: Doctor[],
  existingShifts: Record<string, any> = {}
): GeneratedShift[] {
  const shifts: GeneratedShift[] = []
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  // Create arrays for weekdays and weekends
  const weekdays: number[] = []
  const weekends: number[] = []
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const dayOfWeek = date.getDay()
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekends.push(day)
    } else {
      weekdays.push(day)
    }
  }
  
  // Copy doctors array to track assignments
  const doctorStats = doctors.map(d => ({
    ...d,
    assignedShifts: 0,
    assignedWeekends: 0,
    lastShiftDate: d.lastShiftDate || null
  }))
  
  // First pass: Assign all reserved shifts
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    
    // Skip if already has a shift
    if (existingShifts[dateStr]) continue
    
    // Check if any doctor reserved this date
    const reservingDoctor = doctorStats.find(d => d.reservedDates?.includes(dateStr))
    if (reservingDoctor) {
      shifts.push({
        date: dateStr,
        doctorId: reservingDoctor.id,
        doctorName: reservingDoctor.name,
        type: '24h'
      })
      
      reservingDoctor.assignedShifts++
      reservingDoctor.lastShiftDate = dateStr
      
      // Track weekend assignments
      const dayOfWeek = new Date(year, month, day).getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        reservingDoctor.assignedWeekends++
      }
    }
  }
  
  // Helper function to get available doctors for a date
  const getAvailableDoctors = (day: number, isWeekend: boolean) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const yesterday = new Date(year, month, day - 1)
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
    
    return doctorStats
      .filter(d => {
        // Check unavailable dates
        if (d.unavailableDates.includes(dateStr)) return false
        
        // Check consecutive days (no back-to-back shifts)
        if (d.lastShiftDate === yesterdayStr) return false
        
        // Check weekend limit (max 2 per month)
        if (isWeekend && d.assignedWeekends >= 2) return false
        
        return true
      })
      .sort((a, b) => {
        // For weekends, prioritize doctors with 0 weekend shifts
        if (isWeekend && a.assignedWeekends !== b.assignedWeekends) {
          return a.assignedWeekends - b.assignedWeekends
        }
        // Otherwise, prioritize doctors with fewer total shifts
        return a.assignedShifts - b.assignedShifts
      })
  }
  
  // Assign weekend shifts first (priority)
  for (const day of weekends) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    
    // Skip if already has a shift (including reserved shifts)
    if (existingShifts[dateStr] || shifts.find(s => s.date === dateStr)) continue
    
    const availableDoctors = getAvailableDoctors(day, true)
    
    if (availableDoctors.length > 0) {
      const selectedDoctor = availableDoctors[0]
      
      shifts.push({
        date: dateStr,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        type: '24h'
      })
      
      selectedDoctor.assignedShifts++
      selectedDoctor.assignedWeekends++
      selectedDoctor.lastShiftDate = dateStr
    }
  }
  
  // Assign weekday shifts
  for (const day of weekdays) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    
    // Skip if already has a shift (including reserved shifts)
    if (existingShifts[dateStr] || shifts.find(s => s.date === dateStr)) continue
    
    const availableDoctors = getAvailableDoctors(day, false)
    
    if (availableDoctors.length > 0) {
      const selectedDoctor = availableDoctors[0]
      
      shifts.push({
        date: dateStr,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        type: '24h'
      })
      
      selectedDoctor.assignedShifts++
      selectedDoctor.lastShiftDate = dateStr
    }
  }
  
  return shifts
}

// Calculate fair distribution metrics
export function calculateFairness(shifts: GeneratedShift[], doctors: Doctor[]) {
  const stats = new Map<string, { total: number, weekends: number }>()
  
  // Initialize stats
  doctors.forEach(d => {
    stats.set(d.id, { total: 0, weekends: 0 })
  })
  
  // Count shifts
  shifts.forEach(shift => {
    const stat = stats.get(shift.doctorId)
    if (stat) {
      stat.total++
      
      const date = new Date(shift.date)
      if (date.getDay() === 0 || date.getDay() === 6) {
        stat.weekends++
      }
    }
  })
  
  // Calculate variance
  const totals = Array.from(stats.values()).map(s => s.total)
  const avg = totals.reduce((a, b) => a + b, 0) / totals.length
  const variance = totals.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / totals.length
  
  return {
    stats: Object.fromEntries(stats),
    average: avg,
    variance,
    fairnessScore: variance === 0 ? 100 : Math.max(0, 100 - (variance * 10))
  }
}