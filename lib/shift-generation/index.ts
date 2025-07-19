/**
 * Shift Generation System
 * 
 * This module provides a clean, modular API for generating medical shift schedules.
 * It replaces the monolithic shiftGenerator.ts with focused, testable modules.
 */

// Export all types
export * from './types'

// Export utilities
export * from './dateUtils'
export * from './departmentUtils'
export * from './hospitalConfigs'

// Export core functionality
export * from './doctorFiltering'
export * from './fairnessCalculator'
export * from './scheduleGenerator'

// Re-export main functions for backward compatibility
export { 
  generateDepartmentSchedule,
  generateMonthlySchedule,
  type ScheduleGenerationOptions
} from './scheduleGenerator'

export {
  calculateFairness,
  type FairnessMetrics,
  type DoctorShiftStats
} from './fairnessCalculator'

export {
  normalizeDepartment,
  isValidDepartment,
  getDepartmentDisplayName
} from './departmentUtils'

export {
  getAvailableDoctors,
  selectBestDoctor,
  type DoctorFilterOptions
} from './doctorFiltering'