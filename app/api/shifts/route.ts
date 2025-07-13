import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { notifyShiftAssignment } from '@/lib/notifications'
import { logActivity } from '@/lib/activity-logger'

// GET shifts for a specific month/year and hospital
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const hospitalId = searchParams.get('hospitalId')

    if (!year || !month) {
      return NextResponse.json(
        { success: false, error: 'Year and month are required' },
        { status: 400 }
      )
    }

    // Calculate date range for the month
    const startDate = `${year}-${String(parseInt(month) + 1).padStart(2, '0')}-01`
    const endDate = `${year}-${String(parseInt(month) + 1).padStart(2, '0')}-31`

    // Get shifts with staff info and reservations
    // Use indexed queries for better performance
    const shifts = hospitalId
      ? await sql`
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
            AND s.hospital_id = ${hospitalId}
          ORDER BY s.date
          LIMIT 500
        `
      : await sql`
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
          ORDER BY s.date
          LIMIT 500
        `

    // Convert to format expected by calendar
    const shiftMap: Record<string, any> = {}
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
  } catch (error: any) {
    console.error('Get shifts error:', error)
    
    // Check for database connection errors
    if (error.message?.includes('Cannot convert argument to a ByteString')) {
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
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST to create or update a shift
export async function POST(request: NextRequest) {
  try {
    const { date, staffId, hospitalId, type = '24h', department } = await request.json()

    if (!date || !hospitalId) {
      return NextResponse.json(
        { success: false, error: 'Date and hospitalId are required' },
        { status: 400 }
      )
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
          AND id != COALESCE(
            (SELECT id FROM shifts WHERE date = ${date} AND type = ${type} AND hospital_id = ${hospitalId}),
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
          VALUES (${date}, ${type}, ${startTime}, ${endTime}, ${staffId}, ${hospitalId}, ${shiftDepartment}, 'assigned')
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
            VALUES (${date}, ${type}, ${startTime}, ${endTime}, ${staffId}, ${hospitalId}, 'assigned')
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
        result = await sql`
          INSERT INTO shifts (date, type, start_time, end_time, hospital_id, department, status)
          VALUES (${date}, ${type}, ${startTime}, ${endTime}, ${hospitalId}, ${department}, 'open')
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
            VALUES (${date}, ${type}, ${startTime}, ${endTime}, ${hospitalId}, 'open')
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
    console.error('Create/update shift error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to save shift',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE to remove a shift assignment
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shiftId = searchParams.get('id')

    if (!shiftId) {
      return NextResponse.json(
        { success: false, error: 'Shift ID is required' },
        { status: 400 }
      )
    }

    // Make shift open instead of deleting
    await sql`
      UPDATE shifts 
      SET staff_id = NULL, status = 'open'
      WHERE id = ${shiftId}
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete shift error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to remove shift assignment',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}