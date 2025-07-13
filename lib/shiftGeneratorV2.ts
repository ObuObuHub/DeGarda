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

interface GenerationStats {
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

// List of valid departments
export const VALID_DEPARTMENTS = ['ATI', 'Urgențe', 'Laborator', 'Medicină Internă', 'Chirurgie'];

// Validate and normalize department names
export function normalizeDepartment(dept: string | undefined): string | undefined {
  if (!dept || dept.trim() === '') return undefined;
  
  // Map common variations to standard names
  const departmentMap: Record<string, string> = {
    'ati': 'ATI',
    'urgente': 'Urgențe',
    'urgențe': 'Urgențe',
    'urgență': 'Urgențe',
    'laborator': 'Laborator',
    'lab': 'Laborator',
    'medicina interna': 'Medicină Internă',
    'medicină internă': 'Medicină Internă',
    'medicina internă': 'Medicină Internă',
    'interna': 'Medicină Internă',
    'internă': 'Medicină Internă',
    'chirurgie': 'Chirurgie',
    'chir': 'Chirurgie',
    // Role-based mappings - these are NOT departments but might be in specialization field
    'medic': undefined, // Don't assign department based on role
    'doctor': undefined,
    'biolog': undefined,
    'chimist': undefined,
    'asistent': undefined,
  };
  
  const normalized = dept.toLowerCase().trim();
  const mapped = departmentMap[normalized];
  
  // If we have an explicit mapping, use it
  if (mapped !== undefined) {
    return mapped || undefined;
  }
  
  // Check if the original value is already a valid department
  if (VALID_DEPARTMENTS.includes(dept)) {
    return dept;
  }
  
  // Otherwise return undefined - we don't know the department
  console.warn(`Unknown department: "${dept}" - will not be assigned to any department`)
  return undefined;
}

// Generate shifts for a specific department with better error handling
export function generateDepartmentSchedule(
  year: number,
  month: number,
  doctors: Doctor[],
  department: string,
  existingShifts: Record<string, any> = {}
): { shifts: GeneratedShift[], stats: GenerationStats } {
  // Normalize department name
  const normalizedDept = normalizeDepartment(department) || department;
  
  // Filter doctors by department with normalization
  const departmentDoctors = doctors.filter(d => 
    normalizeDepartment(d.department) === normalizedDept
  );
  
  if (departmentDoctors.length === 0) {
    console.warn(`No doctors found for department: ${normalizedDept}`);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const unassignedDates: string[] = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (!existingShifts[dateStr]) {
        unassignedDates.push(dateStr);
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
          [normalizedDept]: {
            shiftsNeeded: daysInMonth,
            shiftsGenerated: 0,
            unassignedDates
          }
        }
      }
    };
  }
  
  // Generate shifts for this department
  const result = generateMonthlyScheduleWithStats(year, month, departmentDoctors, existingShifts);
  
  // Add department to each shift
  const shiftsWithDept = result.shifts.map(shift => ({
    ...shift,
    department: normalizedDept
  }));
  
  return {
    shifts: shiftsWithDept,
    stats: {
      ...result.stats,
      departmentStats: {
        [normalizedDept]: {
          shiftsNeeded: result.stats.totalShiftsNeeded,
          shiftsGenerated: result.stats.totalShiftsGenerated,
          unassignedDates: result.stats.unassignedDates
        }
      }
    }
  };
}

// Generate shifts for all departments with comprehensive stats
export function generateAllDepartmentsSchedule(
  year: number,
  month: number,
  doctors: Doctor[],
  existingShifts: Record<string, any> = {}
): { shifts: GeneratedShift[], stats: GenerationStats } {
  console.log('=== SHIFT GENERATOR DEBUG ===')
  console.log('Year:', year, 'Month:', month)
  console.log('Total doctors received:', doctors.length)
  console.log('Existing shifts:', Object.keys(existingShifts).length)
  
  const allShifts: GeneratedShift[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const overallStats: GenerationStats = {
    totalDays: daysInMonth,
    totalShiftsNeeded: daysInMonth * VALID_DEPARTMENTS.length,
    totalShiftsGenerated: 0,
    unassignedDates: [],
    departmentStats: {}
  };
  
  // Normalize doctor departments before processing
  const normalizedDoctors = doctors.map(d => ({
    ...d,
    department: normalizeDepartment(d.department)
  }));
  
  console.log('Doctors by department after normalization:')
  const deptCount: Record<string, number> = {}
  normalizedDoctors.forEach(d => {
    const dept = d.department || 'UNDEFINED'
    deptCount[dept] = (deptCount[dept] || 0) + 1
  })
  console.log(deptCount);
  
  for (const dept of VALID_DEPARTMENTS) {
    console.log(`\nProcessing department: ${dept}`)
    
    // Filter existing shifts for this department only
    const deptExistingShifts: Record<string, any> = {};
    Object.entries(existingShifts).forEach(([date, shift]) => {
      if (normalizeDepartment(shift.department) === dept) {
        deptExistingShifts[date] = shift;
      } else if (!shift.department && shift.doctorId) {
        // Fallback: check doctor's department only if shift doesn't have department
        const doctor = normalizedDoctors.find(d => d.id === shift.doctorId?.toString());
        if (doctor && doctor.department === dept) {
          deptExistingShifts[date] = shift;
        }
      }
    });
    
    console.log(`Existing shifts for ${dept}:`, Object.keys(deptExistingShifts).length)
    
    const deptResult = generateDepartmentSchedule(year, month, normalizedDoctors, dept, deptExistingShifts);
    console.log(`Generated ${deptResult.shifts.length} shifts for ${dept}`)
    allShifts.push(...deptResult.shifts);
    
    // Merge stats
    overallStats.totalShiftsGenerated += deptResult.stats.totalShiftsGenerated;
    overallStats.departmentStats[dept] = deptResult.stats.departmentStats[dept] || {
      shiftsNeeded: daysInMonth,
      shiftsGenerated: 0,
      unassignedDates: deptResult.stats.unassignedDates
    };
  }
  
  // Calculate overall unassigned dates (dates where ANY department is missing a shift)
  const allUnassignedDates = new Set<string>();
  Object.values(overallStats.departmentStats).forEach(deptStats => {
    deptStats.unassignedDates.forEach(date => allUnassignedDates.add(date));
  });
  overallStats.unassignedDates = Array.from(allUnassignedDates).sort();
  
  return { shifts: allShifts, stats: overallStats };
}

// Enhanced monthly schedule generation with statistics
export function generateMonthlyScheduleWithStats(
  year: number,
  month: number,
  doctors: Doctor[],
  existingShifts: Record<string, any> = {}
): { shifts: GeneratedShift[], stats: GenerationStats } {
  const shifts: GeneratedShift[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const unassignedDates: string[] = [];
  
  // Create arrays for weekdays and weekends
  const weekdays: number[] = [];
  const weekends: number[] = [];
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekends.push(day);
    } else {
      weekdays.push(day);
    }
  }
  
  // Copy doctors array to track assignments
  const doctorStats = doctors.map(d => ({
    ...d,
    assignedShifts: 0,
    assignedWeekends: 0,
    lastShiftDate: d.lastShiftDate || null
  }));
  
  // First pass: Assign all reserved shifts
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Skip if already has a shift
    if (existingShifts[dateStr]) continue;
    
    // Check if any doctor reserved this date
    const reservingDoctor = doctorStats.find(d => d.reservedDates?.includes(dateStr));
    if (reservingDoctor) {
      shifts.push({
        date: dateStr,
        doctorId: reservingDoctor.id,
        doctorName: reservingDoctor.name,
        type: '24h'
      });
      
      reservingDoctor.assignedShifts++;
      reservingDoctor.lastShiftDate = dateStr;
      
      // Track weekend assignments
      const dayOfWeek = new Date(year, month, day).getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        reservingDoctor.assignedWeekends++;
      }
    }
  }
  
  // Helper function to get available doctors for a date
  const getAvailableDoctors = (day: number, isWeekend: boolean) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const yesterday = new Date(year, month, day - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    
    return doctorStats
      .filter(d => {
        // Check unavailable dates
        if (d.unavailableDates.includes(dateStr)) return false;
        
        // Check consecutive days (no back-to-back shifts)
        if (d.lastShiftDate === yesterdayStr) return false;
        
        // Check weekend limit (max 2 per month)
        if (isWeekend && d.assignedWeekends >= 2) return false;
        
        return true;
      })
      .sort((a, b) => {
        // For weekends, prioritize doctors with 0 weekend shifts
        if (isWeekend && a.assignedWeekends !== b.assignedWeekends) {
          return a.assignedWeekends - b.assignedWeekends;
        }
        // Otherwise, prioritize doctors with fewer total shifts
        return a.assignedShifts - b.assignedShifts;
      });
  };
  
  // Assign weekend shifts first (priority)
  for (const day of weekends) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Skip if already has a shift (including reserved shifts)
    if (existingShifts[dateStr] || shifts.find(s => s.date === dateStr)) continue;
    
    const availableDoctors = getAvailableDoctors(day, true);
    
    if (availableDoctors.length > 0) {
      const selectedDoctor = availableDoctors[0];
      
      shifts.push({
        date: dateStr,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        type: '24h'
      });
      
      selectedDoctor.assignedShifts++;
      selectedDoctor.assignedWeekends++;
      selectedDoctor.lastShiftDate = dateStr;
    } else {
      unassignedDates.push(dateStr);
    }
  }
  
  // Assign weekday shifts
  for (const day of weekdays) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Skip if already has a shift (including reserved shifts)
    if (existingShifts[dateStr] || shifts.find(s => s.date === dateStr)) continue;
    
    const availableDoctors = getAvailableDoctors(day, false);
    
    if (availableDoctors.length > 0) {
      const selectedDoctor = availableDoctors[0];
      
      shifts.push({
        date: dateStr,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        type: '24h'
      });
      
      selectedDoctor.assignedShifts++;
      selectedDoctor.lastShiftDate = dateStr;
    } else {
      unassignedDates.push(dateStr);
    }
  }
  
  const stats: GenerationStats = {
    totalDays: daysInMonth,
    totalShiftsNeeded: daysInMonth,
    totalShiftsGenerated: shifts.length,
    unassignedDates: unassignedDates.sort(),
    departmentStats: {}
  };
  
  return { shifts, stats };
}

// Original function for backward compatibility
export function generateMonthlySchedule(
  year: number,
  month: number,
  doctors: Doctor[],
  existingShifts: Record<string, any> = {}
): GeneratedShift[] {
  const result = generateMonthlyScheduleWithStats(year, month, doctors, existingShifts);
  return result.shifts;
}

// Calculate fair distribution metrics
export function calculateFairness(shifts: GeneratedShift[], doctors: Doctor[]) {
  const stats = new Map<string, { total: number, weekends: number }>();
  
  // Initialize stats
  doctors.forEach(d => {
    stats.set(d.id, { total: 0, weekends: 0 });
  });
  
  // Count shifts
  shifts.forEach(shift => {
    const stat = stats.get(shift.doctorId);
    if (stat) {
      stat.total++;
      
      const date = new Date(shift.date);
      if (date.getDay() === 0 || date.getDay() === 6) {
        stat.weekends++;
      }
    }
  });
  
  // Calculate variance
  const totals = Array.from(stats.values()).map(s => s.total);
  const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
  const variance = totals.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / totals.length;
  
  return {
    stats: Object.fromEntries(stats),
    average: avg,
    variance,
    fairnessScore: variance === 0 ? 100 : Math.max(0, 100 - (variance * 10))
  };
}