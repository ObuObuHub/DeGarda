// Re-export everything from V3 for backward compatibility
export * from './shiftGeneratorV3'

// Legacy exports for compatibility
import { 
  generateMonthlySchedule as generateMonthlyScheduleV3,
  GeneratedShift,
  Doctor,
  ValidDepartment,
  GenerationStats
} from './shiftGeneratorV3'

// Legacy function that doesn't require hospital name
export function generateMonthlyScheduleWithStats(
  year: number,
  month: number,
  doctors: Doctor[],
  existingShifts: Record<string, any> = {}
): { shifts: GeneratedShift[], stats: GenerationStats } {
  return generateMonthlyScheduleV3(year, month, doctors, existingShifts)
}

// Legacy function for generating all departments (deprecated)
export function generateAllDepartmentsSchedule(
  year: number,
  month: number,
  doctors: Doctor[],
  existingShifts: Record<string, any> = {}
): { shifts: GeneratedShift[], stats: GenerationStats } {
  console.warn('generateAllDepartmentsSchedule is deprecated. Generate per department instead.')
  return { 
    shifts: [], 
    stats: {
      totalDays: new Date(year, month + 1, 0).getDate(),
      totalShiftsNeeded: 0,
      totalShiftsGenerated: 0,
      unassignedDates: [],
      departmentStats: {}
    }
  }
}