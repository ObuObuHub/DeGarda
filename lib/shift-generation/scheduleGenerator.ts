import { Doctor, GeneratedShift, GenerationStats, ValidDepartment } from './types'
import { getDaysInMonth, formatDate, isWeekend } from './dateUtils'
import { getAvailableDoctors, selectBestDoctor, filterDoctorsByDepartment } from './doctorFiltering'
import { isDepartmentEnabledForHospital, getShiftTypeForDepartment } from './hospitalConfigs'
import { calculateFairness } from './fairnessCalculator'
import { logger } from '../logger'

export interface ScheduleGenerationOptions {
  shiftType?: string
  prioritizeWeekends?: boolean
  maxConsecutiveDays?: number
  maxWeekendShifts?: number
}

export function generateDepartmentSchedule(
  year: number,
  month: number,
  doctors: Doctor[],
  department: ValidDepartment,
  hospitalName: string,
  existingShifts: Record<string, any> = {},
  options: ScheduleGenerationOptions = {}
): { shifts: GeneratedShift[], stats: GenerationStats } {
  // Check if department is enabled for this hospital
  if (!isDepartmentEnabledForHospital(hospitalName, department)) {
    logger.info('shiftGenerator', `Department ${department} is disabled for ${hospitalName}`)
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
  const shiftType = options.shiftType || getShiftTypeForDepartment(hospitalName, department)
  
  // Filter doctors by department
  const departmentDoctors = filterDoctorsByDepartment(doctors, department)
  
  if (departmentDoctors.length === 0) {
    logger.warn('shiftGenerator', `No doctors available for department: ${department}`)
    const daysInMonth = getDaysInMonth(year, month)
    return {
      shifts: [],
      stats: {
        totalDays: daysInMonth,
        totalShiftsNeeded: daysInMonth,
        totalShiftsGenerated: 0,
        unassignedDates: Array.from({ length: daysInMonth }, (_, i) => 
          formatDate(year, month, i + 1)
        ),
        departmentStats: {
          [department]: {
            shiftsNeeded: daysInMonth,
            shiftsGenerated: 0,
            unassignedDates: Array.from({ length: daysInMonth }, (_, i) => 
              formatDate(year, month, i + 1)
            )
          }
        }
      }
    }
  }
  
  const shifts: GeneratedShift[] = []
  const unassignedDates: string[] = []
  const daysInMonth = getDaysInMonth(year, month)
  
  // Generate shifts for each day
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(year, month, day)
    
    // Skip if shift already exists
    if (existingShifts[dateStr]) {
      continue
    }
    
    // Get available doctors for this date
    const availableDoctors = getAvailableDoctors(departmentDoctors, dateStr, {
      department,
      checkConsecutiveDays: true,
      maxWeekendShifts: options.maxWeekendShifts || 2
    })
    
    // Select best doctor
    const selectedDoctor = selectBestDoctor(availableDoctors, dateStr)
    
    if (selectedDoctor) {
      shifts.push({
        date: dateStr,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        department,
        type: shiftType as any
      })
      
      // Update doctor's stats for subsequent selections
      selectedDoctor.shiftsThisMonth++
      selectedDoctor.lastShiftDate = dateStr
      
      // Update weekend shifts if this is a weekend
      const [year, month, day] = dateStr.split('-').map(Number)
      const dateObj = new Date(year, month - 1, day)
      if (isWeekend(dateObj)) {
        selectedDoctor.weekendShifts++
      }
    } else {
      unassignedDates.push(dateStr)
    }
  }
  
  // Calculate statistics
  const stats: GenerationStats = {
    totalDays: daysInMonth,
    totalShiftsNeeded: daysInMonth,
    totalShiftsGenerated: shifts.length,
    unassignedDates,
    departmentStats: {
      [department]: {
        shiftsNeeded: daysInMonth,
        shiftsGenerated: shifts.length,
        unassignedDates
      }
    }
  }
  
  return { shifts, stats }
}

export function generateMonthlySchedule(
  year: number,
  month: number,
  doctors: Doctor[],
  departments: ValidDepartment[],
  hospitalName: string,
  existingShifts: Record<string, any> = {},
  options: ScheduleGenerationOptions = {}
): { shifts: GeneratedShift[], stats: GenerationStats, fairnessReport: any } {
  const allShifts: GeneratedShift[] = []
  const combinedStats: GenerationStats = {
    totalDays: getDaysInMonth(year, month),
    totalShiftsNeeded: 0,
    totalShiftsGenerated: 0,
    unassignedDates: [],
    departmentStats: {}
  }
  
  // Generate schedule for each department
  for (const department of departments) {
    const result = generateDepartmentSchedule(
      year, 
      month, 
      doctors, 
      department, 
      hospitalName, 
      existingShifts, 
      options
    )
    
    allShifts.push(...result.shifts)
    combinedStats.totalShiftsNeeded += result.stats.totalShiftsNeeded
    combinedStats.totalShiftsGenerated += result.stats.totalShiftsGenerated
    combinedStats.departmentStats[department] = result.stats.departmentStats[department]
    
    // Merge unassigned dates (remove duplicates)
    const newUnassigned = result.stats.unassignedDates.filter(
      date => !combinedStats.unassignedDates.includes(date)
    )
    combinedStats.unassignedDates.push(...newUnassigned)
  }
  
  // Calculate fairness metrics
  const fairnessReport = calculateFairness(allShifts, doctors)
  
  return {
    shifts: allShifts,
    stats: combinedStats,
    fairnessReport
  }
}