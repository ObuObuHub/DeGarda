import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { withHospitalAuth, validateHospitalParam } from '@/lib/hospitalMiddleware'
import { logger } from '@/lib/logger'
import { 
  apiSuccess, 
  apiError, 
  apiValidationError, 
  apiForbidden, 
  apiServerError,
  withApiErrorHandling 
} from '@/lib/apiResponse'
// Notification system removed during simplification
import { staff } from '@/lib/data'

// GET all swap requests
export async function GET(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    return withApiErrorHandling(async () => {
      const { searchParams } = new URL(request.url)
      const status = searchParams.get('status') || 'pending'
      const hospitalIdParam = searchParams.get('hospitalId')
      
      // Use authenticated user's hospital if no hospitalId specified
      let targetHospitalId = authUser.hospitalId
      
      if (hospitalIdParam) {
        const validation = validateHospitalParam(authUser.hospitalId, hospitalIdParam, authUser.role)
        if (!validation.valid) {
          logger.warn('SwapsAPI', 'Hospital access denied', {
            userId: authUser.userId,
            userHospital: authUser.hospitalId,
            requestedHospital: hospitalIdParam,
            error: validation.error
          })
          return apiForbidden(validation.error)
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

      return apiSuccess({ swaps }, `Retrieved ${swaps.length} swap requests with status '${status}'`)
    }, 'swaps GET')
  })
}

// POST create a new swap request
export async function POST(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    return withApiErrorHandling(async () => {
      const { fromStaffId, toStaffId, shiftId, reason } = await request.json()

      if (!fromStaffId || !shiftId || !reason) {
        return apiValidationError('Missing required fields', {
          fromStaffId: !fromStaffId ? ['From staff ID is required'] : [],
          shiftId: !shiftId ? ['Shift ID is required'] : [],
          reason: !reason ? ['Reason is required'] : []
        })
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
        return apiForbidden('Unauthorized staff access')
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
        return apiForbidden('Unauthorized shift access')
      }

      // Create swap request
      const result = await sql`
        INSERT INTO shift_swaps (from_staff_id, to_staff_id, shift_id, reason)
        VALUES (${fromStaffId}, ${toStaffId}, ${shiftId}, ${reason})
        RETURNING *
      `

      const createdSwap = result[0]

      logger.info('SwapsAPI', 'Swap request created successfully', {
        userId: authUser.userId,
        hospitalId: authUser.hospitalId,
        swapId: createdSwap.id,
        fromStaffId,
        toStaffId,
        shiftId
      })

      // Get shift details for notification context
      const shiftInfo = await sql`
        SELECT date FROM shifts WHERE id = ${shiftId}
      `
      
      const shiftDate = shiftInfo.length > 0 ? shiftInfo[0].date : 'unknown'
      const targetDescription = toStaffId ? 'specific staff member' : 'any available staff'
      
      return apiSuccess(
        { swap: createdSwap }, 
        `Swap request created successfully for shift on ${shiftDate} (targeting ${targetDescription})`,
        { shiftDate, targetType: toStaffId ? 'specific' : 'open' }
      )
    }, 'swaps POST')
  })
}