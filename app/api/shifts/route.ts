import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { notifyShiftAssignment } from '@/lib/notifications'
import { logActivity } from '@/lib/activity-logger'
import { logger } from '@/lib/logger'
import { withHospitalAuth } from '@/lib/hospitalMiddleware'

// Input validation functions
function validateYear(year: unknown): year is string {
  const yearNum = parseInt(year as string)
  return typeof year === 'string' && !isNaN(yearNum) && yearNum >= 2020 && yearNum <= 2030
}

function validateMonth(month: unknown): month is string {
  const monthNum = parseInt(month as string)
  return typeof month === 'string' && !isNaN(monthNum) && monthNum >= 0 && monthNum <= 11
}

function validateHospitalId(hospitalId: unknown): hospitalId is string {
  return typeof hospitalId === 'string' && /^\d+$/.test(hospitalId) && parseInt(hospitalId) > 0
}

function validateDate(date: unknown): date is string {
  if (typeof date !== 'string') return false
  const dateObj = new Date(date)
  return !isNaN(dateObj.getTime()) && date.match(/^\d{4}-\d{2}-\d{2}$/)
}

function validateStaffId(staffId: unknown): staffId is string {
  return typeof staffId === 'string' && /^\d+$/.test(staffId) && parseInt(staffId) > 0
}

function validateShiftType(type: unknown): type is string {
  return typeof type === 'string' && ['24h', 'day', 'night'].includes(type)
}

function validateDepartment(department: unknown): department is string {
  const validDepartments = ['ATI', 'Urgențe', 'Laborator', 'Medicină Internă', 'Chirurgie', 'General']
  return typeof department === 'string' && validDepartments.includes(department)
}

// GET shifts for a specific month/year and hospital
export async function GET(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    try {
      const { searchParams } = new URL(request.url)
      const year = searchParams.get('year')
      const month = searchParams.get('month')
      const hospitalId = searchParams.get('hospitalId')

      if (!validateYear(year) || !validateMonth(month)) {
        return NextResponse.json(
          { success: false, error: 'Valid year and month are required' },
          { status: 400 }
        )
      }

      // Enforce hospital isolation - user can only access their own hospital data
      const userHospitalId = authUser.hospitalId.toString()
      if (hospitalId && hospitalId !== userHospitalId) {
        return NextResponse.json(
          { success: false, error: 'Access denied - hospital isolation violation' },
          { status: 403 }
        )
      }

      // Use authenticated user's hospital ID if none provided
      const targetHospitalId = hospitalId || userHospitalId

      if (!validateHospitalId(targetHospitalId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid hospital ID format' },
          { status: 400 }
        )
      }

    // Calculate date range for the month
    // Frontend sends 0-indexed months (0-11), but SQL needs 1-indexed (1-12)
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    const sqlMonth = monthNum + 1;
    
    const startDate = `${year}-${String(sqlMonth).padStart(2, '0')}-01`
    
    // Calculate proper last day of month
    const lastDayDate = new Date(yearNum, monthNum + 1, 0);
    const lastDay = lastDayDate.getDate();
    const endDate = `${year}-${String(sqlMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

      // Get shifts with staff info and reservations
      // Always filter by hospital_id for security
      const shifts = await sql`
        SELECT 
          s.id,
          s.date,
          s.type,
          s.staff_id,
          s.hospital_id,
          s.status,
          s.department,
          st.name as staff_name,
          st.specialization as staff_department,
          sr.staff_id as reserved_by,
          rst.name as reserved_by_name
        FROM shifts s
        LEFT JOIN staff st ON s.staff_id = st.id
        LEFT JOIN shift_reservations sr ON s.id = sr.shift_id
        LEFT JOIN staff rst ON sr.staff_id = rst.id
        WHERE s.date >= ${startDate} 
          AND s.date <= ${endDate}
          AND s.hospital_id = ${targetHospitalId}
        ORDER BY s.date
        LIMIT 500
      `

    // Convert to format expected by calendar
    const shiftMap: Record<string, {
      id: string
      doctorId: string | null
      doctorName: string | null
      department: string | null
      type: string
      status: string
      hospitalId: string
      reservedBy: string | null
      reservedByName: string | null
    }> = {}
    shifts.forEach(shift => {
      const dateStr = new Date(shift.date).toISOString().split('T')[0]
      shiftMap[dateStr] = {
        id: shift.id.toString(),
        doctorId: shift.staff_id?.toString() || null,
        doctorName: shift.staff_name || null,
        department: shift.department || shift.staff_department || null,
        type: shift.type,
        status: shift.status,
        hospitalId: shift.hospital_id.toString(),
        reservedBy: shift.reserved_by?.toString() || null,
        reservedByName: shift.reserved_by_name || null
      }
    })

      return NextResponse.json({ success: true, shifts: shiftMap })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Shifts', 'Get shifts error', error)
      
      // Check for database connection errors
      if (errorMessage.includes('Cannot convert argument to a ByteString')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Database connection error. Please check your database configuration.' 
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch shifts',
          details: errorMessage
        },
        { status: 500 }
      )
    }
  })
}

// POST to create or update a shift
export async function POST(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    try {
      const { date, staffId, hospitalId, type = '24h', department } = await request.json()

      if (!date) {
        return NextResponse.json(
          { success: false, error: 'Date is required' },
          { status: 400 }
        )
      }

      // Enforce hospital isolation - user can only create shifts for their own hospital
      const userHospitalId = authUser.hospitalId.toString()
      if (hospitalId && hospitalId !== userHospitalId) {
        return NextResponse.json(
          { success: false, error: 'Access denied - hospital isolation violation' },
          { status: 403 }
        )
      }

      // Use authenticated user's hospital ID
      const targetHospitalId = hospitalId || userHospitalId

      // Verify staff belongs to the same hospital if provided
      if (staffId) {
        const staffCheck = await sql`
          SELECT hospital_id FROM staff WHERE id = ${staffId}
        `
        if (staffCheck.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Staff member not found' },
            { status: 400 }
          )
        }
        if (staffCheck[0].hospital_id.toString() !== targetHospitalId) {
          return NextResponse.json(
            { success: false, error: 'Staff member does not belong to your hospital' },
            { status: 403 }
          )
        }
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

    // Insert or update shift
    if (staffId) {
      // Check if staff already has a shift on this date
      const existingShifts = await sql`
        SELECT * FROM shifts 
        WHERE staff_id = ${staffId} 
          AND date = ${date}
          AND hospital_id = ${targetHospitalId}
          AND id != COALESCE(
            (SELECT id FROM shifts WHERE date = ${date} AND type = ${type} AND hospital_id = ${targetHospitalId}),
            0
          )
      `
      
      if (existingShifts.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Doctorul are deja o gardă în această zi' },
          { status: 400 }
        )
      }
      
      // Get staff department if not provided
      let shiftDepartment = department
      if (!shiftDepartment && staffId) {
        const staffData = await sql`
          SELECT specialization FROM staff WHERE id = ${staffId}
        `
        shiftDepartment = staffData[0]?.specialization
      }
      
      // STRICT: Validate department match if both are provided
      if (staffId && shiftDepartment && department && shiftDepartment !== department) {
        return NextResponse.json(
          { success: false, error: `Personal din departamentul ${shiftDepartment} nu poate fi asignat la o gardă din departamentul ${department}` },
          { status: 400 }
        )
      }
      
      // Try with department first, fallback to without if column doesn't exist
      let result
      try {
        result = await sql`
          INSERT INTO shifts (date, type, start_time, end_time, staff_id, hospital_id, department, status)
          VALUES (${date}, ${type}, ${startTime}, ${endTime}, ${staffId}, ${targetHospitalId}, ${shiftDepartment}, 'assigned')
          ON CONFLICT (date, type, hospital_id, department) 
          DO UPDATE SET 
            staff_id = ${staffId},
            status = 'assigned'
          RETURNING *
        `
      } catch (error: any) {
        if (error.message?.includes('column "department" of relation "shifts" does not exist')) {
          // Fallback to old schema without department
          result = await sql`
            INSERT INTO shifts (date, type, start_time, end_time, staff_id, hospital_id, status)
            VALUES (${date}, ${type}, ${startTime}, ${endTime}, ${staffId}, ${targetHospitalId}, 'assigned')
            ON CONFLICT (date, type, hospital_id) 
            DO UPDATE SET 
              staff_id = ${staffId},
              status = 'assigned'
            RETURNING *
          `
        } else {
          console.error('Shift insert error:', error)
          throw error
        }
      }
      
      // Create notification for the assigned staff
      await notifyShiftAssignment(staffId, date, 'Hospital')
      
      // Log activity (TODO: get current user ID from auth context)
      await logActivity(
        parseInt(staffId), 
        'shift_assigned', 
        `a fost asignat(ă) la garda din ${date}`
      )
      
      return NextResponse.json({ success: true, shift: result[0] })
    } else {
      // Remove assignment (make shift open)
      let result
      try {
        // When creating open shift, department must be provided
        if (!department) {
          return NextResponse.json(
            { success: false, error: 'Department is required when creating an open shift' },
            { status: 400 }
          )
        }
        
        result = await sql`
          INSERT INTO shifts (date, type, start_time, end_time, hospital_id, department, status)
          VALUES (${date}, ${type}, ${startTime}, ${endTime}, ${targetHospitalId}, ${department}, 'open')
          ON CONFLICT (date, type, hospital_id, department) 
          DO UPDATE SET 
            staff_id = NULL,
            status = 'open'
          RETURNING *
        `
      } catch (error: any) {
        if (error.message?.includes('column "department" of relation "shifts" does not exist')) {
          // Fallback to old schema without department
          result = await sql`
            INSERT INTO shifts (date, type, start_time, end_time, hospital_id, status)
            VALUES (${date}, ${type}, ${startTime}, ${endTime}, ${targetHospitalId}, 'open')
            ON CONFLICT (date, type, hospital_id) 
            DO UPDATE SET 
              staff_id = NULL,
              status = 'open'
            RETURNING *
          `
        } else {
          throw error
        }
      }
      return NextResponse.json({ success: true, shift: result[0] })
    }
    } catch (error: any) {
      logger.error('Shifts', 'Create/update shift error', error)
      
      // Provide more specific error messages
      let errorMessage = 'Failed to save shift'
      if (error.code === '23505') {
        errorMessage = 'A shift already exists for this date, type, and department'
      } else if (error.code === '23503') {
        errorMessage = 'Invalid staff or hospital reference'
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage,
          details: error.message || 'Unknown error',
          code: error.code
        },
        { status: 500 }
      )
    }
  })
}

// DELETE to remove a shift assignment
export async function DELETE(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    try {
      const { searchParams } = new URL(request.url)
      const shiftId = searchParams.get('id')

      if (!shiftId) {
        return NextResponse.json(
          { success: false, error: 'Shift ID is required' },
          { status: 400 }
        )
      }

      // Verify shift belongs to user's hospital before deletion
      const shiftCheck = await sql`
        SELECT hospital_id FROM shifts WHERE id = ${shiftId}
      `
      
      if (shiftCheck.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Shift not found' },
          { status: 404 }
        )
      }

      if (shiftCheck[0].hospital_id !== authUser.hospitalId) {
        return NextResponse.json(
          { success: false, error: 'Access denied - hospital isolation violation' },
          { status: 403 }
        )
      }

      // Make shift open instead of deleting
      await sql`
        UPDATE shifts 
        SET staff_id = NULL, status = 'open'
        WHERE id = ${shiftId}
          AND hospital_id = ${authUser.hospitalId}
      `

      return NextResponse.json({ success: true })
    } catch (error: any) {
      logger.error('Shifts', 'Delete shift error', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to remove shift assignment',
          details: error.message || 'Unknown error'
        },
        { status: 500 }
      )
    }
  })
}