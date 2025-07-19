import { Doctor, GeneratedShift } from './types'
import { isWeekend } from './dateUtils'

export interface DoctorShiftStats {
  total: number
  weekends: number
  consecutive: number
  lastShiftDate?: string
}

export interface FairnessMetrics {
  doctorStats: Map<string, DoctorShiftStats>
  average: number
  variance: number
  fairnessScore: number
  recommendations: string[]
}

export function calculateFairness(
  shifts: GeneratedShift[],
  doctors: Doctor[]
): FairnessMetrics {
  const doctorStats = new Map<string, DoctorShiftStats>()
  
  // Initialize stats
  for (const doctor of doctors) {
    doctorStats.set(doctor.id, { 
      total: 0, 
      weekends: 0, 
      consecutive: 0 
    })
  }
  
  // Sort shifts by date for consecutive calculation
  const sortedShifts = [...shifts].sort((a, b) => a.date.localeCompare(b.date))
  
  // Count shifts and analyze patterns
  for (let i = 0; i < sortedShifts.length; i++) {
    const shift = sortedShifts[i]
    const stat = doctorStats.get(shift.doctorId)
    
    if (stat) {
      stat.total++
      stat.lastShiftDate = shift.date
      
      // Check if weekend
      const [year, month, day] = shift.date.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      if (isWeekend(date)) {
        stat.weekends++
      }
      
      // Check consecutive shifts
      if (i > 0) {
        const prevShift = sortedShifts[i - 1]
        if (prevShift.doctorId === shift.doctorId) {
          const prevDate = new Date(prevShift.date)
          const currDate = new Date(shift.date)
          const dayDiff = Math.abs(currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
          
          if (dayDiff === 1) {
            stat.consecutive++
          }
        }
      }
    }
  }
  
  // Calculate fairness metrics
  const totals = Array.from(doctorStats.values()).map(s => s.total)
  const average = totals.reduce((a, b) => a + b, 0) / totals.length || 0
  const variance = totals.reduce(
    (sum, val) => sum + Math.pow(val - average, 2), 
    0
  ) / totals.length || 0
  
  const fairnessScore = variance === 0 ? 100 : Math.max(0, 100 - (variance * 10))
  
  // Generate recommendations
  const recommendations = generateFairnessRecommendations(doctorStats, average)
  
  return {
    doctorStats,
    average,
    variance,
    fairnessScore,
    recommendations
  }
}

function generateFairnessRecommendations(
  doctorStats: Map<string, DoctorShiftStats>,
  average: number
): string[] {
  const recommendations: string[] = []
  
  const overworkedDoctors: string[] = []
  const underworkedDoctors: string[] = []
  
  for (const [doctorId, stats] of doctorStats.entries()) {
    if (stats.total > average * 1.2) {
      overworkedDoctors.push(doctorId)
    } else if (stats.total < average * 0.8) {
      underworkedDoctors.push(doctorId)
    }
    
    if (stats.consecutive > 2) {
      recommendations.push(`Doctor ${doctorId} has ${stats.consecutive} consecutive shifts - consider redistributing`)
    }
    
    if (stats.weekends > average * 0.4) {
      recommendations.push(`Doctor ${doctorId} has excessive weekend shifts (${stats.weekends})`)
    }
  }
  
  if (overworkedDoctors.length > 0) {
    recommendations.push(`Overworked doctors: ${overworkedDoctors.join(', ')} - redistribute their shifts`)
  }
  
  if (underworkedDoctors.length > 0) {
    recommendations.push(`Underutilized doctors: ${underworkedDoctors.join(', ')} - assign more shifts`)
  }
  
  return recommendations
}

export function getWorkloadBalance(
  doctorStats: Map<string, DoctorShiftStats>
): 'excellent' | 'good' | 'fair' | 'poor' {
  const totals = Array.from(doctorStats.values()).map(s => s.total)
  const max = Math.max(...totals)
  const min = Math.min(...totals)
  const difference = max - min
  
  if (difference <= 1) return 'excellent'
  if (difference <= 2) return 'good'
  if (difference <= 3) return 'fair'
  return 'poor'
}