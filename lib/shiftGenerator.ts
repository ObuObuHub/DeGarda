interface Doctor {
  id: string
  name: string
  shiftsThisMonth: number
  weekendShifts: number
  unavailableDates: string[]
}

interface GeneratedShift {
  date: string
  doctorId: string
  doctorName: string
  type: '24h' | 'day' | 'night'
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
    assignedWeekends: 0
  }))
  
  // Helper function to get available doctors for a date
  const getAvailableDoctors = (day: number, isWeekend: boolean) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    
    return doctorStats
      .filter(d => !d.unavailableDates.includes(dateStr))
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
    
    // Skip if already has a shift
    if (existingShifts[dateStr]) continue
    
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
    }
  }
  
  // Assign weekday shifts
  for (const day of weekdays) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    
    // Skip if already has a shift
    if (existingShifts[dateStr]) continue
    
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