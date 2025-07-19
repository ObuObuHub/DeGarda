import { ShiftType } from '@/types'

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

export const VALID_DEPARTMENTS = ['ATI', 'Urgențe', 'Laborator', 'Medicină Internă', 'Chirurgie'] as const
export type ValidDepartment = typeof VALID_DEPARTMENTS[number]