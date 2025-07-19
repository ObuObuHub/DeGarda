import { Doctor, ValidDepartment } from './types'
import { normalizeDepartment } from './departmentUtils'
import { formatDate, isWeekend } from './dateUtils'

export interface DoctorFilterOptions {
  department?: string
  checkConsecutiveDays?: boolean
  maxWeekendShifts?: number
}

export function getAvailableDoctors(
  doctors: Doctor[],
  date: string,
  options: DoctorFilterOptions = {}
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
    yesterday.getMonth() + 1,
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

export function filterDoctorsByDepartment(
  doctors: Doctor[], 
  department: ValidDepartment
): Doctor[] {
  return doctors.filter(
    d => normalizeDepartment(d.department) === department
  )
}

export function getDoctorWorkloadScore(doctor: Doctor, isWeekend: boolean): number {
  // Calculate a fairness score for doctor selection
  const baseScore = doctor.shiftsThisMonth * 10
  const weekendPenalty = isWeekend ? doctor.weekendShifts * 5 : 0
  return baseScore + weekendPenalty
}

export function selectBestDoctor(
  availableDoctors: Doctor[], 
  date: string
): Doctor | null {
  if (availableDoctors.length === 0) return null
  
  const [year, month, day] = date.split('-').map(Number)
  const dateObj = new Date(year, month - 1, day)
  const isWeekendDay = isWeekend(dateObj)
  
  // Sort by workload score and pick the least loaded doctor
  const sorted = availableDoctors.sort((a, b) => {
    const scoreA = getDoctorWorkloadScore(a, isWeekendDay)
    const scoreB = getDoctorWorkloadScore(b, isWeekendDay)
    return scoreA - scoreB
  })
  
  return sorted[0]
}