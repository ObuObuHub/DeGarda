import { NextRequest, NextResponse } from 'next/server'
import { withHospitalAuth } from '@/lib/hospitalMiddleware'
import { sql } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    const { searchParams } = new URL(request.url)
    const staffId = searchParams.get('staffId')
    const month = searchParams.get('month') 
    const year = searchParams.get('year')

    try {
      let query
      let params: (string | number)[] = [authUser.hospitalId]

      if (staffId) {
        // Get reservations for specific staff member
        if (month && year) {
          query = `
            SELECT * FROM shift_reservations 
            WHERE hospital_id = $1 AND staff_id = $2 
            AND EXTRACT(MONTH FROM shift_date) = $3 
            AND EXTRACT(YEAR FROM shift_date) = $4
            ORDER BY shift_date
          `
          params = [authUser.hospitalId, staffId, parseInt(month), parseInt(year)]
        } else {
          query = `
            SELECT * FROM shift_reservations 
            WHERE hospital_id = $1 AND staff_id = $2 
            ORDER BY shift_date
          `
          params = [authUser.hospitalId, staffId]
        }
      } else {
        // Get all reservations for hospital
        if (month && year) {
          query = `
            SELECT sr.*, s.name as staff_name 
            FROM shift_reservations sr
            LEFT JOIN staff s ON sr.staff_id = s.id
            WHERE sr.hospital_id = $1 
            AND EXTRACT(MONTH FROM sr.shift_date) = $2 
            AND EXTRACT(YEAR FROM sr.shift_date) = $3
            ORDER BY sr.shift_date
          `
          params = [authUser.hospitalId, parseInt(month), parseInt(year)]
        } else {
          query = `
            SELECT sr.*, s.name as staff_name 
            FROM shift_reservations sr
            LEFT JOIN staff s ON sr.staff_id = s.id
            WHERE sr.hospital_id = $1 
            ORDER BY sr.shift_date
          `
          params = [authUser.hospitalId]
        }
      }

      const result = await sql.query(query, params)
      
      logger.info('Reservations', 'Retrieved reservations', {
        hospitalId: authUser.hospitalId,
        staffId,
        count: result.rows.length
      })

      return NextResponse.json({
        success: true,
        reservations: result.rows
      })

    } catch (error) {
      logger.error('Reservations', 'Failed to get reservations', error, {
        hospitalId: authUser.hospitalId,
        staffId
      })
      
      return NextResponse.json({
        success: false,
        error: 'Failed to get reservations'
      }, { status: 500 })
    }
  })
}

// Input validation functions
function validateStaffId(staffId: unknown): staffId is string {
  return typeof staffId === 'string' && /^\d+$/.test(staffId) && parseInt(staffId) > 0
}

function validateShiftDate(shiftDate: unknown): shiftDate is string {
  if (typeof shiftDate !== 'string') return false
  const date = new Date(shiftDate)
  return !isNaN(date.getTime()) && date >= new Date()
}

function validateDepartment(department: unknown): department is string {
  const validDepartments = ['ATI', 'Urgențe', 'Laborator', 'Medicină Internă', 'Chirurgie', 'General']
  return typeof department === 'string' && validDepartments.includes(department)
}

export async function POST(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    try {
      const body = await request.json()
      const { staffId, shiftDate, department } = body

      // Comprehensive input validation
      if (!validateStaffId(staffId)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid staff ID format'
        }, { status: 400 })
      }

      if (!validateShiftDate(shiftDate)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid shift date - must be a valid future date'
        }, { status: 400 })
      }

      if (department && !validateDepartment(department)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid department'
        }, { status: 400 })
      }

      // Check if staff belongs to this hospital
      const staffCheck = await sql`
        SELECT id FROM staff 
        WHERE id = ${staffId} AND hospital_id = ${authUser.hospitalId}
      `

      if (staffCheck.rows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Staff member not found in this hospital'
        }, { status: 404 })
      }

      // Check monthly limit (3 reservations per month)
      const monthStart = new Date(shiftDate)
      monthStart.setDate(1)
      const monthEnd = new Date(monthStart)
      monthEnd.setMonth(monthEnd.getMonth() + 1)

      const monthlyCount = await sql`
        SELECT COUNT(*) as count FROM shift_reservations
        WHERE staff_id = ${staffId} 
        AND hospital_id = ${authUser.hospitalId}
        AND shift_date >= ${monthStart.toISOString()}
        AND shift_date < ${monthEnd.toISOString()}
      `

      if (parseInt(monthlyCount.rows[0].count) >= 3) {
        return NextResponse.json({
          success: false,
          error: 'Monthly reservation limit reached (3 per month)'
        }, { status: 400 })
      }

      // Check if date is already reserved by this staff
      const existingReservation = await sql`
        SELECT id FROM shift_reservations
        WHERE staff_id = ${staffId} 
        AND hospital_id = ${authUser.hospitalId}
        AND shift_date = ${shiftDate}
      `

      if (existingReservation.rows.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'Date already reserved'
        }, { status: 400 })
      }

      // Check if shift is already assigned
      const assignedShift = await sql`
        SELECT id FROM shifts
        WHERE hospital_id = ${authUser.hospitalId}
        AND shift_date = ${shiftDate}
        AND doctor_id IS NOT NULL
      `

      if (assignedShift.rows.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'Shift already assigned to another doctor'
        }, { status: 400 })
      }

      // Create reservation
      const result = await sql`
        INSERT INTO shift_reservations (staff_id, hospital_id, shift_date, department, created_at)
        VALUES (${staffId}, ${authUser.hospitalId}, ${shiftDate}, ${department || 'General'}, NOW())
        RETURNING *
      `

      logger.info('Reservations', 'Reservation created', {
        hospitalId: authUser.hospitalId,
        staffId,
        shiftDate,
        reservationId: result.rows[0].id
      })

      return NextResponse.json({
        success: true,
        reservation: result.rows[0]
      })

    } catch (error) {
      logger.error('Reservations', 'Failed to create reservation', error, {
        hospitalId: authUser.hospitalId
      })
      
      return NextResponse.json({
        success: false,
        error: 'Failed to create reservation'
      }, { status: 500 })
    }
  })
}

export async function DELETE(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    const { searchParams } = new URL(request.url)
    const reservationId = searchParams.get('id')
    const staffId = searchParams.get('staffId')
    const shiftDate = searchParams.get('shiftDate')

    try {
      let result

      if (reservationId) {
        // Delete by reservation ID
        result = await sql`
          DELETE FROM shift_reservations
          WHERE id = ${reservationId} 
          AND hospital_id = ${authUser.hospitalId}
          RETURNING *
        `
      } else if (staffId && shiftDate) {
        // Delete by staff and date
        result = await sql`
          DELETE FROM shift_reservations
          WHERE staff_id = ${staffId} 
          AND hospital_id = ${authUser.hospitalId}
          AND shift_date = ${shiftDate}
          RETURNING *
        `
      } else {
        return NextResponse.json({
          success: false,
          error: 'Missing required parameters'
        }, { status: 400 })
      }

      if (result.rows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Reservation not found'
        }, { status: 404 })
      }

      logger.info('Reservations', 'Reservation deleted', {
        hospitalId: authUser.hospitalId,
        reservationId: result.rows[0].id,
        staffId: result.rows[0].staff_id
      })

      return NextResponse.json({
        success: true,
        message: 'Reservation deleted successfully'
      })

    } catch (error) {
      logger.error('Reservations', 'Failed to delete reservation', error, {
        hospitalId: authUser.hospitalId,
        reservationId,
        staffId,
        shiftDate
      })
      
      return NextResponse.json({
        success: false,
        error: 'Failed to delete reservation'
      }, { status: 500 })
    }
  })
}