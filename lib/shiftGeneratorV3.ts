import { ShiftType } from '@/types'

// Types
export interface Doctor {
  id: string
  name: string
  department?: string
  hospitalId?: number | string
  shiftsThisMonth: number
  weekendShifts: number
  lastShiftDate?: string
  unavailableDates: string[]
  reservedDates?: string[]
}

export interface GeneratedShift {
  date: string
  doctorId: string
  doctorName: string
  department?: string
  type: ShiftType
}

export interface GenerationStats {
  totalDays: number
  totalShiftsNeeded: number
  totalShiftsGenerated: number
  unassignedDates: string[]
  departmentStats: Record<string, {
    shiftsNeeded: number
    shiftsGenerated: number
    unassignedDates: string[]
  }>
}

export interface HospitalConfig {
  id: number
  name: string
  shiftRules?: {
    departments?: {
      [department: string]: {
        enabled: boolean
        shiftType?: ShiftType
        minDoctors?: number
      }
    }
  }
}

// Constants
export const VALID_DEPARTMENTS = ['ATI', 'Urgențe', 'Laborator', 'Medicină Internă', 'Chirurgie'] as const
export type ValidDepartment = typeof VALID_DEPARTMENTS[number]

// Hospital-specific configurations
const HOSPITAL_CONFIGS: Record<string, Partial<HospitalConfig>> = {
  // Buhusi - Laboratory has no shifts
  'Spitalul Municipal Buhusi': {
    shiftRules: {
      departments: {
        'Laborator': { enabled: false } // No lab shifts at Buhusi
      }
    }
  },
  // Piatra Neamt - Laboratory has 12h shifts instead of 24h
  'Spitalul Județean de Urgență': {
    shiftRules: {
      departments: {
        'Laborator': { enabled: true, shiftType: '12h' as ShiftType } // 12h shifts for lab at Piatra Neamt
      }
    }
  },
  // Roman - standard rules (no special configuration)
  'Spitalul Municipal': {
    shiftRules: {
      departments: {}
    }
  }
}

// Department normalization map
const DEPARTMENT_NORMALIZATION_MAP: Record<string, ValidDepartment | undefined> = {
  // ATI variations
  'ati': 'ATI',
  'a.t.i': 'ATI',
  'a.t.i.': 'ATI',
  'terapie intensiva': 'ATI',
  'terapie intensivă': 'ATI',
  
  // Urgențe variations
  'urgente': 'Urgențe',
  'urgențe': 'Urgențe',
  'urgența': 'Urgențe',
  'urgenta': 'Urgențe',
  'upa': 'Urgențe',
  'u.p.a': 'Urgențe',
  'u.p.a.': 'Urgențe',
  
  // Laborator variations
  'laborator': 'Laborator',
  'lab': 'Laborator',
  'laborator analize': 'Laborator',
  'laborator analize medicale': 'Laborator',
  
  // Medicină Internă variations
  'medicina interna': 'Medicină Internă',
  'medicină internă': 'Medicină Internă',
  'medicina internă': 'Medicină Internă',
  'interna': 'Medicină Internă',
  'internă': 'Medicină Internă',
  'mi': 'Medicină Internă',
  'm.i.': 'Medicină Internă',
  
  // Chirurgie variations
  'chirurgie': 'Chirurgie',
  'chir': 'Chirurgie',
  'chirurgie generala': 'Chirurgie',
  'chirurgie generală': 'Chirurgie',
  
  // Role-based terms that are NOT departments
  'medic': undefined,
  'doctor': undefined,
  'biolog': undefined,
  'chimist': undefined,
  'asistent': undefined,
  'asistent medical': undefined,
  'infirmier': undefined,
  'infirmiera': undefined,
  'infirmieră': undefined
}

// Utility functions
export function normalizeDepartment(dept: string | undefined): ValidDepartment | undefined {
  if (!dept || dept.trim() === '') return undefined
  
  const normalized = dept.toLowerCase().trim()
  
  // Check normalization map
  if (normalized in DEPARTMENT_NORMALIZATION_MAP) {
    return DEPARTMENT_NORMALIZATION_MAP[normalized]
  }
  
  // Check if already valid
  if (VALID_DEPARTMENTS.includes(dept as ValidDepartment)) {
    return dept as ValidDepartment
  }
  
  // Log unknown departments for future mapping
  console.warn(`Unknown department: "${dept}" - cannot normalize`)
  return undefined
}

export function getHospitalConfig(hospitalName: string): HospitalConfig['shiftRules'] {
  return HOSPITAL_CONFIGS[hospitalName]?.shiftRules || {}
}

export function isDepartmentEnabledForHospital(
  department: string, 
  hospitalName: string
): boolean {
  const config = getHospitalConfig(hospitalName)
  const deptConfig = config?.departments?.[department]
  
  // If no specific config, department is enabled by default
  if (!deptConfig) return true
  
  return deptConfig.enabled !== false
}

export function getShiftTypeForDepartment(
  department: string,
  hospitalName: string
): ShiftType {
  const config = getHospitalConfig(hospitalName)
  const deptConfig = config?.departments?.[department]
  const shiftType = deptConfig?.shiftType || '24h'
  
  if (deptConfig?.shiftType) {
    console.log(`[HOSPITAL RULE] ${hospitalName} - ${department}: Using ${shiftType} shifts`)
  }
  
  return shiftType
}

// Date utilities
export function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function isWeekend(date: Date): boolean {
  const dayOfWeek = date.getDay()
  return dayOfWeek === 0 || dayOfWeek === 6
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

// Doctor filtering and sorting
export function getAvailableDoctors(
  doctors: Doctor[],
  date: string,
  options: {
    department?: string
    checkConsecutiveDays?: boolean
    maxWeekendShifts?: number
  } = {}
): Doctor[] {
  const { department, checkConsecutiveDays = true, maxWeekendShifts = 2 } = options
  
  // Parse date for weekend check
  const [year, month, day] = date.split('-').map(Number)
  const dateObj = new Date(year, month - 1, day)
  const isWeekendDay = isWeekend(dateObj)
  
  // Calculate yesterday's date string
  const yesterday = new Date(year, month - 1, day - 1)
  const yesterdayStr = formatDate(
    yesterday.getFullYear(),
    yesterday.getMonth(),
    yesterday.getDate()
  )
  
  return doctors
    .filter(doctor => {
      // Department filter
      if (department && normalizeDepartment(doctor.department) !== department) {
        return false
      }
      
      // Check unavailable dates
      if (doctor.unavailableDates.includes(date)) {
        return false
      }
      
      // Check consecutive days
      if (checkConsecutiveDays && doctor.lastShiftDate === yesterdayStr) {
        return false
      }
      
      // Weekend limit
      if (isWeekendDay && doctor.weekendShifts >= maxWeekendShifts) {
        return false
      }
      
      return true
    })
    .sort((a, b) => {
      // For weekends, prioritize doctors with fewer weekend shifts
      if (isWeekendDay && a.weekendShifts !== b.weekendShifts) {
        return a.weekendShifts - b.weekendShifts
      }
      // Otherwise, prioritize doctors with fewer total shifts
      return a.shiftsThisMonth - b.shiftsThisMonth
    })
}

// Main generation function for a department
export function generateDepartmentSchedule(
  year: number,
  month: number,
  doctors: Doctor[],
  department: ValidDepartment,
  hospitalName: string,
  existingShifts: Record<string, any> = {}
): { shifts: GeneratedShift[], stats: GenerationStats } {
  // Check if department is enabled for this hospital
  if (!isDepartmentEnabledForHospital(department, hospitalName)) {
    console.log(`[HOSPITAL RULE] Department ${department} is disabled for ${hospitalName}`)
    const daysInMonth = getDaysInMonth(year, month)
    return {
      shifts: [],
      stats: {
        totalDays: daysInMonth,
        totalShiftsNeeded: 0,
        totalShiftsGenerated: 0,
        unassignedDates: [],
        departmentStats: {
          [department]: {
            shiftsNeeded: 0,
            shiftsGenerated: 0,
            unassignedDates: []
          }
        }
      }
    }
  }
  
  // Get shift type for this department/hospital
  const shiftType = getShiftTypeForDepartment(department, hospitalName)
  
  // Filter doctors by department
  const departmentDoctors = doctors.filter(
    d => normalizeDepartment(d.department) === department
  )
  
  if (departmentDoctors.length === 0) {
    console.warn(`No doctors available for department: ${department}`)
    const daysInMonth = getDaysInMonth(year, month)
    const unassignedDates: string[] = []
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(year, month, day)
      if (!existingShifts[dateStr]) {
        unassignedDates.push(dateStr)
      }
    }
    
    return {
      shifts: [],
      stats: {
        totalDays: daysInMonth,
        totalShiftsNeeded: daysInMonth,
        totalShiftsGenerated: 0,
        unassignedDates,
        departmentStats: {
          [department]: {
            shiftsNeeded: daysInMonth,
            shiftsGenerated: 0,
            unassignedDates
          }
        }
      }
    }
  }
  
  // Generate shifts
  const result = generateMonthlySchedule(
    year,
    month,
    departmentDoctors,
    existingShifts,
    { shiftType }
  )
  
  // Add department to each shift
  const shiftsWithDept = result.shifts.map(shift => ({
    ...shift,
    department,
    type: shiftType
  }))
  
  return {
    shifts: shiftsWithDept,
    stats: {
      ...result.stats,
      departmentStats: {
        [department]: {
          shiftsNeeded: result.stats.totalShiftsNeeded,
          shiftsGenerated: result.stats.totalShiftsGenerated,
          unassignedDates: result.stats.unassignedDates
        }
      }
    }
  }
}

// Core monthly schedule generation
export function generateMonthlySchedule(
  year: number,
  month: number,
  doctors: Doctor[],
  existingShifts: Record<string, any> = {},
  options: {
    shiftType?: ShiftType
    prioritizeWeekends?: boolean
  } = {}
): { shifts: GeneratedShift[], stats: GenerationStats } {
  const { shiftType = '24h', prioritizeWeekends = true } = options
  const shifts: GeneratedShift[] = []
  const daysInMonth = getDaysInMonth(year, month)
  const unassignedDates: string[] = []
  
  // Track doctor assignments
  const doctorStats = new Map(
    doctors.map(d => [d.id, {
      ...d,
      assignedShifts: d.shiftsThisMonth || 0,
      assignedWeekends: d.weekendShifts || 0,
      lastAssignedDate: d.lastShiftDate || null
    }])
  )
  
  // Separate days into weekends and weekdays
  const weekends: number[] = []
  const weekdays: number[] = []
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    if (isWeekend(date)) {
      weekends.push(day)
    } else {
      weekdays.push(day)
    }
  }
  
  // Helper to assign shift
  const assignShift = (day: number, isWeekendDay: boolean) => {
    const dateStr = formatDate(year, month, day)
    
    // Skip if already has shift
    if (existingShifts[dateStr] || shifts.find(s => s.date === dateStr)) {
      return true
    }
    
    // Get available doctors
    const availableDoctorIds = Array.from(doctorStats.keys()).filter(id => {
      const doctor = doctorStats.get(id)!
      
      // Check unavailability
      if (doctor.unavailableDates.includes(dateStr)) return false
      
      // Check consecutive days
      if (doctor.lastAssignedDate) {
        const [lastYear, lastMonth, lastDay] = doctor.lastAssignedDate.split('-').map(Number)
        const lastDate = new Date(lastYear, lastMonth - 1, lastDay)
        const currentDate = new Date(year, month, day)
        const dayDiff = (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        if (dayDiff === 1) return false
      }
      
      // Weekend limit
      if (isWeekendDay && doctor.assignedWeekends >= 2) return false
      
      return true
    })
    
    if (availableDoctorIds.length === 0) {
      unassignedDates.push(dateStr)
      return false
    }
    
    // Sort by priority
    availableDoctorIds.sort((a, b) => {
      const doctorA = doctorStats.get(a)!
      const doctorB = doctorStats.get(b)!
      
      if (isWeekendDay && doctorA.assignedWeekends !== doctorB.assignedWeekends) {
        return doctorA.assignedWeekends - doctorB.assignedWeekends
      }
      
      return doctorA.assignedShifts - doctorB.assignedShifts
    })
    
    // Assign to first available doctor
    const selectedId = availableDoctorIds[0]
    const selectedDoctor = doctorStats.get(selectedId)!
    
    shifts.push({
      date: dateStr,
      doctorId: selectedId,
      doctorName: selectedDoctor.name,
      type: shiftType
    })
    
    // Update stats
    selectedDoctor.assignedShifts++
    if (isWeekendDay) {
      selectedDoctor.assignedWeekends++
    }
    selectedDoctor.lastAssignedDate = dateStr
    
    return true
  }
  
  // Process reserved dates first
  for (const doctor of doctorStats.values()) {
    if (doctor.reservedDates) {
      for (const reservedDate of doctor.reservedDates) {
        // Check if date is in current month
        const [resYear, resMonth] = reservedDate.split('-').map(Number)
        if (resYear === year && resMonth === month + 1) {
          const day = parseInt(reservedDate.split('-')[2])
          const isWeekendDay = isWeekend(new Date(year, month, day))
          
          if (!existingShifts[reservedDate]) {
            shifts.push({
              date: reservedDate,
              doctorId: doctor.id,
              doctorName: doctor.name,
              type: shiftType
            })
            
            doctor.assignedShifts++
            if (isWeekendDay) {
              doctor.assignedWeekends++
            }
            doctor.lastAssignedDate = reservedDate
          }
        }
      }
    }
  }
  
  // Assign shifts with weekend priority
  if (prioritizeWeekends) {
    // Assign weekends first
    for (const day of weekends) {
      assignShift(day, true)
    }
    
    // Then weekdays
    for (const day of weekdays) {
      assignShift(day, false)
    }
  } else {
    // Assign in chronological order
    for (let day = 1; day <= daysInMonth; day++) {
      const isWeekendDay = isWeekend(new Date(year, month, day))
      assignShift(day, isWeekendDay)
    }
  }
  
  return {
    shifts: shifts.sort((a, b) => a.date.localeCompare(b.date)),
    stats: {
      totalDays: daysInMonth,
      totalShiftsNeeded: daysInMonth,
      totalShiftsGenerated: shifts.length,
      unassignedDates: unassignedDates.sort(),
      departmentStats: {}
    }
  }
}

// Fairness calculation
export function calculateFairness(
  shifts: GeneratedShift[],
  doctors: Doctor[]
): {
  doctorStats: Map<string, { total: number; weekends: number }>
  average: number
  variance: number
  fairnessScore: number
} {
  const doctorStats = new Map<string, { total: number; weekends: number }>()
  
  // Initialize stats
  for (const doctor of doctors) {
    doctorStats.set(doctor.id, { total: 0, weekends: 0 })
  }
  
  // Count shifts
  for (const shift of shifts) {
    const stat = doctorStats.get(shift.doctorId)
    if (stat) {
      stat.total++
      
      const [year, month, day] = shift.date.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      if (isWeekend(date)) {
        stat.weekends++
      }
    }
  }
  
  // Calculate metrics
  const totals = Array.from(doctorStats.values()).map(s => s.total)
  const average = totals.reduce((a, b) => a + b, 0) / totals.length || 0
  const variance = totals.reduce(
    (sum, val) => sum + Math.pow(val - average, 2), 
    0
  ) / totals.length || 0
  
  const fairnessScore = variance === 0 ? 100 : Math.max(0, 100 - (variance * 10))
  
  return {
    doctorStats,
    average,
    variance,
    fairnessScore
  }
}