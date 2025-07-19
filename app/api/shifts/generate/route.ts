import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { withHospitalAuth } from '@/lib/hospitalMiddleware'
import { canGenerateShiftsForDepartment } from "@/lib/rbac"
import { logger } from '@/lib/logger'

// POST to generate/save multiple shifts at once
export async function POST(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    try {
      const { shifts, hospitalId, department } = await request.json()

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
      } catch (error: any) {
        if (error.message?.includes('column "department" of relation "shifts" does not exist')) {
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
          console.error(`Failed to insert shift for ${date}:`, error.message)
          conflicts.push({
            date,
            doctorName,
            message: `Eroare la salvare: ${error.message}`
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
    } catch (error: any) {
      logger.error('ShiftGenerationAPI', 'Failed to generate shifts', { error, userId: authUser.userId })
      
      // Check for database connection errors
      if (error.message?.includes('Cannot convert argument to a ByteString')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Database connection error. Please check your database configuration.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to generate shifts',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      )
    }
  })
}