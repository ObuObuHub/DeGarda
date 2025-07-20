import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { withHospitalAuth } from '@/lib/hospitalMiddleware'
import { canGenerateShiftsForDepartment } from "@/lib/rbac"
import { logger } from '@/lib/logger'
import { getErrorMessage, isDatabaseError } from '@/lib/types/errors'
import { generateMonthlyScheduleOptimized } from '@/lib/shiftGeneratorOptimized'
import type { Doctor } from '@/lib/shift-generation'

// POST to generate/save multiple shifts at once
export async function POST(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    try {
      const body = await request.json()
      
      // Handle both generation parameters and pre-generated shifts
      if (body.month !== undefined && body.year !== undefined) {
        // New generation flow
        return handleGenerateShifts(authUser, body)
      } else if (body.shifts && Array.isArray(body.shifts)) {
        // Legacy flow for pre-generated shifts
        return handleSaveShifts(authUser, body)
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid request format. Provide either generation parameters (month, year, department) or shifts array.' },
          { status: 400 }
        )
      }
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error)
      logger.error('ShiftGenerationAPI', 'Failed to process request', { error: errorMessage, userId: authUser.userId })
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to process shift generation request',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        },
        { status: 500 }
      )
    }
  })
}

// Handle automatic shift generation
async function handleGenerateShifts(authUser: any, params: any) {
  try {
    const { hospitalId, month, year, department } = params
    
    if (!hospitalId || month === undefined || year === undefined || !department) {
      return NextResponse.json(
        { success: false, error: 'hospitalId, month, year, and department are required' },
        { status: 400 }
      )
    }

    // Check permissions
    if (!canGenerateShiftsForDepartment(authUser, department, hospitalId)) {
      logger.warn('ShiftGenerationAPI', 'Department access denied', {
        userId: authUser.userId,
        userRole: authUser.role,
        userDepartment: authUser.specialization,
        requestedDepartment: department,
        hospitalId
      })
      return NextResponse.json(
        { error: 'You can only generate shifts for your own department' },
        { status: 403 }
      )
    }

    // Fetch staff for the department
    const staffData = await sql`
      SELECT id, name, email, specialization as department, hospital_id
      FROM staff
      WHERE hospital_id = ${hospitalId}
        AND specialization = ${department}
        AND role = 'staff'
        AND is_active = true
    `

    // Fetch existing shifts for the month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`
    
    const existingShifts = await sql`
      SELECT date, staff_id, type, department
      FROM shifts
      WHERE hospital_id = ${hospitalId}
        AND department = ${department}
        AND date >= ${startDate}
        AND date <= ${endDate}
    `

    // Fetch reservations for the month
    const reservations = await sql`
      SELECT staff_id, shift_date, department
      FROM reservations
      WHERE hospital_id = ${hospitalId}
        AND department = ${department}
        AND EXTRACT(YEAR FROM shift_date) = ${year}
        AND EXTRACT(MONTH FROM shift_date) = ${month}
        AND status = 'active'
    `

    // Convert to shift generator format
    const doctors: Doctor[] = staffData.map(staff => {
      // Get reserved dates for this doctor
      const doctorReservations = reservations
        .filter(r => r.staff_id === staff.id)
        .map(r => r.shift_date.toISOString().split('T')[0])
      
      // Get existing shift dates for this doctor
      const doctorShifts = existingShifts
        .filter(s => s.staff_id === staff.id)
        .map(s => s.date.toISOString().split('T')[0])
      
      return {
        id: staff.id.toString(),
        name: staff.name,
        department: staff.department,
        hospitalId: staff.hospital_id,
        unavailableDates: [], // Could be populated from a separate unavailability table
        reservedDates: doctorReservations,
        shiftsThisMonth: doctorShifts.length,
        weekendShifts: 0, // Would need to calculate
        lastShiftDate: doctorShifts.sort().pop() || null
      }
    })

    // Convert existing shifts to the expected format
    const existingShiftsMap: Record<string, any> = {}
    existingShifts.forEach(shift => {
      const dateStr = shift.date.toISOString().split('T')[0]
      existingShiftsMap[dateStr] = shift
    })

    // Generate shifts using the optimized generator
    const { shifts: generatedShifts, stats } = generateMonthlyScheduleOptimized(
      year,
      month - 1, // JavaScript months are 0-indexed
      doctors,
      existingShiftsMap,
      { shiftType: '24h', prioritizeWeekends: true }
    )

    // Save generated shifts to database
    const results = []
    const conflicts = []
    
    for (const shift of generatedShifts) {
      try {
        const result = await sql`
          INSERT INTO shifts (date, type, start_time, end_time, staff_id, hospital_id, department, status)
          VALUES (
            ${shift.date}, 
            ${shift.type}, 
            '08:00', 
            '08:00', 
            ${shift.doctorId}, 
            ${hospitalId}, 
            ${department}, 
            'assigned'
          )
          ON CONFLICT (date, type, hospital_id, department) 
          DO UPDATE SET 
            staff_id = EXCLUDED.staff_id,
            status = EXCLUDED.status
          RETURNING *
        `
        results.push(result[0])
        
        // Update reservation status if this was a reserved shift
        await sql`
          UPDATE reservations
          SET status = 'fulfilled'
          WHERE staff_id = ${shift.doctorId}
            AND shift_date = ${shift.date}
            AND hospital_id = ${hospitalId}
            AND department = ${department}
        `
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error)
        if (errorMessage.includes('column "department" of relation "shifts" does not exist')) {
          // Fallback for old schema
          try {
            const result = await sql`
              INSERT INTO shifts (date, type, start_time, end_time, staff_id, hospital_id, status)
              VALUES (${shift.date}, ${shift.type}, '08:00', '08:00', ${shift.doctorId}, ${hospitalId}, 'assigned')
              ON CONFLICT (date, type, hospital_id) 
              DO UPDATE SET 
                staff_id = EXCLUDED.staff_id,
                status = EXCLUDED.status
              RETURNING *
            `
            results.push(result[0])
          } catch (fallbackError) {
            conflicts.push({
              date: shift.date,
              doctorName: shift.doctorName,
              message: `Failed to save shift: ${getErrorMessage(fallbackError)}`
            })
          }
        } else {
          conflicts.push({
            date: shift.date,
            doctorName: shift.doctorName,
            message: `Failed to save shift: ${errorMessage}`
          })
        }
      }
    }

    logger.shiftGeneration('ShiftGenerationAPI', stats, { 
      hospitalId, 
      department,
      month,
      year,
      savedShifts: results.length,
      conflicts: conflicts.length
    })

    return NextResponse.json({ 
      success: true, 
      message: `Generated ${results.length} shifts for ${department} in ${month}/${year}. ${stats.unassignedDates.length} days could not be assigned.`,
      shifts: results,
      conflicts,
      stats
    })
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error)
    logger.error('ShiftGenerationAPI', 'Failed to generate shifts', { error: errorMessage })
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate shifts',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}

// Handle saving pre-generated shifts (legacy)
async function handleSaveShifts(authUser: any, body: any) {
  const { shifts, hospitalId, department } = body

  if (!shifts || !Array.isArray(shifts) || !hospitalId || !department) {
    return NextResponse.json(
      { success: false, error: 'Shifts array, hospitalId, and department are required' },
      { status: 400 }
    )
  }

  // Check if user has permission to generate shifts for this department
  if (!canGenerateShiftsForDepartment(authUser, department, hospitalId)) {
    logger.warn('ShiftGenerationAPI', 'Department access denied', {
      userId: authUser.userId,
      userRole: authUser.role,
      userDepartment: authUser.specialization,
      requestedDepartment: department,
      hospitalId
    })
    return NextResponse.json(
      { error: 'You can only generate shifts for your own department' },
      { status: 403 }
    )
  }

  try {
    // Start transaction
    const results = []
    const conflicts = []
    
    for (const shift of shifts) {
      const { date, doctorId, doctorName, type = '24h', department } = shift
      
      // STRICT: Validate department is provided
      if (!department) {
        return NextResponse.json(
          { success: false, error: 'Department is required for each shift' },
          { status: 400 }
        )
      }
      
      // Get doctor's department to validate match
      const doctorData = await sql`
        SELECT specialization FROM staff WHERE id = ${doctorId}
      `
      const doctorDepartment = doctorData[0]?.specialization
      
      // STRICT: Validate doctor's department matches shift department
      if (doctorDepartment && doctorDepartment !== department) {
        conflicts.push({
          date,
          doctorName,
          message: `${doctorName} (${doctorDepartment}) nu poate fi asignat la o gardă din departamentul ${department}`
        })
        continue
      }
      
      // Check for conflicts - doctor already has a shift on this date
      const existingShifts = await sql`
        SELECT * FROM shifts 
        WHERE staff_id = ${doctorId} 
          AND date = ${date}
      `
      
      if (existingShifts.length > 0) {
        conflicts.push({
          date,
          doctorName,
          message: `${doctorName} are deja o gardă pe ${date}`
        })
        continue
      }
      
      // Set shift times based on type
      let startTime = '08:00'
      let endTime = '08:00'
      if (type === 'day') {
        startTime = '08:00'
        endTime = '20:00'
      } else if (type === 'night') {
        startTime = '20:00'
        endTime = '08:00'
      }

      // Try with department first, fallback to without if column doesn't exist
      let result
      try {
        result = await sql`
          INSERT INTO shifts (date, type, start_time, end_time, staff_id, hospital_id, department, status)
          VALUES (${date}, ${type}, ${startTime}, ${endTime}, ${doctorId}, ${hospitalId}, ${department}, 'assigned')
          ON CONFLICT (date, type, hospital_id, department) 
          DO UPDATE SET 
            staff_id = EXCLUDED.staff_id,
            status = EXCLUDED.status
          RETURNING *
        `
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error)
        if (errorMessage.includes('column "department" of relation "shifts" does not exist')) {
          // Fallback to old schema without department
          result = await sql`
            INSERT INTO shifts (date, type, start_time, end_time, staff_id, hospital_id, status)
            VALUES (${date}, ${type}, ${startTime}, ${endTime}, ${doctorId}, ${hospitalId}, 'assigned')
            ON CONFLICT (date, type, hospital_id) 
            DO UPDATE SET 
              staff_id = EXCLUDED.staff_id,
              status = EXCLUDED.status
            RETURNING *
          `
        } else {
          logger.error('ShiftGenerationAPI', `Failed to insert shift for ${date}`, { error: errorMessage })
          conflicts.push({
            date,
            doctorName,
            message: `Eroare la salvare: ${errorMessage}`
          })
          continue
        }
      }
      results.push(result[0])
    }

    return NextResponse.json({ 
      success: true, 
      message: conflicts.length > 0 
        ? `Generat ${results.length} gărzi. ${conflicts.length} conflicte găsite.`
        : `Generat ${results.length} gărzi`,
      shifts: results,
      conflicts
    })
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error)
    logger.error('ShiftGenerationAPI', 'Failed to save shifts', { error: errorMessage, userId: authUser.userId })
    
    // Check for database connection errors
    if (errorMessage.includes('Cannot convert argument to a ByteString')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database connection error. Please check your database configuration.',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to save shifts',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}