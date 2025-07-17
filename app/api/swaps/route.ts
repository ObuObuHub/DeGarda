import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { withHospitalAuth, validateHospitalParam } from '@/lib/hospitalMiddleware'
import { logger } from '@/lib/logger'
// Notification system removed during simplification
import { staff } from '@/lib/data'

// GET all swap requests
export async function GET(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    try {
      const { searchParams } = new URL(request.url)
      const status = searchParams.get('status') || 'pending'
      const hospitalIdParam = searchParams.get('hospitalId')
      
      // Use authenticated user's hospital if no hospitalId specified
      let targetHospitalId = authUser.hospitalId
      
      if (hospitalIdParam) {
        const validation = validateHospitalParam(authUser.hospitalId, hospitalIdParam)
        if (!validation.valid) {
          logger.warn('SwapsAPI', 'Hospital access denied', {
            userId: authUser.userId,
            userHospital: authUser.hospitalId,
            requestedHospital: hospitalIdParam,
            error: validation.error
          })
          return NextResponse.json(
            { error: validation.error },
            { status: 403 }
          )
        }
        targetHospitalId = validation.hospitalId!
      }

      // Get swap requests with staff and shift info - ONLY for authenticated user's hospital
      const swaps = await sql`
        SELECT 
          ss.id,
          ss.from_staff_id,
          ss.to_staff_id,
          ss.shift_id,
          ss.reason,
          ss.status,
          ss.created_at,
          s.date as shift_date,
          s.type as shift_type,
          s.hospital_id,
          sf.name as from_staff_name,
          st.name as to_staff_name,
          h.name as hospital_name
        FROM shift_swaps ss
        JOIN shifts s ON ss.shift_id = s.id
        JOIN staff sf ON ss.from_staff_id = sf.id
        LEFT JOIN staff st ON ss.to_staff_id = st.id
        JOIN hospitals h ON s.hospital_id = h.id
        WHERE ss.status = ${status}
          AND s.hospital_id = ${targetHospitalId}
        ORDER BY ss.created_at DESC
      `

      logger.info('SwapsAPI', 'Swaps fetched successfully', {
        userId: authUser.userId,
        hospitalId: targetHospitalId,
        status,
        count: swaps.length
      })

      return NextResponse.json({ success: true, swaps })
    } catch (error) {
      logger.error('SwapsAPI', 'Error fetching swaps', { error, userId: authUser.userId })
      return NextResponse.json(
        { success: false, error: 'Failed to fetch swap requests' },
        { status: 500 }
      )
    }
  })
}

// POST create a new swap request
export async function POST(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    try {
      const { fromStaffId, toStaffId, shiftId, reason } = await request.json()

      if (!fromStaffId || !shiftId || !reason) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        )
      }

      // Verify the fromStaffId belongs to the authenticated user's hospital
      const staffCheck = await sql`
        SELECT hospital_id FROM staff WHERE id = ${fromStaffId}
      `
      
      if (staffCheck.length === 0 || staffCheck[0].hospital_id !== authUser.hospitalId) {
        logger.warn('SwapsAPI', 'Unauthorized staff access attempt', {
          userId: authUser.userId,
          userHospital: authUser.hospitalId,
          requestedStaffId: fromStaffId
        })
        return NextResponse.json(
          { error: 'Unauthorized staff access' },
          { status: 403 }
        )
      }

      // Verify the shift belongs to the authenticated user's hospital
      const shiftCheck = await sql`
        SELECT hospital_id FROM shifts WHERE id = ${shiftId}
      `
      
      if (shiftCheck.length === 0 || shiftCheck[0].hospital_id !== authUser.hospitalId) {
        logger.warn('SwapsAPI', 'Unauthorized shift access attempt', {
          userId: authUser.userId,
          userHospital: authUser.hospitalId,
          requestedShiftId: shiftId
        })
        return NextResponse.json(
          { error: 'Unauthorized shift access' },
          { status: 403 }
        )
      }

      // Create swap request
      const result = await sql`
        INSERT INTO shift_swaps (from_staff_id, to_staff_id, shift_id, reason)
        VALUES (${fromStaffId}, ${toStaffId}, ${shiftId}, ${reason})
        RETURNING *
      `

      logger.info('SwapsAPI', 'Swap request created successfully', {
        userId: authUser.userId,
        hospitalId: authUser.hospitalId,
        swapId: result[0].id,
        fromStaffId,
        toStaffId,
        shiftId
      })

      // Get shift details for notification
      const shiftInfo = await sql`
        SELECT date FROM shifts WHERE id = ${shiftId}
      `
      
      if (toStaffId && shiftInfo.length > 0) {
        // Notify specific staff member
        const fromStaff = staff.find(s => s.id === fromStaffId)
        if (fromStaff) {
          // Notification system removed during simplification
        }
      } else {
        // Notify all managers about open swap request
        const managers = staff.filter(s => s.role === 'manager')
        const fromStaff = staff.find(s => s.id === fromStaffId)
        if (fromStaff) {
          for (const manager of managers) {
            // Notification system removed during simplification
          }
        }
      }

      return NextResponse.json({ success: true, swap: result[0] })
    } catch (error) {
      logger.error('SwapsAPI', 'Error creating swap request', { error, userId: authUser.userId })
      return NextResponse.json(
        { success: false, error: 'Failed to create swap request' },
        { status: 500 }
      )
    }
  })
}