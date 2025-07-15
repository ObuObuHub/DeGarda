// Temporary utility to assign departments to doctors based on their names or other criteria
// This is a workaround until proper department data is available

import { VALID_DEPARTMENTS } from './shiftGenerator'
import { logger } from './logger'

interface DoctorInput {
  id: string
  name: string
  department?: string
  specialization?: string
  [key: string]: any
}

export function assignDepartmentsToDoctors(doctors: DoctorInput[]): DoctorInput[] {
  // If we don't have enough doctors with departments, distribute them evenly
  const doctorsWithDept = doctors.filter(d => d.department && VALID_DEPARTMENTS.includes(d.department))
  const doctorsWithoutDept = doctors.filter(d => !d.department || !VALID_DEPARTMENTS.includes(d.department))
  
  logger.debug('DepartmentAssignment', 'Doctor department analysis', {
    withValidDept: doctorsWithDept.length,
    withoutValidDept: doctorsWithoutDept.length
  })
  
  if (doctorsWithoutDept.length === 0) {
    return doctors // All doctors have departments
  }
  
  // Distribute doctors without departments evenly across all departments
  const assignedDoctors = [...doctorsWithDept]
  let deptIndex = 0
  
  for (const doctor of doctorsWithoutDept) {
    // Try to infer department from name or specialization
    let inferredDept: string | undefined
    
    const nameAndSpec = `${doctor.name} ${doctor.specialization || ''}`.toLowerCase()
    
    if (nameAndSpec.includes('ati')) {
      inferredDept = 'ATI'
    } else if (nameAndSpec.includes('urgențe') || nameAndSpec.includes('urgente')) {
      inferredDept = 'Urgențe'
    } else if (nameAndSpec.includes('laborator') || nameAndSpec.includes('lab')) {
      inferredDept = 'Laborator'
    } else if (nameAndSpec.includes('chirurgie') || nameAndSpec.includes('chir')) {
      inferredDept = 'Chirurgie'
    } else if (nameAndSpec.includes('internă') || nameAndSpec.includes('interna')) {
      inferredDept = 'Medicină Internă'
    }
    
    // If we couldn't infer, assign to department with fewest doctors
    if (!inferredDept) {
      // Count doctors per department
      const deptCounts: Record<string, number> = {}
      VALID_DEPARTMENTS.forEach(dept => {
        deptCounts[dept] = assignedDoctors.filter(d => d.department === dept).length
      })
      
      // Find department with fewest doctors
      inferredDept = VALID_DEPARTMENTS.reduce((minDept, dept) => 
        deptCounts[dept] < deptCounts[minDept] ? dept : minDept
      , VALID_DEPARTMENTS[0])
    }
    
    assignedDoctors.push({
      ...doctor,
      department: inferredDept
    })
    
    logger.debug('DepartmentAssignment', 'Doctor assigned to department', {
      doctor: doctor.name,
      department: inferredDept
    })
  }
  
  return assignedDoctors
}